// MongoDB storage for chat conversations
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  results?: any[];
  columns?: string[];
  timestamp: string;
}

export interface Chat {
  id: string;
  userId: string;
  connectionId: string;
  title: string; // Auto-generated from first message or user-provided
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface MongoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  results?: any[];
  columns?: string[];
  timestamp: Date;
}

interface MongoChat {
  _id?: ObjectId;
  id: string;
  userId: string;
  connectionId: string;
  title: string;
  messages: MongoChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get chats collection
 */
async function getChatsCollection() {
  const database = await getMongoDB();
  return database.collection<MongoChat>('chats');
}

/**
 * Convert MongoDB document to Chat interface
 */
function mongoToChat(doc: MongoChat): Chat {
  return {
    id: doc.id,
    userId: doc.userId,
    connectionId: doc.connectionId,
    title: doc.title,
    messages: doc.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      query: msg.query,
      results: msg.results,
      columns: msg.columns,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    })),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

/**
 * Generate a title from the first user message
 */
function generateTitle(firstMessage: string): string {
  const maxLength = 50;
  if (firstMessage.length <= maxLength) {
    return firstMessage;
  }
  return firstMessage.substring(0, maxLength) + '...';
}

/**
 * Create a new chat
 */
export async function createChat(
  userId: string,
  connectionId: string,
  messages: ChatMessage[],
  title?: string
): Promise<Chat> {
  if (!isMongoDBConfigured()) {
    throw new Error('MongoDB is required for saving chats. Please configure MONGODB_URI in .env.local');
  }

  const collection = await getChatsCollection();

  // Generate title from first user message if not provided
  const chatTitle = title || (messages.length > 0 ? generateTitle(messages[0].content) : 'New Chat');

  const newChat: MongoChat = {
    id: Date.now().toString(),
    userId,
    connectionId,
    title: chatTitle,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      query: msg.query,
      results: msg.results,
      columns: msg.columns,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(newChat);

  return mongoToChat(newChat);
}

/**
 * Get all chats for a user
 */
export async function getChats(
  userId: string,
  connectionId?: string,
  limit: number = 50
): Promise<Chat[]> {
  if (!isMongoDBConfigured()) {
    return [];
  }

  try {
    const collection = await getChatsCollection();
    const query: any = { userId };
    
    if (connectionId) {
      query.connectionId = connectionId;
    }

    const chats = await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    return chats.map((doc) => mongoToChat(doc));
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

/**
 * Get a single chat by ID
 */
export async function getChatById(userId: string, chatId: string): Promise<Chat | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getChatsCollection();
    const chat = await collection.findOne({ id: chatId, userId });
    if (!chat) {
      return null;
    }
    return mongoToChat(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

/**
 * Update a chat (add messages, update title)
 */
export async function updateChat(
  userId: string,
  chatId: string,
  updates: {
    messages?: ChatMessage[];
    title?: string;
  }
): Promise<Chat | null> {
  if (!isMongoDBConfigured()) {
    return null;
  }

  try {
    const collection = await getChatsCollection();
    const existing = await collection.findOne({ id: chatId, userId });
    if (!existing) {
      return null;
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (updates.messages !== undefined) {
      updateDoc.messages = updates.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        query: msg.query,
        results: msg.results,
        columns: msg.columns,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
    }

    if (updates.title !== undefined) {
      updateDoc.title = updates.title.trim();
    }

    await collection.updateOne(
      { id: chatId, userId },
      { $set: updateDoc }
    );

    const updated = await collection.findOne({ id: chatId, userId });
    return updated ? mongoToChat(updated) : null;
  } catch (error) {
    console.error('Error updating chat:', error);
    return null;
  }
}

/**
 * Delete a chat
 */
export async function deleteChat(userId: string, chatId: string): Promise<boolean> {
  if (!isMongoDBConfigured()) {
    return false;
  }

  try {
    const collection = await getChatsCollection();
    const result = await collection.deleteOne({ id: chatId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

