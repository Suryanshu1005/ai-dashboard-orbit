'use client';

import { useState, useEffect } from 'react';

interface TableModalProps {
  queryResults: any[];
  columns: string[];
  onClose: () => void;
  onTableSaved: () => void;
}

export default function TableModal({
  queryResults,
  columns,
  onClose,
  onTableSaved,
}: TableModalProps) {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState('');
  const [newDashboardName, setNewDashboardName] = useState('');
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedTableColumns, setSelectedTableColumns] = useState<string[]>([]);
  const [tableTitle, setTableTitle] = useState('Query Results');
  const [maxTableRows, setMaxTableRows] = useState(100);

  useEffect(() => {
    fetchDashboards();
    // Initialize table columns to all columns
    if (columns.length > 0 && selectedTableColumns.length === 0) {
      setSelectedTableColumns(columns);
    }
  }, [columns]);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/dashboards');
      const data = await response.json();
      if (data.success) {
        setDashboards(data.dashboards || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboards:', err);
    }
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      setError('Please enter a dashboard name');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDashboardName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.dashboard) {
        await fetchDashboards();
        if (data.dashboard.id) {
          setSelectedDashboard(data.dashboard.id);
        }
        setShowCreateDashboard(false);
        setNewDashboardName('');
        setError('');
      } else {
        setError(data.error || 'Failed to create dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTable = async () => {
    if (!selectedDashboard) {
      setError('Please select or create a dashboard');
      return;
    }

    if (selectedTableColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await fetchDashboards();
      
      const dashboardExists = dashboards.find((d) => d.id === selectedDashboard);
      if (!dashboardExists) {
        setError('Dashboard not found. Please select a different dashboard or create a new one.');
        setSaving(false);
        return;
      }

      // Filter table data to only include selected columns
      const filteredTableData = queryResults.map((row) => {
        const filteredRow: any = {};
        selectedTableColumns.forEach((col) => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });

      const response = await fetch(`/api/dashboards/${selectedDashboard}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableData: filteredTableData.slice(0, maxTableRows),
          columns: selectedTableColumns,
          title: tableTitle || 'Query Results',
          maxRows: maxTableRows,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onTableSaved();
      } else {
        setError(data.error || 'Failed to save table');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Save Table to Dashboard</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Table Configuration Card */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-0.5 h-4 bg-orange-500 rounded"></span>
                Table Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Table Title
                  </label>
                  <input
                    type="text"
                    value={tableTitle}
                    onChange={(e) => setTableTitle(e.target.value)}
                    placeholder="Enter table title..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Select Columns to Display
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                    {columns.map((col) => (
                      <label key={col} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTableColumns.includes(col)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTableColumns([...selectedTableColumns, col]);
                            } else {
                              setSelectedTableColumns(selectedTableColumns.filter((c) => c !== col));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">{col}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSelectedTableColumns(columns)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedTableColumns([])}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Max Rows to Display
                  </label>
                  <input
                    type="number"
                    value={maxTableRows}
                    onChange={(e) => setMaxTableRows(Math.max(1, parseInt(e.target.value) || 100))}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum {maxTableRows} rows will be displayed
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Selection Card */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-0.5 h-4 bg-purple-600 rounded"></span>
                Add to Dashboard
              </h3>
              <div className="space-y-3">
                {!showCreateDashboard ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Select Dashboard
                      </label>
                      <select
                        value={selectedDashboard}
                        onChange={(e) => setSelectedDashboard(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Choose a dashboard...</option>
                        {dashboards.map((dashboard) => (
                          <option key={dashboard.id} value={dashboard.id}>
                            {dashboard.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setShowCreateDashboard(true)}
                      className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium"
                    >
                      + Create New Dashboard
                    </button>
                  </>
                ) : (
                  <div className="bg-white rounded-md p-3 border border-blue-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Dashboard Name
                    </label>
                    <input
                      type="text"
                      value={newDashboardName}
                      onChange={(e) => setNewDashboardName(e.target.value)}
                      placeholder="Enter dashboard name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 mb-2"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateDashboard()}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateDashboard}
                        disabled={saving || !newDashboardName.trim()}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {saving ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateDashboard(false);
                          setNewDashboardName('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTable}
            disabled={saving || !selectedDashboard || selectedTableColumns.length === 0}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </span>
            ) : (
              'Save Table to Dashboard'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

