'use client';

import { useState } from 'react';

interface Table {
  id: string;
  tableData: any[];
  columns: string[];
  title: string;
  maxRows: number;
}

interface TableEditModalProps {
  table: Table;
  dashboardId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function TableEditModal({ table, dashboardId, onClose, onSave }: TableEditModalProps) {
  const [title, setTitle] = useState(table.title);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(table.columns);
  const [maxRows, setMaxRows] = useState(table.maxRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/tables/${table.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          columns: selectedColumns,
          maxRows,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSave();
      } else {
        setError(data.error || 'Failed to update table');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update table');
    } finally {
      setLoading(false);
    }
  };

  const availableColumns = table.tableData.length > 0 ? Object.keys(table.tableData[0]) : table.columns;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Table</h2>
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
                Table Title
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
                Select Columns
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                {availableColumns.map((col) => (
                  <label key={col} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns([...selectedColumns, col]);
                        } else {
                          setSelectedColumns(selectedColumns.filter((c) => c !== col));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{col}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSelectedColumns(availableColumns)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedColumns([])}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Rows
              </label>
              <input
                type="number"
                value={maxRows}
                onChange={(e) => setMaxRows(Math.max(1, parseInt(e.target.value) || 100))}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
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
              disabled={loading || selectedColumns.length === 0}
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

