"use client";

import React from "react";

interface DailyRevenueData {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  grandTotal: number;
}

interface DailyRevenueTableProps {
  data: DailyRevenueData[];
  currency?: string;
}

/**
 * Daily Revenue Table Component
 * Displays detailed daily breakdown in table format
 */
export default function DailyRevenueTable({ 
  data, 
  currency = "AUD" 
}: DailyRevenueTableProps) {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalOrders: acc.totalOrders + item.totalOrders,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalTax: acc.totalTax + item.totalTax,
      grandTotal: acc.grandTotal + item.grandTotal,
    }),
    { totalOrders: 0, totalRevenue: 0, totalTax: 0, grandTotal: 0 }
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
      <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Daily Revenue Breakdown
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
              <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                Date
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                Orders
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                Revenue
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                Tax
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                Grand Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No revenue data available for this period
                  </p>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr 
                  key={index} 
                  className="text-gray-800 transition-colors hover:bg-gray-50 dark:text-white/90 dark:hover:bg-gray-900/30"
                >
                  <td className="px-6 py-4 font-medium">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {item.totalOrders}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {formatCurrency(item.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 font-medium text-warning-700 dark:text-warning-400">
                    {formatCurrency(item.totalTax)}
                  </td>
                  <td className="px-6 py-4 font-bold text-success-700 dark:text-success-400">
                    {formatCurrency(item.grandTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-bold text-gray-900 dark:bg-gray-900/70 dark:text-white/90">
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white">
                    {totals.totalOrders}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {formatCurrency(totals.totalRevenue)}
                </td>
                <td className="px-6 py-4 text-warning-700 dark:text-warning-400">
                  {formatCurrency(totals.totalTax)}
                </td>
                <td className="px-6 py-4 text-success-700 dark:text-success-400">
                  {formatCurrency(totals.grandTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
