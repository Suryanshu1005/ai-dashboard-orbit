'use client';

import { useState } from 'react';

export default function ModelList() {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/models');
      const data = await response.json();

      if (data.success) {
        setModels(data.models || []);
      } else {
        setError(data.error || 'Failed to fetch models');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Available Gemini Models</h2>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {loading ? 'Loading...' : 'Refresh Models'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {models.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-2">
            Found {models.length} available model(s):
          </p>
          <div className="space-y-1">
            {models.map((model) => (
              <div
                key={model}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-800"
              >
                {model}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 Update the model name in <code className="bg-gray-100 px-1 rounded">lib/ai/claude.ts</code> to use a different model
          </p>
        </div>
      )}

      {models.length === 0 && !loading && !error && (
        <div className="text-center py-4">
          <p className="text-gray-600 text-sm">Click "Refresh Models" to see available models</p>
        </div>
      )}
    </div>
  );
}

