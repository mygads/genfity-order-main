"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils/format";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaCheckCircle, FaClock, FaBan, FaUtensils, FaShoppingBag, FaTruck, FaStoreAlt } from "react-icons/fa";

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
  currency = "AUD" 
}: OrderBreakdownCardsProps) {
  const { t } = useTranslation();

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

  const normalizeOrderType = (type: string) => {
    const normalized = type?.trim().toUpperCase();
    return normalized || "OTHER";
  };

  const normalizedTypeBreakdown = typeBreakdown.reduce<OrderTypeItem[]>((acc, item) => {
    const normalizedType = normalizeOrderType(item.type);
    const existing = acc.find((entry) => entry.type === normalizedType);

    if (existing) {
      existing.count += item.count;
      existing.revenue += item.revenue;
    } else {
      acc.push({
        ...item,
        type: normalizedType,
      });
    }

    return acc;
  }, []);

  const totalStatusCount = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const totalTypeCount = normalizedTypeBreakdown.reduce((sum, item) => sum + item.count, 0);

  const statusIconMap: Record<string, React.ReactNode> = {
    COMPLETED: <FaCheckCircle className="text-success-600 dark:text-success-400" />,
    PENDING: <FaClock className="text-yellow-600 dark:text-yellow-400" />,
    ACCEPTED: <FaClock className="text-blue-600 dark:text-blue-400" />,
    IN_PROGRESS: <FaClock className="text-purple-600 dark:text-purple-400" />,
    READY: <FaClock className="text-indigo-600 dark:text-indigo-400" />,
    CANCELLED: <FaBan className="text-error-600 dark:text-error-400" />,
  };

  const orderTypeMeta = (type: string) => {
    switch (type) {
      case 'DINE_IN':
        return {
          label: t('admin.revenue.orderTypeDineIn'),
          icon: <FaUtensils className="text-brand-600 dark:text-brand-400" />,
          accent: 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20',
          text: 'text-brand-700 dark:text-brand-400',
          bar: 'bg-brand-500',
        };
      case 'TAKEAWAY':
        return {
          label: t('admin.revenue.orderTypeTakeaway'),
          icon: <FaShoppingBag className="text-amber-600 dark:text-amber-400" />,
          accent: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
          text: 'text-amber-800 dark:text-amber-300',
          bar: 'bg-amber-500',
        };
      case 'PICKUP':
        return {
          label: t('admin.revenue.orderTypePickup'),
          icon: <FaStoreAlt className="text-sky-600 dark:text-sky-400" />,
          accent: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20',
          text: 'text-sky-800 dark:text-sky-300',
          bar: 'bg-sky-500',
        };
      case 'DELIVERY':
        return {
          label: t('admin.revenue.orderTypeDelivery'),
          icon: <FaTruck className="text-emerald-600 dark:text-emerald-400" />,
          accent: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
          text: 'text-emerald-800 dark:text-emerald-300',
          bar: 'bg-emerald-500',
        };
      default:
        return {
          label: t('admin.revenue.orderTypeOther'),
          icon: <FaShoppingBag className="text-gray-500 dark:text-gray-300" />,
          accent: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-300',
          bar: 'bg-gray-500',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Order Status Breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t('admin.revenue.orderStatusBreakdown')}
          </h2>
          <span className="text-xs text-gray-500">{t('admin.revenue.totalOrders')}: {totalStatusCount}</span>
        </div>
        {statusBreakdown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.revenue.noOrderData')}
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
                      <div className={`flex items-center gap-2 font-semibold ${colorScheme.text}`}>
                        <span className="text-base">{statusIconMap[item.status] || statusIconMap.PENDING}</span>
                        <span>{t(`admin.revenue.status.${item.status}`) || item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {t('admin.revenue.percentageOfOrders', { value: percentage })}
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t('admin.revenue.orderTypeBreakdown')}
          </h2>
          <span className="text-xs text-gray-500">{t('admin.revenue.completedOrders')}: {totalTypeCount}</span>
        </div>
        {normalizedTypeBreakdown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.revenue.noOrderTypeData')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedTypeBreakdown.map((item) => {
              const percentage = totalTypeCount > 0 
                ? ((item.count / totalTypeCount) * 100).toFixed(1)
                : '0';
              const meta = orderTypeMeta(item.type);
              
              return (
                <div 
                  key={item.type}
                  className={`rounded-lg border p-4 ${meta.accent}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xl">
                          {meta.icon}
                        </div>
                        <div>
                          <div className={`text-lg font-semibold ${meta.text}`}>
                            {meta.label}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('admin.revenue.percentageOfCompleted', { value: percentage })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('admin.revenue.orders')}
                          </div>
                          <div className={`text-xl font-bold ${meta.text}`}>
                            {item.count}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('admin.revenue.revenue')}
                          </div>
                          <div className={`text-xl font-bold ${meta.text}`}>
                            {formatCurrency(item.revenue, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className={meta.bar}
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
