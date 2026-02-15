import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getQueryHistory,
  clearHistory,
} from '@/lib/storage/queryHistory';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const history = await getQueryHistory(session.user.id, connectionId, limit);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch query history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId') || undefined;

    const success = await clearHistory(session.user.id, connectionId);

    return NextResponse.json({
      success,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear history' },
      { status: 500 }
    );
  }
}

