'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartDisplayProps {
  chartData: any[];
  config: {
    xAxisKey: string;
    yAxisKey: string | string[];
    chartType: string;
    title?: string;
  };
  showTitle?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ChartDisplay({ chartData, config, showTitle = true }: ChartDisplayProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-600 text-center text-sm">No chart data available.</p>
      </div>
    );
  }

  const yAxisKeys = Array.isArray(config.yAxisKey) ? config.yAxisKey : [config.yAxisKey];

  const renderChart = () => {
    switch (config.chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
              />
            ))}
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yAxisKeys.map((key, idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis dataKey={yAxisKeys[0]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter dataKey={yAxisKeys[0]} fill={COLORS[0]} />
          </ScatterChart>
        );

      default:
        return <p className="text-gray-600">Unsupported chart type</p>;
    }
  };

  return (
    <div className="w-full">
      {showTitle && (
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {config.title || `${config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)} Chart`}
        </h2>
      )}
      <div className="w-full" style={{ height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

