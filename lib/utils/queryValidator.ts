/**
 * Query validation middleware for SQL and MongoDB queries
 * Ensures queries are safe and read-only
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: 'UNSAFE_QUERY' | 'MISSING_LIMIT' | 'INVALID_SYNTAX' | 'TIMEOUT';
  details?: any;
}

// Dangerous SQL keywords that should be blocked
const DANGEROUS_SQL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'PROCEDURE', 'FUNCTION',
  'MERGE', 'REPLACE', 'LOAD', 'COPY', 'IMPORT', 'EXPORT'
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)/i,
  /UNION\s+SELECT/i,
  /--/g,  // SQL comments
  /\/\*/g, // Block comments start
];

// Dangerous MongoDB operators
const DANGEROUS_MONGO_OPERATORS = [
  '$out', '$merge', '$indexStats', '$currentOp', '$eval', '$where'
];

// MongoDB write operations
const MONGO_WRITE_OPERATIONS = ['$out', '$merge'];

/**
 * Validate SQL query for safety
 */
export function validateSQLQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return {
      isValid: false,
      error: 'Query must be a non-empty string',
      code: 'INVALID_SYNTAX',
    };
  }

  const queryUpper = query.trim().toUpperCase();

  // Must start with SELECT
  if (!queryUpper.startsWith('SELECT')) {
    return {
      isValid: false,
      error: 'Only SELECT queries are allowed',
      code: 'UNSAFE_QUERY',
    };
  }

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_SQL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(query)) {
      return {
        isValid: false,
        error: `Dangerous keyword detected: ${keyword}. Only SELECT queries are allowed.`,
        code: 'UNSAFE_QUERY',
        details: { keyword },
      };
    }
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        isValid: false,
        error: 'Potentially unsafe query pattern detected',
        code: 'UNSAFE_QUERY',
        details: { pattern: pattern.toString() },
      };
    }
  }

  // Check for multiple statements (semicolon followed by non-comment)
  const statements = query.split(';').filter(s => s.trim().length > 0);
  if (statements.length > 1) {
    // Check if second statement is not just whitespace or comments
    const secondStatement = statements[1].trim().toUpperCase();
    if (secondStatement && !secondStatement.startsWith('--')) {
      return {
        isValid: false,
        error: 'Multiple statements are not allowed',
        code: 'UNSAFE_QUERY',
      };
    }
  }

  // Check for LIMIT clause
  const hasLimit = /\bLIMIT\s+\d+/i.test(query);
  if (!hasLimit) {
    // Query is valid but missing LIMIT - we'll add it automatically
    return {
      isValid: true,
      error: 'LIMIT clause missing - will be added automatically',
      code: 'MISSING_LIMIT',
    };
  } else {
    // Check if LIMIT is reasonable (max 1000)
    const limitMatch = query.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limitValue = parseInt(limitMatch[1], 10);
      if (limitValue > 1000) {
        return {
          isValid: false,
          error: 'LIMIT cannot exceed 1000 rows',
          code: 'MISSING_LIMIT',
          details: { limit: limitValue, maxAllowed: 1000 },
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Add or enforce LIMIT clause in SQL query
 */
export function enforceSQLLimit(query: string, maxLimit: number = 1000): string {
  const queryUpper = query.trim().toUpperCase();
  
  // Check if LIMIT already exists
  const limitMatch = query.match(/\bLIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limitValue = parseInt(limitMatch[1], 10);
    if (limitValue <= maxLimit) {
      return query; // Already has valid LIMIT
    }
    // Replace with max limit
    return query.replace(/\bLIMIT\s+\d+/i, `LIMIT ${maxLimit}`);
  }

  // Add LIMIT if missing
  // Remove trailing semicolon if present
  const cleanedQuery = query.trim().replace(/;?\s*$/, '');
  return `${cleanedQuery} LIMIT ${maxLimit}`;
}

/**
 * Validate MongoDB aggregation pipeline
 */
export function validateMongoDBPipeline(pipeline: any[]): ValidationResult {
  if (!Array.isArray(pipeline)) {
    return {
      isValid: false,
      error: 'Pipeline must be an array',
      code: 'INVALID_SYNTAX',
    };
  }

  if (pipeline.length === 0) {
    return {
      isValid: false,
      error: 'Pipeline cannot be empty',
      code: 'INVALID_SYNTAX',
    };
  }

  // Check each stage
  for (let i = 0; i < pipeline.length; i++) {
    const stage = pipeline[i];
    
    if (typeof stage !== 'object' || stage === null || Array.isArray(stage)) {
      return {
        isValid: false,
        error: `Pipeline stage ${i} must be an object`,
        code: 'INVALID_SYNTAX',
        details: { stageIndex: i },
      };
    }

    const stageKeys = Object.keys(stage);
    if (stageKeys.length === 0) {
      return {
        isValid: false,
        error: `Pipeline stage ${i} cannot be empty`,
        code: 'INVALID_SYNTAX',
        details: { stageIndex: i },
      };
    }

    // Check for dangerous operators
    for (const operator of DANGEROUS_MONGO_OPERATORS) {
      if (stageKeys.includes(operator)) {
        return {
          isValid: false,
          error: `Dangerous operator detected: ${operator}. Write operations are not allowed.`,
          code: 'UNSAFE_QUERY',
          details: { operator, stageIndex: i },
        };
      }
    }

    // Check for $where with user input (potential injection)
    if (stage.$match && stage.$match.$where) {
      return {
        isValid: false,
        error: '$where operator in $match is not allowed for security reasons',
        code: 'UNSAFE_QUERY',
        details: { stageIndex: i },
      };
    }
  }

  // Check for $limit stage
  const hasLimit = pipeline.some(stage => stage.$limit !== undefined);
  if (!hasLimit) {
    return {
      isValid: true,
      error: '$limit stage missing - will be added automatically',
      code: 'MISSING_LIMIT',
    };
  } else {
    // Check if $limit is reasonable
    const limitStage = pipeline.find(stage => stage.$limit !== undefined);
    if (limitStage && limitStage.$limit > 1000) {
      return {
        isValid: false,
        error: '$limit cannot exceed 1000',
        code: 'MISSING_LIMIT',
        details: { limit: limitStage.$limit, maxAllowed: 1000 },
      };
    }
  }

  return { isValid: true };
}

/**
 * Add or enforce $limit stage in MongoDB pipeline
 */
export function enforceMongoDBLimit(pipeline: any[], maxLimit: number = 1000): any[] {
  // Check if $limit already exists
  const limitIndex = pipeline.findIndex(stage => stage.$limit !== undefined);
  
  if (limitIndex !== -1) {
    const limitValue = pipeline[limitIndex].$limit;
    if (limitValue <= maxLimit) {
      return pipeline; // Already has valid limit
    }
    // Update existing limit
    const newPipeline = [...pipeline];
    newPipeline[limitIndex] = { $limit: maxLimit };
    return newPipeline;
  }

  // Add $limit stage at the end
  return [...pipeline, { $limit: maxLimit }];
}

/**
 * Parse and validate query string (could be SQL or JSON pipeline)
 */
export function validateQuery(query: string, queryType: 'sql' | 'mongodb'): ValidationResult {
  if (queryType === 'sql') {
    return validateSQLQuery(query);
  } else if (queryType === 'mongodb') {
    try {
      const pipeline = JSON.parse(query);
      return validateMongoDBPipeline(pipeline);
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid JSON format for MongoDB pipeline',
        code: 'INVALID_SYNTAX',
        details: { error: (error as Error).message },
      };
    }
  }

  return {
    isValid: false,
    error: `Unknown query type: ${queryType}`,
    code: 'INVALID_SYNTAX',
  };
}

