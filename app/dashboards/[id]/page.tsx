'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Responsive, WidthProvider } from 'react-grid-layout';
import ChartDisplay from '@/app/components/ChartDisplay';
import TableDisplay from '@/app/components/TableDisplay';
import Header from '@/app/components/Header';
import ChartEditModal from '@/app/components/ChartEditModal';
import TableEditModal from '@/app/components/TableEditModal';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Chart {
  id: string;
  chartType: string;
  xAxisKey: string;
  yAxisKey: string;
  chartData: any[];
  title: string;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: any;
}

interface Table {
  id: string;
  tableData: any[];
  columns: string[];
  title: string;
  maxRows: number;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface Dashboard {
  id: string;
  name: string;
  charts: Chart[];
  tables: Table[];
}

export default function DashboardViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const dashboardId = params.id as string;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const layoutUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingLayoutRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && dashboardId) {
      fetchDashboard();
    }

    // Cleanup timeout on unmount
    return () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }
    };
  }, [status, dashboardId]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`);
      const data = await response.json();
      if (data.success) {
        setDashboard(data.dashboard);
        setNewDashboardName(data.dashboard.name);
      } else {
        setError(data.error || 'Failed to fetch dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = async (currentLayout: any, allLayouts: any) => {
    if (!dashboard || !isEditing || isUpdatingLayoutRef.current) return;

    // Clear existing timeout
    if (layoutUpdateTimeoutRef.current) {
      clearTimeout(layoutUpdateTimeoutRef.current);
    }

    // Debounce layout updates - only save after user stops dragging/resizing for 500ms
    layoutUpdateTimeoutRef.current = setTimeout(async () => {
      isUpdatingLayoutRef.current = true;

      // Convert react-grid-layout format to our format
      // allLayouts contains layouts for all breakpoints: { lg: [...], md: [...], ... }
      const layoutUpdates: { [key: string]: { x: number; y: number; w: number; h: number } } = {};
      
      // Use allLayouts if provided, otherwise use currentLayout as a single breakpoint
      const layoutsToProcess = allLayouts || { lg: currentLayout };
      
      Object.keys(layoutsToProcess).forEach((breakpoint) => {
        const layout = layoutsToProcess[breakpoint];
        if (Array.isArray(layout)) {
          layout.forEach((item: any) => {
            layoutUpdates[item.i] = {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            };
          });
        }
      });

      // Update layout in database
      try {
        const response = await fetch(`/api/dashboards/${dashboardId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ layouts: layoutUpdates }),
        });

        if (response.ok) {
          // Update local state without refetching to avoid re-render loop
          const updatedDashboard = await response.json();
          if (updatedDashboard.success && updatedDashboard.dashboard) {
            setDashboard(updatedDashboard.dashboard);
          }
        }
      } catch (err) {
        console.error('Failed to update layout:', err);
      } finally {
        isUpdatingLayoutRef.current = false;
      }
    }, 500); // 500ms debounce
  };

  const handleRenameDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newDashboardName.trim() }),
      });

      if (response.ok) {
        setShowRenameModal(false);
        await fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to rename dashboard:', err);
    }
  };

  const handleDuplicateChart = async (chartId: string) => {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/charts/${chartId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to duplicate chart:', err);
    }
  };

  const handleDuplicateTable = async (tableId: string) => {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/tables/${tableId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to duplicate table:', err);
    }
  };

  const handleDeleteChart = async (chartId: string) => {
    if (!confirm('Are you sure you want to delete this chart?')) return;

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/charts/${chartId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to delete chart:', err);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/tables/${tableId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  };

  // Generate layout for react-grid-layout
  const generateLayouts = () => {
    if (!dashboard) return { lg: [], md: [], sm: [], xs: [], xxs: [] };

    const items: any[] = [];
    let yPos = 0;
    let xPos = 0;
    const cols = 12; // Grid columns

    // Add charts
    dashboard.charts.forEach((chart, index) => {
      let layout = chart.layout;
      
      // If no layout exists, create a default grid layout
      if (!layout) {
        const width = 6; // Default width (half of 12 columns)
        const height = 4; // Default height
        
        // Check if item would overflow to next row
        if (xPos + width > cols) {
          xPos = 0;
          yPos += height;
        }
        
        layout = { x: xPos, y: yPos, w: width, h: height };
        xPos += width;
        
        // Move to next row if needed
        if (xPos >= cols) {
          xPos = 0;
          yPos += height;
        }
      } else {
        // Use existing layout, but update yPos tracking
        yPos = Math.max(yPos, layout.y + layout.h);
      }
      
      items.push({
        i: `chart-${chart.id}`,
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
        minW: 3,
        minH: 3,
      });
    });

    // Reset xPos for tables
    xPos = 0;
    // Start tables on a new row after charts
    if (dashboard.charts.length > 0) {
      yPos += 4; // Add some spacing
    }

    // Add tables
    dashboard.tables.forEach((table) => {
      let layout = table.layout;
      
      // If no layout exists, create a default grid layout
      if (!layout) {
        const width = 6; // Default width
        const height = 4; // Default height
        
        // Check if item would overflow to next row
        if (xPos + width > cols) {
          xPos = 0;
          yPos += height;
        }
        
        layout = { x: xPos, y: yPos, w: width, h: height };
        xPos += width;
        
        // Move to next row if needed
        if (xPos >= cols) {
          xPos = 0;
          yPos += height;
        }
      } else {
        yPos = Math.max(yPos, layout.y + layout.h);
      }
      
      items.push({
        i: `table-${table.id}`,
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
        minW: 3,
        minH: 3,
      });
    });

    return {
      lg: items,
      md: items,
      sm: items,
      xs: items,
      xxs: items,
    };
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !dashboard) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error || 'Dashboard not found'}
            </div>
            <Link
              href="/dashboards"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboards
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">{dashboard.name}</h1>
            <p className="text-gray-600">
              {dashboard.charts?.length || 0} chart(s), {dashboard.tables?.length || 0} table(s)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isEditing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isEditing ? 'Done Editing' : 'Edit Layout'}
            </button>
            <button
              onClick={() => setShowRenameModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Rename
            </button>
            <Link
              href="/dashboards"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Back to Dashboards
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Chart
            </Link>
          </div>
        </div>

        {/* Charts and Tables */}
        {(dashboard.charts && dashboard.charts.length > 0) || (dashboard.tables && dashboard.tables.length > 0) ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={generateLayouts()}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            isDraggable={isEditing}
            isResizable={isEditing}
            draggableHandle=".drag-handle"
          >
            {/* Charts */}
            {dashboard.charts.map((chart) => (
              <div key={`chart-${chart.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <div className="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900">{chart.title}</h3>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingChartId(chart.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateChart(chart.id)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteChart(chart.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <ChartDisplay
                    chartData={chart.chartData}
                    config={{
                      xAxisKey: chart.xAxisKey,
                      yAxisKey: chart.yAxisKey,
                      chartType: chart.chartType,
                      title: chart.title,
                    }}
                    showTitle={false}
                  />
                </div>
              </div>
            ))}

            {/* Tables */}
            {dashboard.tables.map((table) => (
              <div key={`table-${table.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <div className="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900">{table.title}</h3>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTableId(table.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateTable(table.id)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteTable(table.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <TableDisplay
                    tableData={table.tableData}
                    columns={table.columns}
                    title=""
                    maxRows={table.maxRows || 100}
                  />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No charts or tables in this dashboard yet</p>
            <Link
              href="/chat"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Add Your First Chart
            </Link>
          </div>
        )}

        {/* Rename Modal */}
        {showRenameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Rename Dashboard</h2>
              <input
                type="text"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                placeholder="Dashboard name"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRenameDashboard}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setNewDashboardName(dashboard?.name || '');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Chart Modal */}
        {editingChartId && (
          <ChartEditModal
            chart={dashboard.charts.find((c) => c.id === editingChartId)!}
            onClose={() => setEditingChartId(null)}
            onSave={async () => {
              await fetchDashboard();
              setEditingChartId(null);
            }}
            dashboardId={dashboardId}
          />
        )}

        {/* Edit Table Modal */}
        {editingTableId && (
          <TableEditModal
            table={dashboard.tables.find((t) => t.id === editingTableId)!}
            onClose={() => setEditingTableId(null)}
            onSave={async () => {
              await fetchDashboard();
              setEditingTableId(null);
            }}
            dashboardId={dashboardId}
          />
        )}
      </div>
    </main>
    </>
  );
}


