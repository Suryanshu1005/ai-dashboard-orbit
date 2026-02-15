'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Table, Column } from '@/lib/db/types';

interface TableListProps {
  onTableSelect: (tableName: string, columns: Column[]) => void;
}

export default function TableList({ onTableSelect }: TableListProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchemas, setTableSchemas] = useState<Record<string, Column[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Small delay to ensure connection is established
    const timer = setTimeout(() => {
      fetchTables();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Filter tables based on search query - MUST be called before any early returns
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) {
      return tables;
    }
    const query = searchQuery.toLowerCase();
    return tables.filter((table) => table.name.toLowerCase().includes(query));
  }, [tables, searchQuery]);

  const fetchTables = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tables');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setTables([]);
      } else {
        setTables(data.tables || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tables');
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableSchema = async (tableName: string) => {
    if (tableSchemas[tableName]) {
      // Already fetched, just select it
      setSelectedTable(tableName);
      onTableSelect(tableName, tableSchemas[tableName]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tables?tableName=${encodeURIComponent(tableName)}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        const columns = data.columns || [];
        setTableSchemas((prev) => ({ ...prev, [tableName]: columns }));
        setSelectedTable(tableName);
        onTableSelect(tableName, columns);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch table schema');
    } finally {
      setLoading(false);
    }
  };

  if (loading && tables.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600 text-center">Loading tables...</p>
      </div>
    );
  }

  if (error && tables.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
          {error}
        </div>
        <button
          onClick={fetchTables}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600 text-center text-sm">No tables found in the database.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Tables & Collections</h2>
        <button
          onClick={fetchTables}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tables..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
        />
      </div>

      {filteredTables.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No tables found matching "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTables.map((table) => (
          <div
            key={table.name}
            className={`border rounded-md p-3 cursor-pointer transition-colors ${
              selectedTable === table.name
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => fetchTableSchema(table.name)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 text-sm">{table.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{table.type}</p>
              </div>
              {selectedTable === table.name && (
                <span className="text-blue-600 text-sm font-medium">✓</span>
              )}
            </div>

            {selectedTable === table.name && tableSchemas[table.name] && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tableSchemas[table.name].map((column) => (
                    <span
                      key={column.name}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {column.name} <span className="text-gray-500">({column.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );
}

