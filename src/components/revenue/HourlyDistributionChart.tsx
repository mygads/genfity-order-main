"use client";

import React from "react";
import BarChart from "@/components/charts/bar/BarChart";

interface HourlyData {
  hour: number;
  orderCount: number;
  revenue: number;
}

interface HourlyDistributionChartProps {
  data: HourlyData[];
  currency?: string;
}

/**
 * Hourly Distribution Chart Component
 * Shows peak hours for orders and revenue
 */
export default function HourlyDistributionChart({ 
  data, 
  currency = "Rp" 
}: HourlyDistributionChartProps) {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Fill missing hours with 0
  const fullDayData: HourlyData[] = [];
  for (let i = 0; i < 24; i++) {
    const existing = data.find(d => d.hour === i);
    fullDayData.push(existing || { hour: i, orderCount: 0, revenue: 0 });
  }

  const ordersChartData = fullDayData.map(item => ({
    label: formatHour(item.hour),
    value: item.orderCount,
  }));

  const revenueChartData = fullDayData.map(item => ({
    label: formatHour(item.hour),
    value: item.revenue,
  }));

  // Find peak hours
  const peakOrderHour = fullDayData.reduce((max, item) => 
    item.orderCount > max.orderCount ? item : max
  , fullDayData[0]);

  const peakRevenueHour = fullDayData.reduce((max, item) => 
    item.revenue > max.revenue ? item : max
  , fullDayData[0]);

  return (
    <div className="space-y-6">
      {/* Peak Hours Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Peak Order Hour
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatHour(peakOrderHour.hour)}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {peakOrderHour.orderCount} orders
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Peak Revenue Hour
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatHour(peakRevenueHour.hour)}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(peakRevenueHour.revenue)}
          </div>
        </div>
      </div>

      {/* Hourly Orders Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Orders by Hour
        </h2>
        {data.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No hourly data available
            </p>
          </div>
        ) : (
          <BarChart
            data={ordersChartData}
            height={300}
            color="#3b82f6"
            title="Orders"
          />
        )}
      </div>

      {/* Hourly Revenue Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Revenue by Hour
        </h2>
        {data.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No hourly data available
            </p>
          </div>
        ) : (
          <BarChart
            data={revenueChartData}
            height={300}
            color="#10b981"
            title="Revenue"
          />
        )}
      </div>
    </div>
  );
}
