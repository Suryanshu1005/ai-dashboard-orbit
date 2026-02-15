'use client';

import { useState, useEffect } from 'react';
import type { ChartType } from '@/app/api/chart/route';

interface Chart {
  id: string;
  chartType: string;
  xAxisKey: string;
  yAxisKey: string;
  chartData: any[];
  title: string;
  config?: any;
}

interface ChartEditModalProps {
  chart: Chart;
  dashboardId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ChartEditModal({ chart, dashboardId, onClose, onSave }: ChartEditModalProps) {
  const [title, setTitle] = useState(chart.title);
  const [chartType, setChartType] = useState<ChartType>(chart.chartType as ChartType);
  const [xAxisKey, setXAxisKey] = useState(chart.xAxisKey);
  const [yAxisKey, setYAxisKey] = useState(chart.yAxisKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get available columns from chart data
  const columns = chart.chartData.length > 0 ? Object.keys(chart.chartData[0]) : [];

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/charts/${chart.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          chartType,
          xAxisKey,
          yAxisKey,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSave();
      } else {
        setError(data.error || 'Failed to update chart');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Chart</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chart Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
                <option value="area">Area</option>
                <option value="scatter">Scatter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                X-Axis
              </label>
              <select
                value={xAxisKey}
                onChange={(e) => setXAxisKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Y-Axis
              </label>
              <select
                value={yAxisKey}
                onChange={(e) => setYAxisKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

