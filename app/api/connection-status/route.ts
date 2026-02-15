import { NextRequest, NextResponse } from 'next/server';
import { getCurrentDbType } from '@/lib/db/connectors';

export async function GET(request: NextRequest) {
  try {
    const dbType = getCurrentDbType();
    if (dbType) {
      return NextResponse.json({
        connected: true,
        dbType,
      });
    } else {
      return NextResponse.json({
        connected: false,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message,
    });
  }
}

