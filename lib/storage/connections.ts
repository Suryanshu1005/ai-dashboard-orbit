// MongoDB storage for saved database connections
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import type { DatabaseType } from '@/lib/db/types';
import { ObjectId } from 'mongodb';

export interface SavedConnection {
  id: string;
  userId: string;
  name: string;
  dbType: DatabaseType;
  encryptedConnectionString: string;
  host?: string;
  database?: string;
  isActive: boolean;
  queryTimeout?: number; // Milliseconds, default 30000
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

interface MongoConnection {
  _id?: ObjectId;
  id: string;
  userId: string;
  name: string;
  dbType: DatabaseType;
  encryptedConnectionString: string;
  host?: string;
  database?: string;
  isActive: boolean;
  queryTimeout?: number;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
}

/**
 * Get connections collection
 */
async function getConnectionsCollection() {
  const database = await getMongoDB();
  return database.collection<MongoConnection>('connections');
}

/**
 * Convert MongoDB document to SavedConnection interface
 */
function mongoToConnection(doc: MongoConnection): SavedConnection {
  return {
    id: doc.id,
    userId: doc.userId,
    name: doc.name,
    dbType: doc.dbType,
    encryptedConnectionString: doc.encryptedConnectionString,
    host: doc.host,
    database: doc.database,
    isActive: doc.isActive,
    queryTimeout: doc.queryTimeout || 30000,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    lastTestedAt: doc.lastTestedAt instanceof Date ? doc.lastTestedAt.toISOString() : doc.lastTestedAt,
  };
}

/**
 * Parse connection string to extract host and database (for display)
 */
function parseConnectionString(connectionString: string, dbType: DatabaseType): { host?: string; database?: string } {
  try {
    if (dbType === 'mongodb') {
      // mongodb://host:port/database or mongodb+srv://host/database
      const match = connectionString.match(/mongodb(\+srv)?:\/\/([^\/]+)(\/([^?]+))?/);
      if (match) {
        return {
          host: match[2],
          database: match[4] || undefined,
        };
      }
    } else if (dbType === 'postgresql') {
      // postgresql://user:pass@host:port/database
      const url = new URL(connectionString);
      return {
        host: url.hostname + (url.port ? `:${url.port}` : ''),
        database: url.pathname.slice(1) || undefined,
      };
    } else if (dbType === 'mysql') {
      // mysql://user:pass@host:port/database
      const url = new URL(connectionString);
      return {
        host: url.hostname + (url.port ? `:${url.port}` : ''),
        database: url.pathname.slice(1) || undefined,
      };
    } else if (dbType === 'mssql') {
      // mssql://user:pass@host:port/database
      const url = new URL(connectionString);
      return {
        host: url.hostname + (url.port ? `:${url.port}` : ''),
        database: url.pathname.slice(1) || undefined,
      };
    }
  } catch (error) {
    // If parsing fails, return empty
  }
  return {};
}

/**
 * Create a new saved connection
 */
export async function createConnection(
  userId: string,
  name: string,
  dbType: DatabaseType,
  connectionString: string,
  queryTimeout?: number
): Promise<SavedConnection> {
  if (!isMongoDBConfigured()) {
    console.error('MongoDB not configured for saving connections');
    throw new Error('MongoDB is required for saving connections. Please configure MONGODB_URI in .env.local');
  }

  try {
    const collection = await getConnectionsCollection();
    console.log('Creating connection:', { userId, name, dbType, hasConnectionString: !!connectionString });

    // Check for duplicate connection name
    const existing = await collection.findOne({ userId, name: name.trim() });
    if (existing) {
      console.warn('Connection with same name already exists:', existing.id);
      throw new Error(`Connection with name "${name.trim()}" already exists. Please use a different name.`);
    }

    // Encrypt connection string
    let encryptedConnectionString: string;
    try {
      encryptedConnectionString = encrypt(connectionString);
      console.log('Connection string encrypted successfully');
    } catch (encryptError: any) {
      console.error('Encryption error:', encryptError);
      throw new Error(`Failed to encrypt connection string: ${encryptError.message}`);
    }

    // Parse connection string for display fields
    const { host, database } = parseConnectionString(connectionString, dbType);

    // Set all other connections as inactive
    await collection.updateMany(
      { userId },
      { $set: { isActive: false } }
    );

    const newConnection: MongoConnection = {
      id: Date.now().toString(),
      userId,
      name: name.trim(),
      dbType,
      encryptedConnectionString,
      host,
      database,
      isActive: true,
      queryTimeout: queryTimeout || 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Inserting connection into MongoDB:', {
      id: newConnection.id,
      userId,
      name: newConnection.name,
      dbType: newConnection.dbType,
      host: newConnection.host,
      database: newConnection.database,
    });

    const result = await collection.insertOne(newConnection);
    console.log('Connection inserted successfully:', result.insertedId);

    return mongoToConnection(newConnection);
  } catch (error: any) {
    console.error('Error creating connection:', error);
    throw error;
  }
}

/**
 * Get all connections for a user
 */
export async function getConnections(userId: string): Promise<SavedConnection[]> {
  if (!isMongoDBConfigured()) {
    return [];
  }

  try {
    const collection = await getConnectionsCollection();
    const connections = await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    return connections.map((doc) => mongoToConnection(doc));
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

/**
 * Get a single connection by ID
 */
export async function getConnection(userId: string, connectionId: string): Promise<SavedConnection | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getConnectionsCollection();
    const connection = await collection.findOne({ id: connectionId, userId });
    if (!connection) {
      return null;
    }
    return mongoToConnection(connection);
  } catch (error) {
    console.error('Error fetching connection:', error);
    return null;
  }
}

/**
 * Get the active connection for a user
 */
export async function getActiveConnection(userId: string): Promise<SavedConnection | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getConnectionsCollection();
    const connection = await collection.findOne({ userId, isActive: true });
    if (!connection) {
      return null;
    }
    return mongoToConnection(connection);
  } catch (error) {
    console.error('Error fetching active connection:', error);
    return null;
  }
}

/**
 * Decrypt connection string for a saved connection
 */
export async function getDecryptedConnectionString(userId: string, connectionId: string): Promise<string | null> {
  const connection = await getConnection(userId, connectionId);
  if (!connection) {
    return null;
  }

  try {
    return decrypt(connection.encryptedConnectionString);
  } catch (error) {
    console.error('Error decrypting connection string:', error);
    return null;
  }
}

/**
 * Update a connection
 */
export async function updateConnection(
  userId: string,
  connectionId: string,
  updates: {
    name?: string;
    connectionString?: string;
    queryTimeout?: number;
  }
): Promise<SavedConnection | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getConnectionsCollection();
    const existing = await collection.findOne({ id: connectionId, userId });
    if (!existing) {
      return null;
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) {
      updateDoc.name = updates.name.trim();
    }

    if (updates.connectionString !== undefined) {
      updateDoc.encryptedConnectionString = encrypt(updates.connectionString);
      const { host, database } = parseConnectionString(updates.connectionString, existing.dbType);
      updateDoc.host = host;
      updateDoc.database = database;
    }

    if (updates.queryTimeout !== undefined) {
      updateDoc.queryTimeout = updates.queryTimeout;
    }

    await collection.updateOne(
      { id: connectionId, userId },
      { $set: updateDoc }
    );

    const updated = await collection.findOne({ id: connectionId, userId });
    return updated ? mongoToConnection(updated) : null;
  } catch (error) {
    console.error('Error updating connection:', error);
    return null;
  }
}

/**
 * Delete a connection
 */
export async function deleteConnection(userId: string, connectionId: string): Promise<boolean> {
  if (!isMongoDBConfigured()) {
    return false;
  }

  try {
    const collection = await getConnectionsCollection();
    const result = await collection.deleteOne({ id: connectionId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting connection:', error);
    return false;
  }
}

/**
 * Set a connection as active (deactivates others)
 */
export async function setActiveConnection(userId: string, connectionId: string): Promise<boolean> {
  if (!isMongoDBConfigured()) {
    return false;
  }

  try {
    const collection = await getConnectionsCollection();
    
    // Check if connection exists and belongs to user
    const connection = await collection.findOne({ id: connectionId, userId });
    if (!connection) {
      return false;
    }

    // Set all connections as inactive
    await collection.updateMany(
      { userId },
      { $set: { isActive: false } }
    );

    // Set this connection as active
    await collection.updateOne(
      { id: connectionId, userId },
      { $set: { isActive: true } }
    );

    return true;
  } catch (error) {
    console.error('Error setting active connection:', error);
    return false;
  }
}

/**
 * Update last tested timestamp
 */
export async function updateLastTested(userId: string, connectionId: string): Promise<void> {
  if (!isMongoDBConfigured()) {
    return;
  }

  try {
    const collection = await getConnectionsCollection();
    await collection.updateOne(
      { id: connectionId, userId },
      { $set: { lastTestedAt: new Date() } }
    );
  } catch (error) {
    console.error('Error updating last tested:', error);
  }
}

