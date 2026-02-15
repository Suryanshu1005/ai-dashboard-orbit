'use client';

import { useState, useEffect } from 'react';

interface QueryHistoryItem {
  id: string;
  naturalLanguageQuery: string;
  generatedQuery: string;
  queryType: 'sql' | 'mongodb';
  tableName: string;
  resultsCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
  createdAt: string;
  connectionId: string;
}

interface QueryHistoryProps {
  onReRun: (queryId: string) => void;
  connectionId?: string;
}

export default function QueryHistory({ onReRun, connectionId }: QueryHistoryProps) {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, connectionId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = connectionId
        ? `/api/query-history?connectionId=${connectionId}&limit=20`
        : '/api/query-history?limit=20';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch query history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (queryId: string) => {
    try {
      const response = await fetch(`/api/query-history/${queryId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setHistory((prev) => prev.filter((q) => q.id !== queryId));
      }
    } catch (err) {
      console.error('Failed to delete query:', err);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        History
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Query History</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No query history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-3 ${
                        item.success
                          ? 'border-gray-200 bg-white'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {item.naturalLanguageQuery}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mb-1 truncate">
                            {item.queryType === 'sql'
                              ? item.generatedQuery
                              : JSON.stringify(JSON.parse(item.generatedQuery), null, 2).substring(0, 100)}
                          </p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span>Table: {item.tableName}</span>
                            <span>•</span>
                            <span>{item.resultsCount} rows</span>
                            <span>•</span>
                            <span>{formatTime(item.executionTime)}</span>
                            {item.success ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </div>
                          {item.error && (
                            <p className="text-xs text-red-600 mt-1">{item.error}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          {item.success && (
                            <button
                              onClick={() => {
                                onReRun(item.id);
                                setIsOpen(false);
                              }}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Re-run
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

