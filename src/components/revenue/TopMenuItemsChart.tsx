"use client";

import React from "react";
import BarChart from "@/components/charts/bar/BarChart";

interface TopMenuItem {
  menuId: string;
  menuName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface TopMenuItemsChartProps {
  data: TopMenuItem[];
  currency?: string;
}

/**
 * Top Menu Items Chart Component
 * Displays best-selling items by revenue
 */
export default function TopMenuItemsChart({ 
  data, 
  currency = "AUD" 
}: TopMenuItemsChartProps) {
  const formatCurrency = (amount: number) => {
    if (currency === "AUD") {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    // Fallback for other currencies
    return `${currency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const chartData = data.map(item => ({
    label: item.menuName.length > 20 
      ? item.menuName.substring(0, 20) + '...' 
      : item.menuName,
    value: item.totalRevenue,
  }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
      <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Top Selling Menu Items
      </h2>
      <div>
        {data.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No menu items data available
            </p>
          </div>
        ) : (
          <>
            <BarChart
              data={chartData}
              height={400}
              color="#10b981"
              title="Revenue"
            />
            
            {/* Detailed List */}
            <div className="mt-6 space-y-3">
              {data.map((item, index) => (
                <div 
                  key={item.menuId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white/90">
                        {item.menuName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.totalQuantity} sold
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-success-700 dark:text-success-400">
                      {formatCurrency(item.totalRevenue)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Avg: {formatCurrency(item.totalRevenue / item.totalQuantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
