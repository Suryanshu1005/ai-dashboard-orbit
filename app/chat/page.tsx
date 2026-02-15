'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ChatInterface from '../components/ChatInterface';
import Header from '../components/Header';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      checkConnection();
    }
  }, [status]);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/connection-status');
      const data = await response.json();
      if (data.connected) {
        setConnectionStatus(true);
      } else {
        setConnectionStatus(false);
        router.push('/');
      }
    } catch (error) {
      setConnectionStatus(false);
      router.push('/');
    }
  };

  if (status === 'loading' || connectionStatus === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session || !connectionStatus) {
    return null; // Will redirect
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}

