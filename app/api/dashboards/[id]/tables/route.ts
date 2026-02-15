import { NextResponse } from 'next/server';
import { getDashboard, addTableToDashboard } from '@/lib/storage/dashboards';
import { auth } from '@/lib/auth';

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

    const body = await request.json();
    const { tableData, columns, title, maxRows } = body;

    if (!tableData || !columns) {
      return NextResponse.json(
        { success: false, error: 'Missing required table fields' },
        { status: 400 }
      );
    }

    const dashboard = await getDashboard(params.id, session.user.id);
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    const newTable = {
      id: Date.now().toString(),
      tableData,
      columns,
      title: title || 'Query Results',
      maxRows: maxRows || 100,
      createdAt: new Date().toISOString(),
      layout: {
        x: 0,
        y: 0,
        w: 6,
        h: 4,
      },
    };

    const success = await addTableToDashboard(params.id, newTable, session.user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add table to dashboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      table: newTable,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add table to dashboard' },
      { status: 500 }
    );
  }
}

