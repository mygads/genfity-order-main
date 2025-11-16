"use client";

import React from "react";

interface OrderStatusItem {
  status: string;
  count: number;
}

interface OrderTypeItem {
  type: string;
  count: number;
  revenue: number;
}

interface OrderBreakdownCardsProps {
  statusBreakdown: OrderStatusItem[];
  typeBreakdown: OrderTypeItem[];
  currency?: string;
}

/**
 * Order Breakdown Cards Component
 * Displays order status and type distribution
 */
export default function OrderBreakdownCards({ 
  statusBreakdown,
  typeBreakdown,
  currency = "Rp" 
}: OrderBreakdownCardsProps) {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    PENDING: { 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20', 
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    ACCEPTED: { 
      bg: 'bg-blue-50 dark:bg-blue-900/20', 
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    IN_PROGRESS: { 
      bg: 'bg-purple-50 dark:bg-purple-900/20', 
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    },
    READY: { 
      bg: 'bg-indigo-50 dark:bg-indigo-900/20', 
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800'
    },
    COMPLETED: { 
      bg: 'bg-success-50 dark:bg-success-900/20', 
      text: 'text-success-700 dark:text-success-400',
      border: 'border-success-200 dark:border-success-800'
    },
    CANCELLED: { 
      bg: 'bg-error-50 dark:bg-error-900/20', 
      text: 'text-error-700 dark:text-error-400',
      border: 'border-error-200 dark:border-error-800'
    },
  };

  const totalStatusCount = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const totalTypeCount = typeBreakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Order Status Breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Order Status Breakdown
        </h2>
        {statusBreakdown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No order data available
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {statusBreakdown.map((item) => {
              const percentage = totalStatusCount > 0 
                ? ((item.count / totalStatusCount) * 100).toFixed(1)
                : '0';
              const colorScheme = statusColors[item.status] || statusColors.PENDING;
              
              return (
                <div 
                  key={item.status}
                  className={`rounded-lg border p-4 ${colorScheme.bg} ${colorScheme.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${colorScheme.text}`}>
                        {item.status.replace('_', ' ')}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {percentage}% of total orders
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${colorScheme.text}`}>
                      {item.count}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className={`h-full ${colorScheme.text.replace('text-', 'bg-')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Type Breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Order Type Breakdown
        </h2>
        {typeBreakdown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No order type data available
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {typeBreakdown.map((item) => {
              const percentage = totalTypeCount > 0 
                ? ((item.count / totalTypeCount) * 100).toFixed(1)
                : '0';
              const isDineIn = item.type === 'DINE_IN';
              
              return (
                <div 
                  key={item.type}
                  className={`rounded-lg border p-4 ${
                    isDineIn 
                      ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20'
                      : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl ${
                          isDineIn 
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {isDineIn ? '🍽️' : '🛍️'}
                        </div>
                        <div>
                          <div className={`text-lg font-semibold ${
                            isDineIn 
                              ? 'text-brand-700 dark:text-brand-400'
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {item.type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {percentage}% of completed orders
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Orders
                          </div>
                          <div className={`text-xl font-bold ${
                            isDineIn 
                              ? 'text-brand-700 dark:text-brand-400'
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {item.count}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Revenue
                          </div>
                          <div className={`text-xl font-bold ${
                            isDineIn 
                              ? 'text-brand-700 dark:text-brand-400'
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className={isDineIn ? 'bg-brand-500' : 'bg-orange-500'}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
