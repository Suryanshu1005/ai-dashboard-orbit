import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createConnection,
  getConnections,
} from '@/lib/storage/connections';
import type { DatabaseType } from '@/lib/db/types';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connections = await getConnections(session.user.id);
    
    // Return connections without decrypted connection strings (for security)
    return NextResponse.json({
      success: true,
      connections: connections.map((conn) => ({
        id: conn.id,
        name: conn.name,
        dbType: conn.dbType,
        host: conn.host,
        database: conn.database,
        isActive: conn.isActive,
        queryTimeout: conn.queryTimeout,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        lastTestedAt: conn.lastTestedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, dbType, connectionString, queryTimeout } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Connection name is required' },
        { status: 400 }
      );
    }

    if (!dbType || !['postgresql', 'mysql', 'mongodb', 'mssql'].includes(dbType)) {
      return NextResponse.json(
        { success: false, error: 'Valid database type is required' },
        { status: 400 }
      );
    }

    if (!connectionString || !connectionString.trim()) {
      return NextResponse.json(
        { success: false, error: 'Connection string is required' },
        { status: 400 }
      );
    }

    const connection = await createConnection(
      session.user.id,
      name,
      dbType as DatabaseType,
      connectionString,
      queryTimeout
    );

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        dbType: connection.dbType,
        host: connection.host,
        database: connection.database,
        isActive: connection.isActive,
        queryTimeout: connection.queryTimeout,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create connection' },
      { status: 500 }
    );
  }
}

