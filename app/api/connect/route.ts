import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/connectors';
import type { DatabaseType } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, dbType } = body;

    if (!connectionString || !dbType) {
      return NextResponse.json(
        { success: false, error: 'Connection string and database type are required' },
        { status: 400 }
      );
    }

    const isValidType: boolean = ['postgresql', 'mysql', 'mongodb', 'mssql'].includes(dbType);
    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: 'Invalid database type' },
        { status: 400 }
      );
    }

    const isConnected = await testConnection(connectionString, dbType as DatabaseType);

    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Connection failed. Please check your connection string.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Connection error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Connection failed' },
      { status: 500 }
    );
  }
}

