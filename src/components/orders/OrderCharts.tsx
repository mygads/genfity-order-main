/**
 * Order Charts Component
 * 
 * Displays revenue trends and popular items using recharts.
 * Includes responsive line chart for revenue and bar chart for popular items.
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ===== TYPES =====

interface RevenueByDate {
  date: string;
  revenue: number;
  orderCount: number;
}

interface PopularItem {
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface OrderChartsProps {
  revenueData: RevenueByDate[];
  popularItems: PopularItem[];
  currency?: string;
  loading?: boolean;
}

// ===== CUSTOM TOOLTIP =====

const CustomTooltip = ({ active, payload, currency = 'AUD' }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; currency?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 shadow-lg">
        {payload.map((entry: { color: string; name: string; value: number }, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {entry.name}:{' '}
              {entry.name.includes('Revenue')
                ? new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: currency,
                }).format(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ===== LOADING SKELETON =====

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-4"></div>
    <div className="h-80 bg-gray-100 dark:bg-gray-900 rounded-xl"></div>
  </div>
);

// ===== REVENUE CHART =====

interface RevenueChartProps {
  data: RevenueByDate[];
  currency: string;
  loading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  currency,
  loading = false,
}) => {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400 dark:text-gray-600">
        No revenue data available
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
    }),
    revenue: item.revenue,
    orders: item.orderCount,
  }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            name="Revenue"
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Orders"
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ===== POPULAR ITEMS CHART =====

interface PopularItemsChartProps {
  data: PopularItem[];
  currency: string;
  loading?: boolean;
}

export const PopularItemsChart: React.FC<PopularItemsChartProps> = ({
  data,
  currency,
  loading = false,
}) => {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400 dark:text-gray-600">
        No popular items data available
      </div>
    );
  }

  // Format data for chart (top 10 items)
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.menuName.length > 20 ? item.menuName.substring(0, 20) + '...' : item.menuName,
    quantity: item.quantity,
    revenue: item.revenue,
  }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Top 10 Popular Items
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            width={120}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey="quantity" fill="#8b5cf6" name="Quantity Sold" />
          <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ===== MAIN COMPONENT =====

export const OrderCharts: React.FC<OrderChartsProps> = ({
  revenueData,
  popularItems,
  currency = 'AUD',
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <RevenueChart data={revenueData} currency={currency} loading={loading} />
      </div>

      {/* Popular Items Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <PopularItemsChart data={popularItems} currency={currency} loading={loading} />
      </div>
    </div>
  );
};

export default OrderCharts;
