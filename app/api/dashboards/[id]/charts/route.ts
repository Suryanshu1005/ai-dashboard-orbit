import { NextResponse } from 'next/server';
import { getDashboard, addChartToDashboard } from '@/lib/storage/dashboards';
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
    const { chartType, xAxisKey, yAxisKey, chartData, title } = body;

    if (!chartType || !xAxisKey || !yAxisKey || !chartData) {
      return NextResponse.json(
        { success: false, error: 'Missing required chart fields' },
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

    const newChart = {
      id: Date.now().toString(),
      chartType,
      xAxisKey,
      yAxisKey,
      chartData,
      title: title || `${chartType} Chart`,
      createdAt: new Date().toISOString(),
      layout: {
        x: 0,
        y: 0,
        w: 6,
        h: 4,
      },
      config: {},
    };

    const success = await addChartToDashboard(params.id, newChart, session.user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add chart to dashboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chart: newChart,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add chart to dashboard' },
      { status: 500 }
    );
  }
}


