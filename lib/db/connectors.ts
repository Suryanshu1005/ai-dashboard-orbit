import pg from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import sql from 'mssql';
import type { DatabaseType, Table, Column } from './types';

// Global connection store - using Node.js global to persist across module reloads
// This ensures the connection persists even when Next.js reloads modules in dev mode

console.log('Anthropic API Key:', process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY);

declare global {
  var __dbConnectionStore: {
    connection: any;
    dbType: DatabaseType | null;
    connectionString: string | null;
  } | undefined;
}

export function getConnectionStore() {
  if (!global.__dbConnectionStore) {
    global.__dbConnectionStore = {
      connection: null,
      dbType: null,
      connectionString: null,
    };
  }
  return global.__dbConnectionStore;
}

// Helper to ensure connection is active
async function ensureConnection(): Promise<void> {
  const store = getConnectionStore();
  if (!store.connection || !store.dbType || !store.connectionString) {
    console.error('Connection check failed:', {
      hasConnection: !!store.connection,
      dbType: store.dbType,
      hasConnectionString: !!store.connectionString
    });
    throw new Error('No database connection established');
  }

  // For MongoDB, check if connection is still alive
  if (store.dbType === 'mongodb') {
    try {
      await (store.connection as MongoClient).db().admin().ping();
    } catch (error) {
      // Connection lost, try to reconnect
      if (store.connectionString && store.dbType) {
        const connString = store.connectionString;
        const dbType = store.dbType;
        // Close old connection
        try {
          await (store.connection as MongoClient).close();
        } catch (e) {
          // Ignore close errors
        }
        // Reconnect
        const mongoClient = new MongoClient(connString);
        await mongoClient.connect();
        store.connection = mongoClient;
      } else {
        throw new Error('Connection lost and cannot reconnect');
      }
    }
  }
}

export async function testConnection(
  connString: string,
  dbType: DatabaseType
): Promise<boolean> {
  try {
    // Close existing connection if any
    await closeConnection();

    const store = getConnectionStore();
    store.connectionString = connString;
    store.dbType = dbType;

    switch (dbType) {
      case 'postgresql':
        const pgClient = new pg.Client({ connectionString: connString });
        await pgClient.connect();
        store.connection = pgClient;
        break;

      case 'mysql':
        const mysqlConn = await mysql.createConnection(connString);
        store.connection = mysqlConn;
        break;

      case 'mongodb':
        const mongoClient = new MongoClient(connString);
        await mongoClient.connect();
        store.connection = mongoClient;
        break;

      case 'mssql':
        const sqlConn = await sql.connect(connString);
        store.connection = sqlConn;
        break;

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    console.log('Connection established and stored:', dbType);
    return true;
  } catch (error: any) {
    console.error('Connection error:', error);
    // Clear store on error
    const store = getConnectionStore();
    store.connection = null;
    store.dbType = null as any;
    store.connectionString = null as any;
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  try {
    const store = getConnectionStore();
    if (!store.connection) return;

    switch (store.dbType) {
      case 'postgresql':
        await (store.connection as pg.Client).end();
        break;
      case 'mysql':
        await (store.connection as mysql.Connection).end();
        break;
      case 'mongodb':
        await (store.connection as MongoClient).close();
        break;
      case 'mssql':
        await (store.connection as sql.ConnectionPool).close();
        break;
    }

    store.connection = null;
    store.dbType = null as any;
    store.connectionString = null as any;
  } catch (error) {
    console.error('Error closing connection:', error);
  }
}

export async function getTables(): Promise<Table[]> {
  const store = getConnectionStore();
  
  // Check if connection exists
  if (!store.connection || !store.dbType || !store.connectionString) {
    console.error('Connection store state:', {
      hasConnection: !!store.connection,
      dbType: store.dbType,
      hasConnectionString: !!store.connectionString
    });
    throw new Error('No database connection established');
  }

  await ensureConnection();

  try {
    switch (store.dbType) {
      case 'postgresql':
        const pgResult = await (store.connection as pg.Client).query(
          "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        );
        return pgResult.rows.map((row: any) => ({
          name: row.name,
          type: 'table',
        }));

      case 'mysql':
        const mysqlResult = await (store.connection as mysql.Connection).query(
          'SHOW TABLES'
        );
        const tables = mysqlResult[0] as any[];
        const tableNameKey = Object.keys(tables[0] || {})[0] || 'Tables_in_database';
        return tables.map((row: any) => ({
          name: row[tableNameKey],
          type: 'table',
        }));

      case 'mongodb':
        const db = (store.connection as MongoClient).db();
        const collections = await db.listCollections().toArray();
        return collections.map((col) => ({
          name: col.name,
          type: 'collection',
        }));

      case 'mssql':
        const mssqlResult = await (store.connection as sql.ConnectionPool)
          .request()
          .query("SELECT name FROM sys.tables WHERE type = 'U'");
        return mssqlResult.recordset.map((row: any) => ({
          name: row.name,
          type: 'table',
        }));

      default:
        throw new Error(`Unsupported database type: ${store.dbType}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }
}

export async function getTableSchema(tableName: string): Promise<Column[]> {
  const store = getConnectionStore();
  
  if (!store.connection || !store.dbType) {
    throw new Error('No database connection established');
  }

  await ensureConnection();

  try {
    switch (store.dbType) {
      case 'postgresql':
        const pgResult = await (store.connection as pg.Client).query(
          `SELECT column_name as name, data_type as type, is_nullable
           FROM information_schema.columns
           WHERE table_name = $1 AND table_schema = 'public'
           ORDER BY ordinal_position`,
          [tableName]
        );
        return pgResult.rows.map((row: any) => ({
          name: row.name,
          type: row.type,
          nullable: row.is_nullable === 'YES',
        }));

      case 'mysql':
        const mysqlResult = await (store.connection as mysql.Connection).query(
          `DESCRIBE ${tableName}`
        );
        const mysqlRows = mysqlResult[0] as any[];
        return mysqlRows.map((row: any) => ({
          name: row.Field,
          type: row.Type,
          nullable: row.Null === 'YES',
        }));

      case 'mongodb':
        const db = (store.connection as MongoClient).db();
        const collection = db.collection(tableName);
        const sampleDoc = await collection.findOne({});
        if (!sampleDoc) {
          return [];
        }
        return Object.keys(sampleDoc).map((key) => ({
          name: key,
          type: typeof sampleDoc[key],
          nullable: true,
        }));

      case 'mssql':
        const mssqlResult = await (store.connection as sql.ConnectionPool)
          .request()
          .input('tableName', sql.VarChar, tableName)
          .query(`
            SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);
        return mssqlResult.recordset.map((row: any) => ({
          name: row.name,
          type: row.type,
          nullable: row.is_nullable === 'YES',
        }));

      default:
        throw new Error(`Unsupported database type: ${store.dbType}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch table schema: ${error.message}`);
  }
}

export async function executeQuery(
  query: string, 
  queryType: 'sql' | 'mongodb' = 'sql', 
  collectionName?: string,
  timeoutMs?: number
): Promise<any[]> {
  const store = getConnectionStore();
  
  if (!store.connection || !store.dbType) {
    throw new Error('No database connection established');
  }

  await ensureConnection();

  // Import validation and timeout utilities
  const { validateQuery, enforceSQLLimit, enforceMongoDBLimit } = await import('@/lib/utils/queryValidator');
  const { executeWithTimeout, getQueryTimeout } = await import('@/lib/utils/queryTimeout');

  // Validate query
  const validation = validateQuery(query, queryType);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Query validation failed');
  }

  // Enforce LIMIT if missing
  let finalQuery = query;
  if (queryType === 'sql') {
    if (validation.code === 'MISSING_LIMIT') {
      finalQuery = enforceSQLLimit(query);
    }
  } else if (queryType === 'mongodb') {
    if (validation.code === 'MISSING_LIMIT') {
      const pipeline = JSON.parse(query);
      const enforcedPipeline = enforceMongoDBLimit(pipeline);
      finalQuery = JSON.stringify(enforcedPipeline);
    }
  }

  // Get timeout (use provided or default)
  const queryTimeout = timeoutMs || getQueryTimeout(undefined, 30000);

  try {
    // Wrap query execution with timeout
    const executeQueryPromise = (async () => {
      switch (store.dbType) {
        case 'postgresql':
          if (queryType !== 'sql') {
            throw new Error('PostgreSQL only supports SQL queries');
          }
          const pgResult = await (store.connection as pg.Client).query(finalQuery);
          return pgResult.rows;

        case 'mysql':
          if (queryType !== 'sql') {
            throw new Error('MySQL only supports SQL queries');
          }
          const mysqlResult = await (store.connection as mysql.Connection).query(finalQuery);
          return mysqlResult[0] as any[];

        case 'mongodb':
          if (queryType === 'mongodb') {
            // Execute MongoDB aggregation pipeline
            if (!collectionName) {
              throw new Error('Collection name is required for MongoDB pipeline execution');
            }
            const db = (store.connection as MongoClient).db();
            const collection = db.collection(collectionName);
            const pipeline = JSON.parse(finalQuery);
            const mongoResult = await collection.aggregate(pipeline).toArray();
            return mongoResult;
          } else {
            // Legacy: Convert SQL to MongoDB (for backward compatibility)
            const db = (store.connection as MongoClient).db();
            const mongoQuery = convertSQLToMongoDB(finalQuery);
            const collection = db.collection(mongoQuery.collection);
            const mongoResult = await collection.find(mongoQuery.filter).limit(mongoQuery.limit || 1000).toArray();
            return mongoResult;
          }

        case 'mssql':
          if (queryType !== 'sql') {
            throw new Error('SQL Server only supports SQL queries');
          }
          const mssqlResult = await (store.connection as sql.ConnectionPool)
            .request()
            .query(finalQuery);
          return mssqlResult.recordset;

        default:
          throw new Error(`Unsupported database type: ${store.dbType}`);
      }
    })();

    // Execute with timeout
    return await executeWithTimeout(executeQueryPromise, queryTimeout);
  } catch (error: any) {
    // Check if it's a timeout error
    if (error.name === 'QueryTimeoutError') {
      throw error;
    }
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

export function getCurrentDbType(): DatabaseType | null {
  const store = getConnectionStore();
  return store.dbType;
}

/**
 * Switch to a saved connection (decrypts and activates)
 * This is called when user activates a saved connection
 */
export async function switchToConnection(
  connectionString: string,
  dbType: DatabaseType
): Promise<boolean> {
  return testConnection(connectionString, dbType);
}

/**
 * Convert SQL-like query to MongoDB query
 * Supports basic SELECT queries with WHERE clauses
 */
function convertSQLToMongoDB(sqlQuery: string): { collection: string; filter: any; limit?: number } {
  // Extract collection name (table name)
  const fromMatch = sqlQuery.match(/FROM\s+(\w+)/i);
  if (!fromMatch) {
    throw new Error('Invalid query: Could not find table/collection name');
  }
  const collection = fromMatch[1];

  // Extract WHERE clause
  let filter: any = {};
  const whereMatch = sqlQuery.match(/WHERE\s+(.+?)(?:\s+LIMIT|\s+ORDER|\s*$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    filter = parseWhereClause(whereClause);
  }

  // Extract LIMIT
  const limitMatch = sqlQuery.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1]) : undefined;

  return { collection, filter, limit };
}

/**
 * Parse WHERE clause to MongoDB filter
 * Supports: column = value, column > value, column < value, etc.
 */
function parseWhereClause(whereClause: string): any {
  const filter: any = {};

  // Handle simple conditions: column = value, column > value, etc.
  const conditionPatterns = [
    { regex: /(\w+)\s*=\s*['"]?([^'"]+)['"]?/i, operator: '$eq', numeric: false },
    { regex: /(\w+)\s*>\s*(\d+\.?\d*)/i, operator: '$gt', numeric: true },
    { regex: /(\w+)\s*<\s*(\d+\.?\d*)/i, operator: '$lt', numeric: true },
    { regex: /(\w+)\s*>=\s*(\d+\.?\d*)/i, operator: '$gte', numeric: true },
    { regex: /(\w+)\s*<=\s*(\d+\.?\d*)/i, operator: '$lte', numeric: true },
    { regex: /(\w+)\s*!=\s*['"]?([^'"]+)['"]?/i, operator: '$ne', numeric: false },
  ];

  for (const { regex, operator, numeric } of conditionPatterns) {
    const match = whereClause.match(regex);
    if (match) {
      const column = match[1];
      let value: any = match[2];

      // Convert to number if it's a numeric operator or if the value is numeric
      if (numeric || (!isNaN(Number(value)) && value !== '' && !isNaN(parseFloat(value)))) {
        value = Number(value);
      }

      if (operator === '$eq') {
        filter[column] = value;
      } else {
        filter[column] = { [operator]: value };
      }
      return filter;
    }
  }

  // If no pattern matches, return empty filter (will return all documents)
  return filter;
}

