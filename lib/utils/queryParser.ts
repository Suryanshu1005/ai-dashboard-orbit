/**
 * Simple query parser for natural language to SQL/MongoDB conversion
 * This is a placeholder that can be replaced with Claude API later
 */

import type { DatabaseType } from '@/lib/db/types';

export interface QueryParseResult {
  query: string; // SQL for SQL databases, JSON string for MongoDB pipeline
  queryType: 'sql' | 'mongodb';
  isValid: boolean;
  error?: string;
}

/**
 * Simple pattern-based query parser
 * Supports basic queries like:
 * - "show me all users"
 * - "get users where age > 25"
 * - "select name, email from users"
 * - "users older than 30"
 */
export function parseNaturalLanguageQuery(
  tableName: string,
  naturalLanguageQuery: string,
  columns: string[],
  dbType: DatabaseType = 'postgresql'
): QueryParseResult {
  if (dbType === 'mongodb') {
    return parseMongoDBQuery(tableName, naturalLanguageQuery, columns);
  } else {
    return parseSQLQuery(tableName, naturalLanguageQuery, columns);
  }
}

/**
 * Parse natural language to SQL query
 */
function parseSQLQuery(
  tableName: string,
  naturalLanguageQuery: string,
  columns: string[]
): QueryParseResult {
  const query = naturalLanguageQuery.toLowerCase().trim();

  try {
    // If it already looks like SQL, return it
    if (query.startsWith('select') || query.startsWith('SELECT')) {
      return {
        query: naturalLanguageQuery,
        queryType: 'sql',
        isValid: true,
      };
    }

    // Pattern 1: "show me all [table]" or "get all [table]"
    if (query.match(/^(show me|get|list|display)\s+(all\s+)?/i)) {
      return {
        query: `SELECT * FROM ${tableName}`,
        queryType: 'sql',
        isValid: true,
      };
    }

    // Pattern 2: "get [table] where [condition]"
    const whereMatch = query.match(/where\s+(.+)/i);
    if (whereMatch) {
      const condition = parseSQLCondition(whereMatch[1], columns);
      return {
        query: `SELECT * FROM ${tableName} WHERE ${condition}`,
        queryType: 'sql',
        isValid: true,
      };
    }

    // Pattern 3: "[table] [condition]" (e.g., "users older than 25")
    const conditionPatterns = [
      { pattern: /older than (\d+)/i, column: findColumnByKeyword(columns, ['age', 'years']), operator: '>' },
      { pattern: /younger than (\d+)/i, column: findColumnByKeyword(columns, ['age', 'years']), operator: '<' },
      { pattern: /greater than (\d+)/i, column: findNumericColumn(columns), operator: '>' },
      { pattern: /less than (\d+)/i, column: findNumericColumn(columns), operator: '<' },
      { pattern: /equals? (\w+)/i, column: findColumnByKeyword(columns, ['name', 'id', 'email']), operator: '=' },
    ];

    for (const { pattern, column, operator } of conditionPatterns) {
      const match = query.match(pattern);
      if (match && column) {
        const value = match[1];
        return {
          query: `SELECT * FROM ${tableName} WHERE ${column} ${operator} ${isNaN(Number(value)) ? `'${value}'` : value}`,
          queryType: 'sql',
          isValid: true,
        };
      }
    }

    // Pattern 4: "select [columns] from [table]"
    const selectMatch = query.match(/select\s+(.+?)\s+from/i);
    if (selectMatch) {
      const columnList = selectMatch[1]
        .split(',')
        .map((col) => col.trim())
        .filter((col) => columns.includes(col) || col === '*')
        .join(', ');
      
      if (columnList) {
        return {
          query: `SELECT ${columnList} FROM ${tableName}`,
          queryType: 'sql',
          isValid: true,
        };
      }
    }

    // Default: simple SELECT all
    return {
      query: `SELECT * FROM ${tableName}`,
      queryType: 'sql',
      isValid: true,
    };
  } catch (error: any) {
    return {
      query: '',
      queryType: 'sql',
      isValid: false,
      error: error.message || 'Failed to parse query',
    };
  }
}

/**
 * Parse natural language to MongoDB aggregation pipeline
 */
function parseMongoDBQuery(
  collectionName: string,
  naturalLanguageQuery: string,
  columns: string[]
): QueryParseResult {
  const query = naturalLanguageQuery.toLowerCase().trim();

  try {
    // Pattern 1: "show me all [collection]" or "get all [collection]"
    if (query.match(/^(show me|get|list|display)\s+(all\s+)?/i)) {
      const pipeline = [{ $match: {} }, { $limit: 1000 }];
      return {
        query: JSON.stringify(pipeline),
        queryType: 'mongodb',
        isValid: true,
      };
    }

    // Pattern 2: "get [collection] where [condition]"
    const whereMatch = query.match(/where\s+(.+)/i);
    if (whereMatch) {
      const filter = parseMongoDBCondition(whereMatch[1], columns);
      const pipeline = [{ $match: filter }, { $limit: 1000 }];
      return {
        query: JSON.stringify(pipeline),
        queryType: 'mongodb',
        isValid: true,
      };
    }

    // Pattern 3: "[collection] [condition]" (e.g., "users older than 25")
    const conditionPatterns = [
      { pattern: /older than (\d+)/i, column: findColumnByKeyword(columns, ['age', 'years']), operator: '$gt' },
      { pattern: /younger than (\d+)/i, column: findColumnByKeyword(columns, ['age', 'years']), operator: '$lt' },
      { pattern: /greater than (\d+)/i, column: findNumericColumn(columns), operator: '$gt' },
      { pattern: /less than (\d+)/i, column: findNumericColumn(columns), operator: '$lt' },
      { pattern: /equals? (\w+)/i, column: findColumnByKeyword(columns, ['name', 'id', 'email']), operator: '$eq' },
    ];

    for (const { pattern, column, operator } of conditionPatterns) {
      const match = query.match(pattern);
      if (match && column) {
        const value = match[1];
        const numValue = isNaN(Number(value)) ? value : Number(value);
        const filter: any = {};
        if (operator === '$eq') {
          filter[column] = numValue;
        } else {
          filter[column] = { [operator]: numValue };
        }
        const pipeline = [{ $match: filter }, { $limit: 1000 }];
        return {
          query: JSON.stringify(pipeline),
          queryType: 'mongodb',
          isValid: true,
        };
      }
    }

    // Pattern 4: "select [fields] from [collection]" - project specific fields
    const selectMatch = query.match(/select\s+(.+?)(?:\s+from|\s*$)/i);
    if (selectMatch) {
      const fieldList = selectMatch[1]
        .split(',')
        .map((field) => field.trim())
        .filter((field) => columns.includes(field) || field === '*');
      
      const pipeline: any[] = [{ $match: {} }];
      
      if (fieldList.length > 0 && fieldList[0] !== '*') {
        const project: any = { _id: 0 };
        fieldList.forEach((field) => {
          project[field] = 1;
        });
        pipeline.push({ $project: project });
      }
      
      pipeline.push({ $limit: 1000 });
      
      return {
        query: JSON.stringify(pipeline),
        queryType: 'mongodb',
        isValid: true,
      };
    }

    // Default: simple find all
    const pipeline = [{ $match: {} }, { $limit: 1000 }];
    return {
      query: JSON.stringify(pipeline),
      queryType: 'mongodb',
      isValid: true,
    };
  } catch (error: any) {
    return {
      query: '',
      queryType: 'mongodb',
      isValid: false,
      error: error.message || 'Failed to parse query',
    };
  }
}

/**
 * Parse MongoDB condition from natural language
 */
function parseMongoDBCondition(condition: string, columns: string[]): any {
  const filter: any = {};

  // Handle: column = value
  const eqMatch = condition.match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/i);
  if (eqMatch) {
    const column = eqMatch[1];
    let value: any = eqMatch[2];
    if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }
    filter[column] = value;
    return filter;
  }

  // Handle: column > value
  const gtMatch = condition.match(/(\w+)\s*>\s*(\d+\.?\d*)/i);
  if (gtMatch) {
    filter[gtMatch[1]] = { $gt: Number(gtMatch[2]) };
    return filter;
  }

  // Handle: column < value
  const ltMatch = condition.match(/(\w+)\s*<\s*(\d+\.?\d*)/i);
  if (ltMatch) {
    filter[ltMatch[1]] = { $lt: Number(ltMatch[2]) };
    return filter;
  }

  // Handle: column >= value
  const gteMatch = condition.match(/(\w+)\s*>=\s*(\d+\.?\d*)/i);
  if (gteMatch) {
    filter[gteMatch[1]] = { $gte: Number(gteMatch[2]) };
    return filter;
  }

  // Handle: column <= value
  const lteMatch = condition.match(/(\w+)\s*<=\s*(\d+\.?\d*)/i);
  if (lteMatch) {
    filter[lteMatch[1]] = { $lte: Number(lteMatch[2]) };
    return filter;
  }

  return filter;
}

function parseSQLCondition(condition: string, columns: string[]): string {
  // Simple condition parsing
  // "age > 25" -> "age > 25"
  // "name = 'John'" -> "name = 'John'"
  
  // Check if it's already a valid SQL condition
  if (condition.match(/^\w+\s*[<>=!]+\s*.+$/)) {
    return condition;
  }

  // Try to parse natural language conditions
  const patterns = [
    { pattern: /(\w+)\s+is\s+(\w+)/i, sql: '$1 = $2' },
    { pattern: /(\w+)\s+equals?\s+(\w+)/i, sql: '$1 = $2' },
  ];

  for (const { pattern, sql } of patterns) {
    const match = condition.match(pattern);
    if (match && columns.includes(match[1])) {
      return sql.replace('$1', match[1]).replace('$2', `'${match[2]}'`);
    }
  }

  return condition;
}

function findColumnByKeyword(columns: string[], keywords: string[]): string | null {
  for (const col of columns) {
    for (const keyword of keywords) {
      if (col.toLowerCase().includes(keyword.toLowerCase())) {
        return col;
      }
    }
  }
  return columns[0] || null;
}

function findNumericColumn(columns: string[]): string | null {
  const numericKeywords = ['id', 'count', 'number', 'amount', 'price', 'quantity'];
  return findColumnByKeyword(columns, numericKeywords) || columns[0] || null;
}

/**
 * Future: Replace this function with Claude API call
 */
export async function parseWithClaude(
  tableName: string,
  schema: string,
  naturalLanguageQuery: string,
  dbType: DatabaseType = 'postgresql'
): Promise<QueryParseResult> {
  // This will be implemented when Claude API key is available
  // For now, fall back to simple parser
  const columns = schema.split(',').map((col) => col.trim().split(' ')[0]);
  return parseNaturalLanguageQuery(tableName, naturalLanguageQuery, columns, dbType);
}

