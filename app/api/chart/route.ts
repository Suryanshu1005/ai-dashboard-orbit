import { NextRequest, NextResponse } from 'next/server';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartConfig {
  chartData: any[];
  config: {
    xAxisKey: string;
    yAxisKey: string | string[];
    chartType: ChartType;
    title?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryResult, chartType, xAxis, yAxis } = body;

    if (!queryResult || !Array.isArray(queryResult) || queryResult.length === 0) {
      return NextResponse.json(
        { error: 'Query result is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!chartType || !['bar', 'line', 'pie', 'area', 'scatter'].includes(chartType)) {
      return NextResponse.json(
        { error: 'Valid chart type is required (bar, line, pie, area, scatter)' },
        { status: 400 }
      );
    }

    // Auto-detect axes if not provided
    const firstRow = queryResult[0];
    const allKeys = Object.keys(firstRow);

    // Find X-axis: first non-numeric column or date column, or first column
    let xAxisKey = xAxis;
    if (!xAxisKey) {
      xAxisKey = allKeys.find(
        (key) =>
          typeof firstRow[key] === 'string' ||
          firstRow[key] instanceof Date ||
          isNaN(Number(firstRow[key]))
      ) || allKeys[0];
    }

    // Find Y-axis: numeric columns
    let yAxisKeys: string[] = [];
    if (yAxis) {
      yAxisKeys = Array.isArray(yAxis) ? yAxis : [yAxis];
    } else {
      yAxisKeys = allKeys.filter(
        (key) => key !== xAxisKey && typeof firstRow[key] === 'number'
      );
      if (yAxisKeys.length === 0) {
        // If no numeric columns, use first non-x-axis column
        yAxisKeys = [allKeys.find((key) => key !== xAxisKey) || allKeys[0]];
      }
    }

    // Transform data for chart
    const chartData = queryResult.map((row: any) => {
      const dataPoint: any = {
        name: String(row[xAxisKey] || ''),
      };

      // For pie charts, use single value
      if (chartType === 'pie') {
        dataPoint.value = Number(row[yAxisKeys[0]] || 0);
      } else {
        // For other charts, include all Y-axis values
        yAxisKeys.forEach((key) => {
          dataPoint[key] = Number(row[key] || 0);
        });
      }

      return dataPoint;
    });

    return NextResponse.json({
      chartData,
      config: {
        xAxisKey,
        yAxisKey: chartType === 'pie' ? yAxisKeys[0] : yAxisKeys,
        chartType,
      },
    });
  } catch (error: any) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chart data' },
      { status: 500 }
    );
  }
}

