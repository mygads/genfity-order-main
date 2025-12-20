/**
 * Order Stats Cards Component
 * 
 * Displays key order and payment statistics in card format.
 * Shows total orders, revenue, pending payments, and completed orders.
 */

'use client';

import React from 'react';
import { FaShoppingCart, FaDollarSign, FaClock, FaCheckCircle } from 'react-icons/fa';

// ===== TYPES =====

interface OrderStatsCardsProps {
  statistics: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    averageOrderValue: number;
  };
  paymentStats: {
    totalRevenue: number;
    completedPayments: number;
    pendingPayments: number;
  };
  loading?: boolean;
  currency?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

// ===== STAT CARD =====

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
    green: {
      bg: 'bg-success-100 dark:bg-success-900/20',
      icon: 'text-success-600 dark:text-success-400',
      border: 'border-success-200 dark:border-success-800',
    },
    yellow: {
      bg: 'bg-warning-100 dark:bg-warning-900/20',
      icon: 'text-warning-600 dark:text-warning-400',
      border: 'border-warning-200 dark:border-warning-800',
    },
    purple: {
      bg: 'bg-brand-100 dark:bg-brand-900/20',
      icon: 'text-brand-600 dark:text-brand-400',
      border: 'border-brand-200 dark:border-brand-800',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`rounded-xl border ${colors.border} bg-white dark:bg-white/[0.03] p-6 shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90 mb-1">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">vs last period</span>
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}>
          <div className={`text-xl ${colors.icon}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

// ===== LOADING SKELETON =====

const StatCardSkeleton = () => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-1"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
      </div>
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
    </div>
  </div>
);

// ===== MAIN COMPONENT =====

export const OrderStatsCards: React.FC<OrderStatsCardsProps> = ({
  statistics,
  paymentStats,
  loading = false,
  currency = 'AUD',
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Free';
    return `A$${amount.toFixed(0)}`;
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Orders */}
      <StatCard
        title="Total Orders"
        value={formatNumber(statistics.totalOrders)}
        subtitle={`${statistics.pendingOrders} pending`}
        icon={<FaShoppingCart />}
        color="blue"
      />

      {/* Total Revenue */}
      <StatCard
        title="Total Revenue"
        value={formatCurrency(paymentStats.totalRevenue)}
        subtitle={`${paymentStats.completedPayments} completed payments`}
        icon={<FaDollarSign />}
        color="green"
      />

      {/* Pending Payments */}
      <StatCard
        title="Pending Payments"
        value={formatNumber(paymentStats.pendingPayments)}
        subtitle="Awaiting payment"
        icon={<FaClock />}
        color="yellow"
      />

      {/* Completed Orders */}
      <StatCard
        title="Completed Orders"
        value={formatNumber(statistics.completedOrders)}
        subtitle={`Avg: ${formatCurrency(statistics.averageOrderValue)}`}
        icon={<FaCheckCircle />}
        color="purple"
      />
    </div>
  );
};

export default OrderStatsCards;
