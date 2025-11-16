"use client";

import React from "react";
import LineChart from "@/components/charts/line/LineChart";

interface DailyRevenueData {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  grandTotal: number;
}

interface DailyRevenueChartProps {
  data: DailyRevenueData[];
  currency?: string;
}

/**
 * Daily Revenue Chart Component
 * Displays revenue trend over time using line chart
 */
export default function DailyRevenueChart({ 
  data
}: DailyRevenueChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const revenueData = data.map(item => ({
    label: formatDate(item.date),
    value: item.grandTotal,
  }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
      <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Daily Revenue Trend
      </h2>
      <LineChart
        data={revenueData}
        height={300}
        color="#465fff"
        title="Revenue"
      />
    </div>
  );
}
