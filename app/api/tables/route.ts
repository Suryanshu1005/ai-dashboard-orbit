import { NextRequest, NextResponse } from 'next/server';
import { getTables, getTableSchema } from '@/lib/db/connectors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');

    if (tableName) {
      // Get specific table schema
      const columns = await getTableSchema(tableName);
      return NextResponse.json({
        tableName,
        columns,
      });
    } else {
      // Get all tables
      const tables = await getTables();
      return NextResponse.json({ tables });
    }
  } catch (error: any) {
    console.error('Tables API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

