'use client';

import { useState } from 'react';
import type { Column } from '@/lib/db/types';

interface QueryChatProps {
  tableName: string | null;
  tableSchema: Column[];
  onQueryResults?: (results: any[], columns: string[]) => void;
}

export default function QueryChat({ tableName, tableSchema, onQueryResults }: QueryChatProps) {
  const [query, setQuery] = useState('');
  const [sql, setSql] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    if (!tableName || !query.trim()) {
      setError('Please select a table and enter a query');
      return;
    }

    setLoading(true);
    setError('');
    setSql('');
    setResults([]);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Handle both 'sql' and 'query' field names for backward compatibility
        const generatedQuery = data.query || data.sql || '';
        setSql(generatedQuery);
        const queryResults = data.data || [];
        const queryColumns = data.columns || [];
        setResults(queryResults);
        setColumns(queryColumns);
        // Pass results to parent component
        if (onQueryResults) {
          onQueryResults(queryResults, queryColumns);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSql('');
    setResults([]);
    setColumns([]);
    setError('');
    // Clear results in parent
    if (onQueryResults) {
      onQueryResults([], []);
    }
  };

  if (!tableName) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600 text-center text-sm">Please select a table first to start querying.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Query</h2>
        <p className="text-sm text-gray-600">
          Table: <span className="font-medium text-gray-900">{tableName}</span>
        </p>
      </div>
      
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleQuery()}
            placeholder="e.g., show me all users older than 25"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            disabled={loading}
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Querying...' : 'Query'}
          </button>
          <button
            onClick={handleClear}
            disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Try: "show me all users", "users older than 25", "select name, email from users"
        </p>
      </div>

      {sql && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-gray-700 mb-1">Generated Query:</p>
          <code className="text-xs text-gray-900 font-mono block whitespace-pre-wrap break-all">
            {(() => {
              try {
                if (sql.startsWith('[') || sql.startsWith('{')) {
                  return JSON.stringify(JSON.parse(sql), null, 2);
                }
              } catch (e) {
                // If JSON parsing fails, return original
              }
              return sql;
            })()}
          </code>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 flex justify-between items-center">
            <h3 className="font-medium text-gray-900 text-sm">
              Results ({results.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-md max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-1.5 text-xs text-gray-700">
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col]).length > 50
                            ? String(row[col]).substring(0, 50) + '...'
                            : String(row[col])
                          : <span className="text-gray-400">NULL</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 50 && (
              <div className="p-2 bg-gray-50 text-gray-600 text-xs text-center border-t border-gray-200">
                Showing first 50 of {results.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

