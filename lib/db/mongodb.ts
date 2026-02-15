import { MongoClient, Db } from 'mongodb';

// MongoDB connection singleton
let client: MongoClient | null = null;
let db: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard_app';
const DB_NAME = process.env.MONGODB_DB_NAME || 'dashboard_app';

/**
 * Extract database name from MongoDB URI
 */
function extractDbNameFromURI(uri: string): string | null {
  try {
    // Match pattern: mongodb://host:port/dbname or mongodb+srv://host/dbname
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get database name from URI or environment variable
 */
function getDatabaseName(): string {
  const uriDbName = extractDbNameFromURI(MONGODB_URI);
  // If database name is in URI, use it; otherwise use DB_NAME env var or default
  return uriDbName || DB_NAME;
}

/**
 * Check if MongoDB is configured
 */
export function isMongoDBConfigured(): boolean {
  return !!process.env.MONGODB_URI && process.env.MONGODB_URI !== '';
}

/**
 * Get or create MongoDB connection
 */
export async function getMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      console.log('Connected to MongoDB');
    }

    const databaseName = getDatabaseName();
    db = client.db(databaseName);
    console.log(`Using database: ${databaseName}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB. Please check your MONGODB_URI in .env.local');
  }
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Get dashboards collection
 */
export async function getDashboardsCollection() {
  const database = await getMongoDB();
  return database.collection('dashboards');
}

