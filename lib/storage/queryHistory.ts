// MongoDB storage for query history
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export interface QueryHistory {
  id: string;
  userId: string;
  connectionId: string;
  naturalLanguageQuery: string;
  generatedQuery: string;
  queryType: 'sql' | 'mongodb';
  tableName: string;
  resultsCount: number;
  executionTime: number; // Milliseconds
  success: boolean;
  error?: string;
  createdAt: string;
}

interface MongoQueryHistory {
  _id?: ObjectId;
  id: string;
  userId: string;
  connectionId: string;
  naturalLanguageQuery: string;
  generatedQuery: string;
  queryType: 'sql' | 'mongodb';
  tableName: string;
  resultsCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

/**
 * Get query history collection
 */
async function getQueryHistoryCollection() {
  const database = await getMongoDB();
  return database.collection<MongoQueryHistory>('queryHistory');
}

/**
 * Convert MongoDB document to QueryHistory interface
 */
function mongoToQueryHistory(doc: MongoQueryHistory): QueryHistory {
  return {
    id: doc.id,
    userId: doc.userId,
    connectionId: doc.connectionId,
    naturalLanguageQuery: doc.naturalLanguageQuery,
    generatedQuery: doc.generatedQuery,
    queryType: doc.queryType,
    tableName: doc.tableName,
    resultsCount: doc.resultsCount,
    executionTime: doc.executionTime,
    success: doc.success,
    error: doc.error,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

/**
 * Save a query to history
 */
export async function saveQuery(
  userId: string,
  connectionId: string,
  queryData: {
    naturalLanguageQuery: string;
    generatedQuery: string;
    queryType: 'sql' | 'mongodb';
    tableName: string;
    resultsCount: number;
    executionTime: number;
    success: boolean;
    error?: string;
  }
): Promise<QueryHistory> {
  if (!isMongoDBConfigured()) {
    throw new Error('MongoDB is required for query history. Please configure MONGODB_URI in .env.local');
  }

  const collection = await getQueryHistoryCollection();

  const newQuery: MongoQueryHistory = {
    id: Date.now().toString(),
    userId,
    connectionId,
    naturalLanguageQuery: queryData.naturalLanguageQuery,
    generatedQuery: queryData.generatedQuery,
    queryType: queryData.queryType,
    tableName: queryData.tableName,
    resultsCount: queryData.resultsCount,
    executionTime: queryData.executionTime,
    success: queryData.success,
    error: queryData.error,
    createdAt: new Date(),
  };

  await collection.insertOne(newQuery);

  return mongoToQueryHistory(newQuery);
}

/**
 * Get query history for a user
 */
export async function getQueryHistory(
  userId: string,
  connectionId?: string,
  limit: number = 50
): Promise<QueryHistory[]> {
  if (!isMongoDBConfigured()) {
    return [];
  }

  try {
    const collection = await getQueryHistoryCollection();
    const query: any = { userId };
    
    if (connectionId) {
      query.connectionId = connectionId;
    }

    const queries = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return queries.map((doc) => mongoToQueryHistory(doc));
  } catch (error) {
    console.error('Error fetching query history:', error);
    return [];
  }
}

/**
 * Get a single query by ID
 */
export async function getQueryById(userId: string, queryId: string): Promise<QueryHistory | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getQueryHistoryCollection();
    const query = await collection.findOne({ id: queryId, userId });
    if (!query) {
      return null;
    }
    return mongoToQueryHistory(query);
  } catch (error) {
    console.error('Error fetching query:', error);
    return null;
  }
}

/**
 * Delete a query from history
 */
export async function deleteQuery(userId: string, queryId: string): Promise<boolean> {
  if (!isMongoDBConfigured()) {
    return false;
  }

  try {
    const collection = await getQueryHistoryCollection();
    const result = await collection.deleteOne({ id: queryId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting query:', error);
    return false;
  }
}

/**
 * Clear query history
 */
export async function clearHistory(userId: string, connectionId?: string): Promise<boolean> {
  if (!isMongoDBConfigured()) {
    return false;
  }

  try {
    const collection = await getQueryHistoryCollection();
    const query: any = { userId };
    
    if (connectionId) {
      query.connectionId = connectionId;
    }

    const result = await collection.deleteMany(query);
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

