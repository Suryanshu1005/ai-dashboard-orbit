import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getConnection,
  getDecryptedConnectionString,
  updateLastTested,
} from '@/lib/storage/connections';
import { testConnection } from '@/lib/db/connectors';

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

    const connection = await getConnection(session.user.id, params.id);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Decrypt connection string
    const decryptedString = await getDecryptedConnectionString(session.user.id, params.id);
    if (!decryptedString) {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt connection string' },
        { status: 500 }
      );
    }

    // Test connection
    const isConnected = await testConnection(decryptedString, connection.dbType);

    if (isConnected) {
      // Update last tested timestamp
      await updateLastTested(session.user.id, params.id);

      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Connection test failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}

