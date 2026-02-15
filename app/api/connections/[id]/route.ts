import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getConnection,
  updateConnection,
  deleteConnection,
} from '@/lib/storage/connections';

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

    const connection = await getConnection(session.user.id, params.id);

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Return without decrypted connection string
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
        lastTestedAt: connection.lastTestedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const { name, connectionString, queryTimeout } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (connectionString !== undefined) updates.connectionString = connectionString;
    if (queryTimeout !== undefined) updates.queryTimeout = queryTimeout;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const updated = await updateConnection(session.user.id, params.id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: updated.id,
        name: updated.name,
        dbType: updated.dbType,
        host: updated.host,
        database: updated.database,
        isActive: updated.isActive,
        queryTimeout: updated.queryTimeout,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update connection' },
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

    const success = await deleteConnection(session.user.id, params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete connection' },
      { status: 500 }
    );
  }
}

