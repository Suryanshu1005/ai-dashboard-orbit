'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// @ts-ignore - lucide-react will be installed
import { Menu, Database, History, LayoutDashboard } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChartModal from './ChartModal';
import TableModal from './TableModal';
import QueryHistory from './QueryHistory';
import ChatSidebar from './ChatSidebar';
import SearchableTableSelect from './SearchableTableSelect';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  results?: any[];
  columns?: string[];
  timestamp: Date;
}

interface Table {
  name: string;
  type: string;
}

interface ChatListItem {
  id: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loadingTables, setLoadingTables] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [previousChats, setPreviousChats] = useState<ChatListItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Open by default on desktop
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveChatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchTables();
    fetchActiveConnection();
    fetchPreviousChats();
  }, [activeConnectionId]);

  // Save chat when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      // Clear existing timeout
      if (saveChatTimeoutRef.current) {
        clearTimeout(saveChatTimeoutRef.current);
      }

      // Debounce chat saving (save after 2 seconds of no new messages)
      saveChatTimeoutRef.current = setTimeout(() => {
        saveChat();
      }, 2000);
    }

    return () => {
      if (saveChatTimeoutRef.current) {
        clearTimeout(saveChatTimeoutRef.current);
      }
    };
  }, [messages]);

  const fetchActiveConnection = async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      if (data.success) {
        const active = data.connections.find((c: any) => c.isActive);
        if (active) {
          setActiveConnectionId(active.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active connection:', err);
    }
  };

  const fetchPreviousChats = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (activeConnectionId) {
        queryParams.append('connectionId', activeConnectionId);
      }
      const response = await fetch(`/api/chats?${queryParams.toString()}`);
      const data = await response.json();
      if (data.success) {
        setPreviousChats(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to fetch previous chats:', err);
    }
  };

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      if (data.tables && data.tables.length > 0) {
        setTables(data.tables);
        // Auto-select first table if none selected
        if (!selectedTable && data.tables[0]) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const saveChat = async () => {
    if (messages.length === 0) return;

    try {
      const messagesToSave = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        query: msg.query,
        results: msg.results,
        columns: msg.columns,
        timestamp: msg.timestamp.toISOString(),
      }));

      if (currentChatId) {
        // Update existing chat
        const response = await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesToSave,
          }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchPreviousChats();
        }
      } else {
        // Create new chat
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesToSave,
            connectionId: activeConnectionId || undefined,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setCurrentChatId(data.chat.id);
          await fetchPreviousChats();
        }
      }
    } catch (err) {
      console.error('Failed to save chat:', err);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      const data = await response.json();
      if (data.success && data.chat) {
        const loadedMessages: Message[] = data.chat.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          query: msg.query,
          results: msg.results,
          columns: msg.columns,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(loadedMessages);
        setCurrentChatId(data.chat.id);
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        if (currentChatId === chatId) {
          startNewChat();
        }
        await fetchPreviousChats();
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          tableName: selectedTable || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const generatedQuery = data.query || data.sql || '';
        const queryResults = data.data || [];
        const queryColumns = data.columns || [];

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Query executed successfully. Found ${queryResults.length} results.`,
          query: generatedQuery,
          results: queryResults,
          columns: queryColumns,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to execute query'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateChart = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowChartModal(true);
  };

  const handleSaveTable = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowTableModal(true);
  };

  const handleChartSaved = () => {
    setShowChartModal(false);
    setSelectedMessageId(null);
  };

  const handleTableSaved = () => {
    setShowTableModal(false);
    setSelectedMessageId(null);
  };

  const handleReRunQuery = async (queryId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/query-history/${queryId}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Query execution failed: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Re-ran query: ${data.query}`,
          query: data.query,
          results: data.data,
          columns: data.columns,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to re-run query: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMessage = selectedMessageId
    ? messages.find((m) => m.id === selectedMessageId)
    : null;

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        previousChats={previousChats}
        currentChatId={currentChatId}
        onLoadChat={loadChat}
        onNewChat={startNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Menu button and Table Selector */}
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {tables.length > 0 && (
                <SearchableTableSelect
                  tables={tables}
                  selectedTable={selectedTable}
                  onTableSelect={setSelectedTable}
                  disabled={loadingTables}
                />
              )}
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              <QueryHistory
                onReRun={handleReRunQuery}
                connectionId={activeConnectionId || undefined}
              />
              <button
                onClick={() => router.push('/dashboards')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Dashboards</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Database className="h-4 w-4" />
                <span className="hidden md:inline">Connections</span>
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Start asking questions about your data
                </h2>
                <p className="text-gray-600 mb-4">
                  {selectedTable 
                    ? `Currently querying: ${selectedTable}`
                    : 'Select a table from the header to start querying'}
                </p>
                <p className="text-gray-500 text-sm">
                  Try asking things like "show me all users" or "orders created in last 24 hours"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onGenerateChart={() => handleGenerateChart(message.id)}
                    onSaveTable={message.results && message.results.length > 0 ? () => handleSaveTable(message.id) : undefined}
                  />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-3xl">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Processing your query...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input - Fixed at bottom */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {selectedTable && (
              <div className="mb-2 text-xs text-gray-500 flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                <span>Querying: <span className="font-medium text-gray-700">{selectedTable}</span></span>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedTable ? `Ask a question about ${selectedTable}...` : "Select a table first, then ask a question..."}
                rows={1}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
                disabled={loading || !selectedTable}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || !selectedTable}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Modal */}
      {showChartModal && selectedMessage && (
        <ChartModal
          queryResults={selectedMessage.results || []}
          columns={selectedMessage.columns || []}
          onClose={() => {
            setShowChartModal(false);
            setSelectedMessageId(null);
          }}
          onChartSaved={handleChartSaved}
        />
      )}

      {/* Table Modal */}
      {showTableModal && selectedMessage && (
        <TableModal
          queryResults={selectedMessage.results || []}
          columns={selectedMessage.columns || []}
          onClose={() => {
            setShowTableModal(false);
            setSelectedMessageId(null);
          }}
          onTableSaved={handleTableSaved}
        />
      )}
    </div>
  );
}
