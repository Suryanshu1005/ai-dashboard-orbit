'use client';

import { useState, useEffect } from 'react';
import type { DatabaseType } from '@/lib/db/types';

interface SavedConnection {
  id: string;
  name: string;
  dbType: DatabaseType;
  host?: string;
  database?: string;
  isActive: boolean;
  queryTimeout?: number;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

interface ConnectionManagerProps {
  onClose: () => void;
  onConnectionActivated: (connectionId: string) => void;
}

export default function ConnectionManager({ onClose, onConnectionActivated }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editConnectionString, setEditConnectionString] = useState('');
  const [editQueryTimeout, setEditQueryTimeout] = useState(30000);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.connections || []);
      } else {
        setError(data.error || 'Failed to fetch connections');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (connectionId: string) => {
    setTestingId(connectionId);
    setError('');
    try {
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        await fetchConnections();
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleActivate = async (connectionId: string) => {
    setError('');
    try {
      const response = await fetch(`/api/connections/${connectionId}/activate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        await fetchConnections();
        onConnectionActivated(connectionId);
      } else {
        setError(data.error || 'Failed to activate connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate connection');
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await fetchConnections();
      } else {
        setError(data.error || 'Failed to delete connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete connection');
    }
  };

  const handleEdit = (connection: SavedConnection) => {
    setEditingId(connection.id);
    setEditName(connection.name);
    setEditConnectionString(''); // Don't show connection string for security
    setEditQueryTimeout(connection.queryTimeout || 30000);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setError('');
    try {
      const updates: any = { name: editName };
      if (editConnectionString.trim()) {
        updates.connectionString = editConnectionString.trim();
      }
      if (editQueryTimeout) {
        updates.queryTimeout = editQueryTimeout;
      }

      const response = await fetch(`/api/connections/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        setEditingId(null);
        await fetchConnections();
      } else {
        setError(data.error || 'Failed to update connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update connection');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Manage Connections</h2>
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

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No saved connections</p>
              <p className="text-sm text-gray-500">Save a connection from the connection form to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={`border rounded-lg p-4 ${
                    connection.isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {editingId === connection.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connection Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connection String (leave blank to keep current)
                        </label>
                        <input
                          type="password"
                          value={editConnectionString}
                          onChange={(e) => setEditConnectionString(e.target.value)}
                          placeholder="Enter new connection string"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Query Timeout (ms)
                        </label>
                        <input
                          type="number"
                          value={editQueryTimeout}
                          onChange={(e) => setEditQueryTimeout(parseInt(e.target.value) || 30000)}
                          min="1000"
                          max="300000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {connection.name}
                            {connection.isActive && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">(Active)</span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {connection.dbType.toUpperCase()}
                            {connection.host && ` • ${connection.host}`}
                            {connection.database && ` • ${connection.database}`}
                          </p>
                          {connection.lastTestedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last tested: {new Date(connection.lastTestedAt).toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Timeout: {connection.queryTimeout || 30000}ms
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {!connection.isActive && (
                          <button
                            onClick={() => handleActivate(connection.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleTest(connection.id)}
                          disabled={testingId === connection.id}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
                        >
                          {testingId === connection.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => handleEdit(connection)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(connection.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

