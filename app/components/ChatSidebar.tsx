'use client';

import { useState, useEffect } from 'react';
// @ts-ignore - lucide-react will be installed
import { MessageSquare, Plus, Trash2, Settings, LayoutDashboard, Database } from 'lucide-react';
import { Sidebar, SidebarHeader, SidebarContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ChatListItem {
  id: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  previousChats: ChatListItem[];
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  previousChats,
  currentChatId,
  onLoadChat,
  onNewChat,
  onDeleteChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(chatId);
    } else {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          if (currentChatId === chatId) {
            onNewChat();
          }
        }
      } catch (err) {
        console.error('Failed to delete chat:', err);
      }
    }
  };

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      <SidebarHeader onClose={onClose}>
        <h2 className="text-sm font-semibold text-gray-900">Chat History</h2>
      </SidebarHeader>
      
      <SidebarContent>
        <div className="space-y-1 flex flex-col h-full">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <div className="pt-2 space-y-1 flex-1 overflow-y-auto">
            {previousChats.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No previous chats</p>
              </div>
            ) : (
              previousChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-md p-2 cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                  onClick={() => {
                    onLoadChat(chat.id);
                    // Close sidebar on mobile after selecting chat
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {chat.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {hoveredChatId === chat.id && (
                      <button
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-1 mt-auto">
          <Button
            onClick={() => {
              router.push('/dashboards');
              onClose();
            }}
            variant="ghost"
            className="w-full justify-start gap-2 text-gray-700 hover:bg-gray-100"
            size="sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboards
          </Button>
          <Button
            onClick={() => {
              router.push('/');
              onClose();
            }}
            variant="ghost"
            className="w-full justify-start gap-2 text-gray-700 hover:bg-gray-100"
            size="sm"
          >
            <Database className="h-4 w-4" />
            Connections
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

