"use client";

import React from "react";

interface RevenueSummary {
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  grandTotal: number;
  averageOrderValue: number;
}

interface RevenueSummaryCardsProps {
  summary: RevenueSummary;
  currency?: string;
}

/**
 * Revenue Summary Cards Component - Clean Minimalist Design
 * Similar to Analytics page style
 */
export default function RevenueSummaryCards({ 
  summary, 
  currency = "Rp" 
}: RevenueSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const cards = [
    {
      title: "Total Orders",
      value: summary.totalOrders.toLocaleString('id-ID'),
      subtitle: "Completed orders",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
      subtitle: "Before tax",
    },
    {
      title: "Total Tax",
      value: formatCurrency(summary.totalTax),
      subtitle: "Tax collected",
    },
    {
      title: "Grand Total",
      value: formatCurrency(summary.grandTotal),
      subtitle: "Revenue + Tax",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(summary.averageOrderValue),
      subtitle: "Per order",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6"
        >
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {card.title}
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {card.value}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {card.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
}
