// MongoDB storage for dashboards with fallback to in-memory
import { getMongoDB, isMongoDBConfigured } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

async function getDashboardsCollection() {
  const database = await getMongoDB();
  return database.collection('dashboards');
}

interface Chart {
  id: string;
  chartType: string;
  xAxisKey: string;
  yAxisKey: string;
  chartData: any[];
  title: string;
  createdAt: string;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: {
    colors?: string[];
    showLegend?: boolean;
    [key: string]: any;
  };
}

interface Table {
  id: string;
  tableData: any[];
  columns: string[];
  title: string;
  maxRows: number;
  createdAt: string;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface Dashboard {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  charts: Chart[];
  tables: Table[];
}

interface MongoChart {
  id: string;
  chartType: string;
  xAxisKey: string;
  yAxisKey: string;
  chartData: any[];
  title: string;
  createdAt: Date;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: {
    colors?: string[];
    showLegend?: boolean;
    [key: string]: any;
  };
}

interface MongoTable {
  id: string;
  tableData: any[];
  columns: string[];
  title: string;
  maxRows: number;
  createdAt: Date;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface MongoDashboard {
  _id?: ObjectId;
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  charts: MongoChart[];
  tables: MongoTable[];
}

// Fallback in-memory storage (used when MongoDB is not configured)
let inMemoryDashboards: Dashboard[] = [];

function getInMemoryStore(): Dashboard[] {
  if (!global.__dashboardStore) {
    global.__dashboardStore = [];
  }
  return global.__dashboardStore;
}

declare global {
  var __dashboardStore: Dashboard[] | undefined;
}

/**
 * Convert MongoDB document to Dashboard interface
 */
function mongoToDashboard(doc: MongoDashboard): Dashboard {
  return {
    id: doc.id,
    userId: doc.userId,
    name: doc.name,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    charts: (doc.charts || []).map((chart: any) => ({
      ...chart,
      createdAt: chart.createdAt instanceof Date ? chart.createdAt.toISOString() : chart.createdAt,
      layout: chart.layout || { x: 0, y: 0, w: 6, h: 4 },
      config: chart.config || {},
    })),
    tables: (doc.tables || []).map((table: any) => ({
      ...table,
      createdAt: table.createdAt instanceof Date ? table.createdAt.toISOString() : table.createdAt,
      layout: table.layout || { x: 0, y: 0, w: 6, h: 4 },
    })),
  };
}

export async function getDashboards(userId: string): Promise<Dashboard[]> {
  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    return getInMemoryStore().filter((d) => d.userId === userId);
  }

  try {
    const collection = await getDashboardsCollection();
    const dashboards = await collection.find({ userId }).toArray();
    return dashboards.map((doc: any) => mongoToDashboard(doc));
  } catch (error) {
    console.error('Error fetching dashboards from MongoDB, falling back to in-memory:', error);
    return getInMemoryStore().filter((d) => d.userId === userId);
  }
}

export async function getDashboard(id: string, userId: string): Promise<Dashboard | undefined> {
  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    return store.find((d) => d.id === id && d.userId === userId);
  }

  try {
    const collection = await getDashboardsCollection();
    const dashboard = await collection.findOne({ id, userId });
    if (!dashboard) {
      return undefined;
    }
    return mongoToDashboard(dashboard as MongoDashboard);
  } catch (error) {
    console.error('Error fetching dashboard from MongoDB, falling back to in-memory:', error);
    const store = getInMemoryStore();
    return store.find((d) => d.id === id && d.userId === userId);
  }
}

export async function createDashboard(name: string, userId: string): Promise<Dashboard> {
  const newDashboard: Dashboard = {
    id: Date.now().toString(),
    userId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    charts: [],
    tables: [],
  };

  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    store.push(newDashboard);
    return newDashboard;
  }

  try {
    const collection = await getDashboardsCollection();
    const mongoDashboard: MongoDashboard = {
      id: newDashboard.id,
      userId: newDashboard.userId,
      name: newDashboard.name,
      createdAt: new Date(newDashboard.createdAt),
      charts: newDashboard.charts,
      tables: newDashboard.tables,
    };

    await collection.insertOne(mongoDashboard);
    return newDashboard;
  } catch (error) {
    console.error('Error creating dashboard in MongoDB, falling back to in-memory:', error);
    const store = getInMemoryStore();
    store.push(newDashboard);
    return newDashboard;
  }
}

export async function deleteDashboard(id: string, userId: string): Promise<boolean> {
  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const index = store.findIndex((d) => d.id === id && d.userId === userId);
    if (index === -1) {
      return false;
    }
    store.splice(index, 1);
    return true;
  }

  try {
    const collection = await getDashboardsCollection();
    const result = await collection.deleteOne({ id, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting dashboard from MongoDB, falling back to in-memory:', error);
    const store = getInMemoryStore();
    const index = store.findIndex((d) => d.id === id && d.userId === userId);
    if (index === -1) {
      return false;
    }
    store.splice(index, 1);
    return true;
  }
}

export async function addChartToDashboard(dashboardId: string, chart: any, userId: string): Promise<boolean> {
  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return false;
    }
    if (!dashboard.charts) {
      dashboard.charts = [];
    }
    dashboard.charts.push(chart);
    return true;
  }

  try {
    const collection = await getDashboardsCollection();
    const result = await collection.updateOne(
      { id: dashboardId, userId },
      { $push: { charts: chart } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error adding chart to dashboard in MongoDB, falling back to in-memory:', error);
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return false;
    }
    if (!dashboard.charts) {
      dashboard.charts = [];
    }
    dashboard.charts.push(chart);
    return true;
  }
}

export async function addTableToDashboard(dashboardId: string, table: any, userId: string): Promise<boolean> {
  // Fallback to in-memory if MongoDB not configured
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return false;
    }
    if (!dashboard.tables) {
      dashboard.tables = [];
    }
    dashboard.tables.push(table);
    return true;
  }

  try {
    const collection = await getDashboardsCollection();
    const result = await collection.updateOne(
      { id: dashboardId, userId },
      { $push: { tables: table } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error adding table to dashboard in MongoDB, falling back to in-memory:', error);
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return false;
    }
    if (!dashboard.tables) {
      dashboard.tables = [];
    }
    dashboard.tables.push(table);
    return true;
  }
}

/**
 * Update dashboard layout
 */
export async function updateDashboardLayout(
  userId: string,
  dashboardId: string,
  layouts: { [key: string]: { x: number; y: number; w: number; h: number } }
): Promise<Dashboard | null> {
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return null;
    }

    // Update chart layouts
    dashboard.charts.forEach((chart: any) => {
      const key = `chart-${chart.id}`;
      if (layouts[key]) {
        chart.layout = layouts[key];
      }
    });

    // Update table layouts
    dashboard.tables.forEach((table: any) => {
      const key = `table-${table.id}`;
      if (layouts[key]) {
        table.layout = layouts[key];
      }
    });

    return dashboard;
  }

  try {
    const collection = await getDashboardsCollection();
    const dashboard = await collection.findOne({ id: dashboardId, userId });
    if (!dashboard) {
      return null;
    }

    // Update layouts in charts and tables
    const updatedCharts = dashboard.charts.map((chart: any) => {
      const key = `chart-${chart.id}`;
      if (layouts[key]) {
        return { ...chart, layout: layouts[key] };
      }
      return chart;
    });

    const updatedTables = dashboard.tables.map((table: any) => {
      const key = `table-${table.id}`;
      if (layouts[key]) {
        return { ...table, layout: layouts[key] };
      }
      return table;
    });

    await collection.updateOne(
      { id: dashboardId, userId },
      { $set: { charts: updatedCharts, tables: updatedTables } }
    );

    return await getDashboard(dashboardId, userId);
  } catch (error) {
    console.error('Error updating dashboard layout:', error);
    return null;
  }
}

/**
 * Update chart configuration
 */
export async function updateChartConfig(
  userId: string,
  dashboardId: string,
  chartId: string,
  config: Partial<Chart>
): Promise<Dashboard | null> {
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return null;
    }

    const chart = dashboard.charts.find((c: any) => c.id === chartId);
    if (!chart) {
      return null;
    }

    Object.assign(chart, config);
    return dashboard;
  }

  try {
    const collection = await getDashboardsCollection();
    const dashboard = await collection.findOne({ id: dashboardId, userId });
    if (!dashboard) {
      return null;
    }

    const chartIndex = dashboard.charts.findIndex((c: any) => c.id === chartId);
    if (chartIndex === -1) {
      return null;
    }

    const updatedCharts = [...dashboard.charts];
    updatedCharts[chartIndex] = { ...updatedCharts[chartIndex], ...config };

    await collection.updateOne(
      { id: dashboardId, userId },
      { $set: { charts: updatedCharts } }
    );

    return await getDashboard(dashboardId, userId);
  } catch (error) {
    console.error('Error updating chart config:', error);
    return null;
  }
}

/**
 * Update table configuration
 */
export async function updateTableConfig(
  userId: string,
  dashboardId: string,
  tableId: string,
  config: Partial<Table>
): Promise<Dashboard | null> {
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return null;
    }

    const table = dashboard.tables.find((t: any) => t.id === tableId);
    if (!table) {
      return null;
    }

    Object.assign(table, config);
    return dashboard;
  }

  try {
    const collection = await getDashboardsCollection();
    const dashboard = await collection.findOne({ id: dashboardId, userId });
    if (!dashboard) {
      return null;
    }

    const tableIndex = dashboard.tables.findIndex((t: any) => t.id === tableId);
    if (tableIndex === -1) {
      return null;
    }

    const updatedTables = [...dashboard.tables];
    updatedTables[tableIndex] = { ...updatedTables[tableIndex], ...config };

    await collection.updateOne(
      { id: dashboardId, userId },
      { $set: { tables: updatedTables } }
    );

    return await getDashboard(dashboardId, userId);
  } catch (error) {
    console.error('Error updating table config:', error);
    return null;
  }
}

/**
 * Duplicate a chart
 */
export async function duplicateChart(
  userId: string,
  dashboardId: string,
  chartId: string
): Promise<Dashboard | null> {
  const dashboard = await getDashboard(dashboardId, userId);
  if (!dashboard) {
    return null;
  }

  const chart = dashboard.charts.find((c) => c.id === chartId);
  if (!chart) {
    return null;
  }

  const newChart: Chart = {
    ...chart,
    id: Date.now().toString(),
    title: `${chart.title} (Copy)`,
    createdAt: new Date().toISOString(),
    layout: chart.layout ? {
      ...chart.layout,
      x: chart.layout.x + 1,
      y: chart.layout.y + 1,
    } : { x: 0, y: 0, w: 6, h: 4 },
  };

  const success = await addChartToDashboard(dashboardId, newChart, userId);
  return success ? await getDashboard(dashboardId, userId) : null;
}

/**
 * Duplicate a table
 */
export async function duplicateTable(
  userId: string,
  dashboardId: string,
  tableId: string
): Promise<Dashboard | null> {
  const dashboard = await getDashboard(dashboardId, userId);
  if (!dashboard) {
    return null;
  }

  const table = dashboard.tables.find((t) => t.id === tableId);
  if (!table) {
    return null;
  }

  const newTable: Table = {
    ...table,
    id: Date.now().toString(),
    title: `${table.title} (Copy)`,
    createdAt: new Date().toISOString(),
    layout: table.layout ? {
      ...table.layout,
      x: table.layout.x + 1,
      y: table.layout.y + 1,
    } : { x: 0, y: 0, w: 6, h: 4 },
  };

  const success = await addTableToDashboard(dashboardId, newTable, userId);
  return success ? await getDashboard(dashboardId, userId) : null;
}

/**
 * Rename dashboard
 */
export async function renameDashboard(
  userId: string,
  dashboardId: string,
  newName: string
): Promise<Dashboard | null> {
  if (!isMongoDBConfigured()) {
    const store = getInMemoryStore();
    const dashboard = store.find((d) => d.id === dashboardId && d.userId === userId);
    if (!dashboard) {
      return null;
    }
    dashboard.name = newName.trim();
    return dashboard;
  }

  try {
    const collection = await getDashboardsCollection();
    await collection.updateOne(
      { id: dashboardId, userId },
      { $set: { name: newName.trim() } }
    );
    return await getDashboard(dashboardId, userId);
  } catch (error) {
    console.error('Error renaming dashboard:', error);
    return null;
  }
}
