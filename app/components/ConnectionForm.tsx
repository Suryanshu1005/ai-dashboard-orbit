'use client';

import { useState, useEffect } from 'react';
import type { DatabaseType } from '@/lib/db/types';
import ConnectionManager from './ConnectionManager';

interface SavedConnection {
  id: string;
  name: string;
  dbType: DatabaseType;
  host?: string;
  database?: string;
  isActive: boolean;
  queryTimeout?: number;
}

interface ConnectionFormProps {
  onConnect: (connected: boolean) => void;
}

export default function ConnectionForm({ onConnect }: ConnectionFormProps) {
  const [connectionString, setConnectionString] = useState('');
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [saveConnection, setSaveConnection] = useState(true); // Default to saving connections
  const [connectionName, setConnectionName] = useState('');
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);

  const handleDisconnect = () => {
    setConnected(false);
    setConnectionString('');
    setSelectedConnectionId(null);
    onConnect(false);
  };

  useEffect(() => {
    fetchSavedConnections();
    // Don't auto-load active connection - let user choose
    // This allows users to connect to a new connection even if one exists
  }, []);

  const fetchSavedConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      if (data.success) {
        setSavedConnections(data.connections || []);
        // Don't auto-load active connection - let user explicitly choose
        // If they want to use the active connection, they can select it from the dropdown
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const loadConnection = async (connectionId: string) => {
    // Prevent loading if already loading or if it's the same connection
    if (loading || selectedConnectionId === connectionId) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Activate the connection
      const activateResponse = await fetch(`/api/connections/${connectionId}/activate`, {
        method: 'POST',
      });
      const activateData = await activateResponse.json();
      
      if (activateData.success) {
        setSelectedConnectionId(connectionId);
        setConnected(true);
        onConnect(true);
        // Don't refetch connections here to avoid loops - the activation is already done
      } else {
        setError(activateData.error || 'Failed to activate connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load connection');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate connection name from connection string
  const generateConnectionName = (connString: string, dbType: DatabaseType): string => {
    try {
      if (dbType === 'mongodb') {
        // mongodb://host:port/database or mongodb+srv://host/database
        const match = connString.match(/mongodb(\+srv)?:\/\/([^\/]+)(\/([^?]+))?/);
        if (match) {
          const host = match[2].split(':')[0];
          const database = match[4] || 'default';
          return `${host}/${database}`;
        }
      } else {
        // postgresql://user:pass@host:port/database
        const url = new URL(connString);
        const host = url.hostname;
        const database = url.pathname.slice(1) || 'default';
        return `${host}/${database}`;
      }
    } catch (e) {
      // If parsing fails, use a generic name
    }
    return `${dbType} Connection`;
  };

  const handleConnect = async () => {
    if (!connectionString.trim()) {
      setError('Please enter a connection string');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, test the connection
      const connectResponse = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionString: connectionString.trim(),
          dbType,
        }),
      });

      const connectData = await connectResponse.json();

      if (!connectData.success) {
        setConnected(false);
        setError(connectData.error || 'Connection failed');
        onConnect(false);
        return;
      }

      // Always save the connection (unless user explicitly unchecks)
      if (saveConnection) {
        // Auto-generate name if not provided
        const finalConnectionName = connectionName.trim() || generateConnectionName(connectionString.trim(), dbType);
        
        const saveResponse = await fetch('/api/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: finalConnectionName,
            dbType,
            connectionString: connectionString.trim(),
          }),
        });

        const saveData = await saveResponse.json();
        console.log('Save connection response:', saveData);
        
        if (!saveData.success) {
          // Show error to user
          setError(`Connection successful but failed to save: ${saveData.error || 'Unknown error'}`);
          console.error('Connection successful but failed to save:', saveData.error);
        } else {
          // Connection saved successfully, now activate it
          const activateResponse = await fetch(`/api/connections/${saveData.connection.id}/activate`, {
            method: 'POST',
          });
          const activateData = await activateResponse.json();
          
          if (activateData.success) {
            setSelectedConnectionId(saveData.connection.id);
            await fetchSavedConnections();
          } else {
            console.warn('Connection saved but failed to activate:', activateData.error);
            // Still proceed, connection is saved
            setSelectedConnectionId(saveData.connection.id);
            await fetchSavedConnections();
          }
        }
      }

      setConnected(true);
      setError('');
      onConnect(true);
    } catch (err: any) {
      setConnected(false);
      setError(err.message || 'Failed to connect');
      onConnect(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Database Connection</h2>
          <button
            onClick={() => setShowManager(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Connections
          </button>
        </div>
        
        {!connected ? (
          <div className="space-y-4">
            {savedConnections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or select a saved connection
                </label>
                <select
                  value={selectedConnectionId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      loadConnection(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  disabled={loading}
                >
                  <option value="">-- Select saved connection --</option>
                  {savedConnections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.dbType}) {conn.isActive ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-sm text-gray-500 text-center">or</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Type
              </label>
              <select
                value={dbType}
                onChange={(e) => setDbType(e.target.value as DatabaseType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                disabled={loading}
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
                <option value="mssql">SQL Server</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection String
              </label>
              <input
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder={`e.g., postgresql://user:password@localhost:5432/dbname`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Format: <code className="text-gray-700">{dbType}://username:password@host:port/database</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveConnection"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="saveConnection" className="text-sm text-gray-700">
                Save this connection
              </label>
            </div>

            {saveConnection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Name <span className="text-gray-500 font-normal">(optional, auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="e.g., Production DB (leave empty for auto-generated name)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-600 font-semibold">✓ Connected</span>
                {selectedConnectionId && (
                  <span className="text-xs text-green-600">
                    ({savedConnections.find(c => c.id === selectedConnectionId)?.name || 'Saved connection'})
                  </span>
                )}
              </div>
              <p className="text-sm text-green-700">{dbType.toUpperCase()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDisconnect}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Disconnect
              </button>
              <button
                onClick={() => {
                  handleDisconnect();
                  // Clear form to allow new connection
                  setConnectionString('');
                  setConnectionName('');
                }}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Connect to Different DB
              </button>
            </div>
          </div>
        )}
      </div>

      {showManager && (
        <ConnectionManager
          onClose={() => {
            setShowManager(false);
            fetchSavedConnections();
          }}
          onConnectionActivated={async (connectionId) => {
            await loadConnection(connectionId);
            setShowManager(false);
          }}
        />
      )}
    </>
  );
}

