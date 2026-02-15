'use client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  results?: any[];
  columns?: string[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  onGenerateChart: () => void;
  onSaveTable?: () => void;
}

export default function ChatMessage({ message, onGenerateChart, onSaveTable }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-3xl rounded-lg p-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        {/* Message Content */}
        <div className="mb-2">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Generated Query */}
        {message.query && (
          <div className="mt-2 pt-2 border-t border-gray-300/30">
            <p className="text-xs font-medium mb-1.5 opacity-80">Generated Query</p>
            <div className={`rounded p-2 overflow-x-auto ${isUser ? 'bg-black/20' : 'bg-gray-50'}`}>
              <code className={`text-xs font-mono whitespace-pre-wrap ${isUser ? 'text-white/90' : 'text-gray-800'}`}>
                {(() => {
                  try {
                    if (message.query.startsWith('[') || message.query.startsWith('{')) {
                      return JSON.stringify(JSON.parse(message.query), null, 2);
                    }
                  } catch (e) {
                    // If JSON parsing fails, return original
                  }
                  return message.query;
                })()}
              </code>
            </div>
          </div>
        )}

        {/* Results Table */}
        {message.results && message.results.length > 0 && message.columns && (
          <div className="mt-2 pt-2 border-t border-gray-300/30">
            <div className="flex justify-between items-center mb-2">
              <p className={`text-xs font-medium ${isUser ? 'opacity-80' : 'text-gray-600'}`}>
                Results ({message.results.length} rows)
              </p>
              <div className="flex gap-2">
                {onSaveTable && (
                  <button
                    onClick={onSaveTable}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      isUser 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Save Table
                  </button>
                )}
                <button
                  onClick={onGenerateChart}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    isUser 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Generate Chart
                </button>
              </div>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-md max-h-48">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {message.columns.map((col) => (
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
                  {message.results.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {message.columns!.map((col) => (
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
              {message.results.length > 20 && (
                <div className="p-2 bg-gray-50 text-gray-600 text-xs text-center border-t border-gray-200">
                  Showing first 20 of {message.results.length} rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-2 text-xs ${isUser ? 'opacity-60' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

