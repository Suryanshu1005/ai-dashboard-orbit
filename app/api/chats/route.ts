import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createChat,
  getChats,
} from '@/lib/storage/chats';
import { getActiveConnection, getConnectionStore } from '@/lib/db/connectors';
import crypto from 'crypto';

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

    const chats = await getChats(session.user.id, connectionId);
    
    return NextResponse.json({
      success: true,
      chats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch chats' },
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
    const { messages, title, connectionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get connection ID - use provided, active connection, or create temp ID
    let finalConnectionId: string;
    
    if (connectionId) {
      finalConnectionId = connectionId;
    } else {
      // Try to get active connection
      const activeConnection = await getActiveConnection(session.user.id);
      
      if (activeConnection) {
        finalConnectionId = activeConnection.id;
      } else {
        // Create a hash-based connection ID for unsaved connections
        const store = getConnectionStore();
        if (store.connectionString) {
          const hash = crypto.createHash('sha256').update(store.connectionString).digest('hex').substring(0, 16);
          finalConnectionId = `temp_${hash}`;
        } else {
          return NextResponse.json(
            { success: false, error: 'No database connection available' },
            { status: 400 }
          );
        }
      }
    }

    const chat = await createChat(session.user.id, finalConnectionId, messages, title);

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create chat' },
      { status: 500 }
    );
  }
}

