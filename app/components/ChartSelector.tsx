'use client';

import { useState, useEffect } from 'react';
import type { ChartType } from '@/app/api/chart/route';

interface ChartSelectorProps {
  queryResults: any[];
  columns: string[];
  onChartGenerate: (chartData: any, config: any) => void;
}

export default function ChartSelector({
  queryResults,
  columns,
  onChartGenerate,
}: ChartSelectorProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (queryResults.length > 0 && columns.length > 0) {
      // Auto-detect axes
      const firstRow = queryResults[0];
      const numericColumns = columns.filter(
        (col) => typeof firstRow[col] === 'number'
      );
      const nonNumericColumns = columns.filter(
        (col) => typeof firstRow[col] !== 'number'
      );

      if (!xAxis) {
        setXAxis(nonNumericColumns[0] || columns[0]);
      }
      if (!yAxis) {
        setYAxis(numericColumns[0] || columns[0]);
      }
    }
  }, [queryResults, columns]);

  const handleGenerateChart = async () => {
    if (queryResults.length === 0) {
      setError('No query results available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryResult: queryResults,
          chartType,
          xAxis: xAxis || undefined,
          yAxis: yAxis || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        onChartGenerate(data.chartData, data.config);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate chart');
    } finally {
      setLoading(false);
    }
  };

  if (queryResults.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600 text-center text-sm">Execute a query first to generate charts.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Chart Configuration</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Chart Type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(['bar', 'line', 'pie', 'area', 'scatter'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  chartType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              X-Axis
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Y-Axis
            </label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerateChart}
          disabled={loading || !xAxis || !yAxis}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {loading ? 'Generating...' : 'Generate Chart'}
        </button>
      </div>
    </div>
  );
}

