import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getQueryById,
  deleteQuery,
} from '@/lib/storage/queryHistory';
import { executeQuery } from '@/lib/db/connectors';
import { getActiveConnection, getDecryptedConnectionString } from '@/lib/storage/connections';
import { testConnection } from '@/lib/db/connectors';
import type { DatabaseType } from '@/lib/db/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const query = await getQueryById(session.user.id, params.id);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch query' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the query from history
    const query = await getQueryById(session.user.id, params.id);
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query not found' },
        { status: 404 }
      );
    }

    // Get the connection for this query
    const connection = await getActiveConnection(session.user.id);
    if (!connection || connection.id !== query.connectionId) {
      // Try to activate the connection from the query
      const connectionString = await getDecryptedConnectionString(session.user.id, query.connectionId);
      if (!connectionString) {
        return NextResponse.json(
          { success: false, error: 'Connection not found or cannot be decrypted' },
          { status: 404 }
        );
      }

      // Test and activate the connection
      const isConnected = await testConnection(connectionString, query.queryType === 'mongodb' ? 'mongodb' : 'postgresql');
      if (!isConnected) {
        return NextResponse.json(
          { success: false, error: 'Connection test failed' },
          { status: 400 }
        );
      }
    }

    // Execute the query
    const startTime = Date.now();
    let results: any[];
    let success = true;
    let error: string | undefined;

    try {
      results = await executeQuery(
        query.generatedQuery,
        query.queryType,
        query.tableName
      );
    } catch (err: any) {
      success = false;
      error = err.message;
      results = [];
    }

    const executionTime = Date.now() - startTime;

    // Get column names from results
    const resultColumns = results.length > 0 ? Object.keys(results[0]) : [];

    return NextResponse.json({
      success,
      query: query.generatedQuery,
      queryType: query.queryType,
      data: results,
      columns: resultColumns,
      rowCount: results.length,
      executionTime,
      error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to re-run query' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const success = await deleteQuery(session.user.id, params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Query not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete query' },
      { status: 500 }
    );
  }
}

