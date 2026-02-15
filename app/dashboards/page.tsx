'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '../components/Header';

interface Dashboard {
  id: string;
  name: string;
  createdAt: string;
  charts: any[];
}

export default function DashboardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboards();
    }
  }, [status]);

  const fetchDashboards = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboards');
      const data = await response.json();
      if (data.success) {
        setDashboards(data.dashboards || []);
      } else {
        setError(data.error || 'Failed to fetch dashboards');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchDashboards();
      } else {
        alert(data.error || 'Failed to delete dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete dashboard');
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
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dashboards</h1>
            <p className="text-gray-600">Manage your data visualizations</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Back to Chat
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Change Connection
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading dashboards...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No dashboards yet</p>
            <Link
              href="/chat"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create Your First Chart
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{dashboard.name}</h3>
                  <button
                    onClick={() => handleDelete(dashboard.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {dashboard.charts?.length || 0} chart(s)
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Created: {new Date(dashboard.createdAt).toLocaleDateString()}
                </p>
                <Link
                  href={`/dashboards/${dashboard.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  View Dashboard
                </Link>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
    </>
  );
}

