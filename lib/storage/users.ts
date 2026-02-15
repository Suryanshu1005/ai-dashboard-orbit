// MongoDB storage for users
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface MongoUser {
  _id?: any;
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
}

/**
 * Get users collection
 */
async function getUsersCollection() {
  const database = await getMongoDB();
  return database.collection<MongoUser>('users');
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  if (!isMongoDBConfigured()) {
    throw new Error('MongoDB is required for user authentication. Please configure MONGODB_URI in .env.local');
  }

  const collection = await getUsersCollection();

  // Check if user already exists
  const existingUser = await collection.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser: MongoUser = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    name: name.trim(),
    password: hashedPassword,
    createdAt: new Date(),
  };

  await collection.insertOne(newUser);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    createdAt: newUser.createdAt.toISOString(),
  };
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<MongoUser | null> {
  if (!isMongoDBConfigured()) {
    throw new Error('MongoDB is required for user authentication. Please configure MONGODB_URI in .env.local');
  }

  const collection = await getUsersCollection();
  return collection.findOne({ email: email.toLowerCase() });
}

/**
 * Verify user password
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  if (!isMongoDBConfigured()) {
    throw new Error('MongoDB is required for user authentication. Please configure MONGODB_URI in .env.local');
  }

  const collection = await getUsersCollection();
  const user = await collection.findOne({ id });
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

