import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDashboard,
  updateTableConfig,
  duplicateTable,
} from '@/lib/storage/dashboards';
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';

async function getDashboardsCollection() {
  const database = await getMongoDB();
  return database.collection('dashboards');
}

function getInMemoryStore() {
  if (!global.__dashboardStore) {
    global.__dashboardStore = [];
  }
  return global.__dashboardStore;
}

declare global {
  var __dashboardStore: any[] | undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
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
    const { title, columns, maxRows, layout } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (columns !== undefined) updates.columns = columns;
    if (maxRows !== undefined) updates.maxRows = maxRows;
    if (layout !== undefined) updates.layout = layout;

    const updated = await updateTableConfig(
      session.user.id,
      params.id,
      params.tableId,
      updates
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Dashboard or table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dashboard: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update table' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const duplicated = await duplicateTable(
      session.user.id,
      params.id,
      params.tableId
    );

    if (!duplicated) {
      return NextResponse.json(
        { success: false, error: 'Dashboard or table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dashboard: duplicated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to duplicate table' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dashboard = await getDashboard(params.id, session.user.id);
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Remove table from dashboard
    const updatedTables = dashboard.tables.filter((t) => t.id !== params.tableId);

    if (!isMongoDBConfigured()) {
      const store = getInMemoryStore();
      const dash = store.find((d) => d.id === params.id && d.userId === session.user.id);
      if (dash) {
        dash.tables = updatedTables;
      }
    } else {
      const collection = await getDashboardsCollection();
      await collection.updateOne(
        { id: params.id, userId: session.user.id },
        { $set: { tables: updatedTables } }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete table' },
      { status: 500 }
    );
  }
}

