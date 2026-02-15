import { NextRequest, NextResponse } from 'next/server';
import { listAvailableModels } from '@/lib/ai/claude';

export async function GET(request: NextRequest) {
  try {
    const models = await listAvailableModels();
    console.log('Available Gemini models:', models);
    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list models',
      },
      { status: 500 }
    );
  }
}

