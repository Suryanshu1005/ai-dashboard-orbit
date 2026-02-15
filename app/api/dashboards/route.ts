import { NextResponse } from 'next/server';
import { getDashboards, createDashboard } from '@/lib/storage/dashboards';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dashboards = await getDashboards(session.user.id);
    return NextResponse.json({
      success: true,
      dashboards: dashboards.map((d) => ({
        id: d.id,
        name: d.name,
        createdAt: d.createdAt,
        charts: d.charts || [],
        tables: d.tables || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboards' },
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Dashboard name is required' },
        { status: 400 }
      );
    }

    const newDashboard = await createDashboard(name, session.user.id);

    return NextResponse.json({
      success: true,
      dashboard: newDashboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}

