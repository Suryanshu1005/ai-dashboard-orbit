import { NextResponse } from 'next/server';
import { getDashboard, deleteDashboard, renameDashboard, updateDashboardLayout } from '@/lib/storage/dashboards';
import { auth } from '@/lib/auth';

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

    const dashboard = await getDashboard(params.id, session.user.id);

    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { name, layouts } = body;

    if (name !== undefined) {
      // Rename dashboard
      const updated = await renameDashboard(session.user.id, params.id, name);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Dashboard not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        dashboard: updated,
      });
    }

    if (layouts !== undefined) {
      // Update layout
      const updated = await updateDashboardLayout(session.user.id, params.id, layouts);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Dashboard not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        dashboard: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No updates provided' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update dashboard' },
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

    const success = await deleteDashboard(params.id, session.user.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}

