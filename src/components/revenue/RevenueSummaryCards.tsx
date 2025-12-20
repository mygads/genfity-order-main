"use client";

import React from "react";

interface RevenueSummary {
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalServiceCharge?: number;
  totalPackagingFee?: number;
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
  currency = "AUD"
}: RevenueSummaryCardsProps) {
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

  const cards = [
    {
      title: "Total Orders",
      value: summary.totalOrders.toLocaleString('en-US'),
      subtitle: "Completed orders",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
      subtitle: "Before fees & tax",
    },
    {
      title: "Total Tax",
      value: formatCurrency(summary.totalTax),
      subtitle: "Tax collected",
    },
    ...(summary.totalServiceCharge && summary.totalServiceCharge > 0 ? [{
      title: "Service Charge",
      value: formatCurrency(summary.totalServiceCharge),
      subtitle: "Service fees",
    }] : []),
    ...(summary.totalPackagingFee && summary.totalPackagingFee > 0 ? [{
      title: "Packaging Fee",
      value: formatCurrency(summary.totalPackagingFee),
      subtitle: "Takeaway packaging",
    }] : []),
    {
      title: "Grand Total",
      value: formatCurrency(summary.grandTotal),
      subtitle: "All income",
    },
    {
      title: "Avg Order Value",
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
