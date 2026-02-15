import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getConnection,
  getDecryptedConnectionString,
  setActiveConnection,
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

    // Test connection before activating
    const isConnected = await testConnection(decryptedString, connection.dbType);
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: 'Connection test failed. Cannot activate connection.' },
        { status: 400 }
      );
    }

    // Set as active
    const success = await setActiveConnection(session.user.id, params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to activate connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection activated successfully',
    });
  } catch (error: any) {
    console.error('Activate connection error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to activate connection' },
      { status: 500 }
    );
  }
}

