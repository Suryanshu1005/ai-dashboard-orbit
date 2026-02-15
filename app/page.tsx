'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ConnectionForm from './components/ConnectionForm';
import Header from './components/Header';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleConnect = (isConnected: boolean) => {
    setConnected(isConnected);
    if (isConnected) {
      // Navigate to chat page after successful connection
      router.push('/chat');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-2xl w-full px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              AI Dashboard Builder
            </h1>
            <p className="text-lg text-gray-600">
              Connect to any database and create visualizations with natural language queries
            </p>
          </div>

          {/* Connection Form */}
          <ConnectionForm onConnect={handleConnect} />

          {/* Instructions */}
          {!connected && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>Enter your database connection string and select the database type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>Click "Connect" to establish the connection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>You'll be redirected to the chat interface where you can ask questions about your data</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
