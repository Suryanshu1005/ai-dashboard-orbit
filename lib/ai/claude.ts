/**
 * Google Gemini API integration
 * This file uses Google Gemini for query generation
 */

import type { DatabaseType } from '@/lib/db/types';

// Dynamic import for Google Gemini SDK
let GoogleGenerativeAI: any = null;
let geminiModel: any = null;

// Get Gemini client instance (without specific model)
async function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const GeminiModule = await import('@google/generative-ai');
    GoogleGenerativeAI = GeminiModule.GoogleGenerativeAI;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
  } catch (error: any) {
    console.warn('Failed to initialize Gemini client:', error.message);
    return null;
  }
}

// Initialize Gemini client - lazy load to handle missing SDK gracefully
async function initializeGemini() {
  if (geminiModel) {
    return geminiModel; // Already initialized
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Use dynamic import for better Next.js compatibility
    const GeminiModule = await import('@google/generative-ai');
    GoogleGenerativeAI = GeminiModule.GoogleGenerativeAI;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-pro - this is the standard model name
    // Note: Model validation happens when we actually call generateContent
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('Gemini API client initialized (model: gemini-2.0-flash)');
    return geminiModel;
  } catch (error: any) {
    console.warn('Failed to initialize Gemini API:', error.message);
    return null;
  }
}

/**
 * List all available Gemini models for the current API key
 */
export async function listAvailableModels(): Promise<string[]> {
  const genAI = await getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Use the REST API to list models
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];

    console.log('Available Gemini models:', models);
    
    // Filter models that support generateContent
    const availableModels = models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      )
      .map((model: any) => model.name.replace('models/', ''))
      .sort();
    
    console.log('Available Gemini models:', availableModels);
    return availableModels;
  } catch (error: any) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
}

export interface ClaudeQueryResult {
  query: string; // SQL for SQL databases, JSON string for MongoDB pipeline
  queryType: 'sql' | 'mongodb';
  error?: string;
}

/**
 * Generate query from natural language using Gemini API
 * Automatically generates SQL for SQL databases or MongoDB aggregation pipeline for MongoDB
 */
export async function generateQueryWithClaude(
  tableName: string,
  schema: string,
  naturalLanguageQuery: string,
  dbType: DatabaseType
): Promise<ClaudeQueryResult> {
  // Initialize Gemini if not already done
  const model = await initializeGemini();
  
  // Check if Gemini is available
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Add GEMINI_API_KEY to .env.local');
    } else {
      throw new Error('Failed to initialize Gemini API. Check if @google/generative-ai is installed.');
    }
  }

  try {
    if (dbType === 'mongodb') {
      return await generateMongoDBPipelineWithGemini(tableName, schema, naturalLanguageQuery, model);
    } else {
      return await generateSQLWithGemini(tableName, schema, naturalLanguageQuery, dbType, model);
    }
  } catch (error: any) {
    // Provide more detailed error information
    const errorMsg = error.message || 'Unknown error';
    if (errorMsg.includes('404') || errorMsg.includes('not found')) {
      throw new Error(`Gemini model not found. Please check your API key has access to gemini-pro model. Error: ${errorMsg}`);
    }
    throw new Error(`Gemini API error: ${errorMsg}`);
  }
}

/**
 * Generate SQL query using Gemini API
 */
async function generateSQLWithGemini(
  tableName: string,
  schema: string,
  naturalLanguageQuery: string,
  dbType: DatabaseType,
  model: any
): Promise<ClaudeQueryResult> {
  const dbTypeName = dbType === 'postgresql' ? 'PostgreSQL' : 
                     dbType === 'mysql' ? 'MySQL' : 
                     dbType === 'mssql' ? 'SQL Server' : 'SQL';

  const prompt = `You are a ${dbTypeName} SQL expert. Given a table schema and a natural language query, generate the appropriate SQL query.

Table Name: ${tableName}
Schema: ${schema}

User Query: "${naturalLanguageQuery}"

Requirements:
- Generate ONLY the SQL query, no explanations or markdown
- Use proper ${dbTypeName} syntax
- Use the exact table and column names from the schema
- Return only the SQL statement

SQL Query:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sql = response.text().trim();
    
    // Remove markdown code blocks if present
    const cleanSQL = sql.replace(/^```sql\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/i, '').trim();

    return {
      query: cleanSQL,
      queryType: 'sql',
    };
  } catch (error: any) {
    // If model not found, provide helpful error message
    const errorMsg = error.message || '';
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('is not found')) {
      throw new Error(
        `Gemini model not available. Possible issues:\n` +
        `1. Your API key might not have access to 'gemini-pro' model\n` +
        `2. The model name might be incorrect for your API key\n` +
        `3. Check your API key at https://makersuite.google.com/app/apikey\n` +
        `Original error: ${errorMsg}`
      );
    }
    throw new Error(`Gemini API error: ${errorMsg}`);
  }
}

/**
 * Fix common date expression errors in MongoDB pipelines
 * Converts invalid date syntax to correct $expr format
 */
function fixMongoDBDateExpressions(pipeline: any[]): any[] {
  return pipeline.map((stage) => {
    if (stage.$match) {
      stage.$match = fixDateInMatch(stage.$match);
    }
    return stage;
  });
}

/**
 * Recursively fix date expressions in $match stage
 */
function fixDateInMatch(match: any): any {
  if (!match || typeof match !== 'object' || Array.isArray(match)) {
    return match;
  }

  const fixed: any = {};

  for (const [key, value] of Object.entries(match)) {
    if (key === '$expr') {
      fixed[key] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const val = value as any;
      
      // Check for invalid date syntax like {"$date": {"$subtract": [{"$date": "$$NOW"}, 86400000]}}
      if (val.$date) {
        // This is invalid - convert to $expr format
        const dateExpr = val.$date;
        if (dateExpr && typeof dateExpr === 'object' && dateExpr.$subtract && Array.isArray(dateExpr.$subtract)) {
          // Convert to proper $expr format
          fixed.$expr = {
            $gte: [
              `$${key}`,
              { $subtract: dateExpr.$subtract }
            ]
          };
          continue;
        }
      }

      // Check for $gte/$lte/$gt/$lt with invalid date syntax
      if (val.$gte || val.$lte || val.$gt || val.$lt) {
        let operator: '$gte' | '$lte' | '$gt' | '$lt' = '$gte';
        if (val.$gte) operator = '$gte';
        else if (val.$lte) operator = '$lte';
        else if (val.$gt) operator = '$gt';
        else if (val.$lt) operator = '$lt';
        
        const dateValue = val[operator];
        
        if (dateValue && typeof dateValue === 'object' && !Array.isArray(dateValue)) {
          const dateVal = dateValue as any;
          if (dateVal.$date) {
            // Invalid date syntax - convert to $expr
            const dateExpr = dateVal.$date;
            if (dateExpr && typeof dateExpr === 'object' && dateExpr.$subtract && Array.isArray(dateExpr.$subtract)) {
              fixed.$expr = {
                [operator]: [
                  `$${key}`,
                  { $subtract: dateExpr.$subtract }
                ]
              };
              continue;
            }
          }
        }
      }

      // Recursively fix nested objects
      fixed[key] = fixDateInMatch(value);
    } else {
      fixed[key] = value;
    }
  }

  return fixed;
}

/**
 * Generate MongoDB aggregation pipeline using Gemini API
 */
async function generateMongoDBPipelineWithGemini(
  collectionName: string,
  schema: string,
  naturalLanguageQuery: string,
  model: any
): Promise<ClaudeQueryResult> {
  const prompt = `You are a MongoDB expert. Given a collection schema and a natural language query, generate a MongoDB aggregation pipeline.

Collection Name: ${collectionName}
Schema (sample fields): ${schema}

User Query: "${naturalLanguageQuery}"

Requirements:
- Generate ONLY a valid MongoDB aggregation pipeline as a JSON array
- Use proper MongoDB aggregation operators ($match, $project, $group, $sort, $limit, etc.)
- Return ONLY the JSON array, no explanations or markdown
- The pipeline should be an array of stage objects
- Include $limit stage with reasonable limit (e.g., 1000) if not specified
- Use the exact field names from the schema

IMPORTANT - Date/Time Handling:
- For "last 24 hours", "yesterday", "today" etc., use $expr with $$NOW and $subtract
- Example for last 24 hours: {"$match": {"$expr": {"$gte": ["$created_at", {"$subtract": ["$$NOW", 86400000]}]}}}
- For date comparisons, use ISO date strings like "2024-01-01T00:00:00Z" or $expr with date arithmetic
- NEVER use nested $date objects or invalid date syntax
- For relative dates, always use $expr with $$NOW

Examples:
- Last 24 hours: [{"$match": {"$expr": {"$gte": ["$created_at", {"$subtract": ["$$NOW", 86400000]}]}}}, {"$limit": 1000}]
- Age > 25: [{"$match": {"age": {"$gt": 25}}}, {"$limit": 1000}]
- Simple match: [{"$match": {"status": "active"}}, {"$limit": 1000}]

MongoDB Aggregation Pipeline:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let pipelineStr = response.text().trim();
  
    // Remove markdown code blocks if present
    pipelineStr = pipelineStr.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/i, '').trim();
  
    // Validate it's valid JSON
    try {
      let pipeline = JSON.parse(pipelineStr);
      if (!Array.isArray(pipeline)) {
        throw new Error('Pipeline must be an array');
      }
      
      // Fix common date-related errors in the pipeline
      pipeline = fixMongoDBDateExpressions(pipeline);
      
      // Ensure there's a limit stage
      const hasLimit = pipeline.some((stage: any) => stage.$limit);
      if (!hasLimit) {
        pipeline.push({ $limit: 1000 });
      }
      
      return {
        query: JSON.stringify(pipeline),
        queryType: 'mongodb',
      };
    } catch (parseError: any) {
      throw new Error(`Invalid MongoDB pipeline format: ${parseError.message}`);
    }
  } catch (error: any) {
    // If model not found, provide helpful error message
    const errorMsg = error.message || '';
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('is not found')) {
      throw new Error(
        `Gemini model not available. Possible issues:\n` +
        `1. Your API key might not have access to 'gemini-pro' model\n` +
        `2. The model name might be incorrect for your API key\n` +
        `3. Check your API key at https://makersuite.google.com/app/apikey\n` +
        `Original error: ${errorMsg}`
      );
    }
    throw new Error(`Gemini API error: ${errorMsg}`);
  }
}

