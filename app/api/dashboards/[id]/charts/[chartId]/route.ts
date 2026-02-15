import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDashboard,
  updateChartConfig,
  duplicateChart,
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
  { params }: { params: { id: string; chartId: string } }
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
    const { title, chartType, xAxisKey, yAxisKey, config, layout } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (chartType !== undefined) updates.chartType = chartType;
    if (xAxisKey !== undefined) updates.xAxisKey = xAxisKey;
    if (yAxisKey !== undefined) updates.yAxisKey = yAxisKey;
    if (config !== undefined) updates.config = config;
    if (layout !== undefined) updates.layout = layout;

    const updated = await updateChartConfig(
      session.user.id,
      params.id,
      params.chartId,
      updates
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Dashboard or chart not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dashboard: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update chart' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; chartId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const duplicated = await duplicateChart(
      session.user.id,
      params.id,
      params.chartId
    );

    if (!duplicated) {
      return NextResponse.json(
        { success: false, error: 'Dashboard or chart not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dashboard: duplicated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to duplicate chart' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; chartId: string } }
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

    // Remove chart from dashboard
    const updatedCharts = dashboard.charts.filter((c) => c.id !== params.chartId);

    if (!isMongoDBConfigured()) {
      const store = getInMemoryStore();
      const dash = store.find((d) => d.id === params.id && d.userId === session.user.id);
      if (dash) {
        dash.charts = updatedCharts;
      }
    } else {
      const collection = await getDashboardsCollection();
      await collection.updateOne(
        { id: params.id, userId: session.user.id },
        { $set: { charts: updatedCharts } }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete chart' },
      { status: 500 }
    );
  }
}

