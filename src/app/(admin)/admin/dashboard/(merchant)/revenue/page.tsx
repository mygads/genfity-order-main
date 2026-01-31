"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RevenueSummaryCards from "@/components/revenue/RevenueSummaryCards";
import DailyRevenueChart from "@/components/revenue/DailyRevenueChart";
import DailyRevenueTable from "@/components/revenue/DailyRevenueTable";
import OrderBreakdownCards from "@/components/revenue/OrderBreakdownCards";
import { RevenuePageSkeleton } from "@/components/common/SkeletonLoaders";
import { useMerchant } from "@/context/MerchantContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";
import { buildOrderApiUrl } from "@/lib/utils/orderApiClient";

interface RevenueAnalytics {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  merchant: {
    currency: string;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalServiceCharge: number;
    totalPackagingFee: number;
    grandTotal: number;
    averageOrderValue: number;
  };
  dailyRevenue: Array<{
    date: string;
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalServiceCharge: number;
    totalPackagingFee: number;
    grandTotal: number;
  }>;
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  orderTypeBreakdown: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  topMenuItems: Array<{
    menuId: string;
    menuName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    orderCount: number;
    revenue: number;
  }>;
}

/**
 * Merchant Revenue Analytics Page
 * Comprehensive revenue reporting with charts and breakdowns
 */
export default function MerchantRevenuePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { merchant: _merchant } = useMerchant();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);

  // Date range state
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(buildOrderApiUrl(`/api/merchant/revenue?${params}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch revenue analytics");
      }

      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      } else {
        throw new Error(result.message || "Failed to load analytics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Revenue fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Show contextual hint on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.revenueFirstVisit);
      // Show click hint for export button after delay
      const timer = setTimeout(() => {
        showClickHint(CLICK_HINTS.exportRevenueButton);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, showHint, showClickHint]);

  const handleExportCSV = () => {
    if (!analytics) return;

    const csvRows = [
      ['Date', 'Orders', 'Revenue', 'Tax', 'Service Charge', 'Packaging Fee', 'Grand Total'],
      ...analytics.dailyRevenue.map(row => [
        row.date,
        row.totalOrders.toString(),
        row.totalRevenue.toString(),
        row.totalTax.toString(),
        (row.totalServiceCharge || 0).toString(),
        (row.totalPackagingFee || 0).toString(),
        row.grandTotal.toString(),
      ]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <RevenuePageSkeleton />;
  }

  return (
    <div data-tutorial="revenue-page">
      <PageBreadcrumb pageTitle={t("admin.revenue.title")} />

      {/* Date Range & Export */}
      <div className="mb-6 flex items-center justify-between" data-tutorial="revenue-controls">
        <div className="flex items-center gap-3" data-tutorial="revenue-date-filter">
          <select
            value={`${startDate}|${endDate}`}
            onChange={(e) => {
              const [start, end] = e.target.value.split('|');
              if (start && end) {
                setStartDate(start);
                setEndDate(end);
              }
            }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value={`${(() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              return d.toISOString().split('T')[0];
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.revenue.last7Days")}</option>
            <option value={`${(() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              return d.toISOString().split('T')[0];
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.revenue.last30Days")}</option>
            <option value={`${(() => {
              const d = new Date();
              d.setDate(d.getDate() - 90);
              return d.toISOString().split('T')[0];
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.revenue.last90Days")}</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCSV}
          disabled={!analytics || analytics.dailyRevenue.length === 0}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          data-tutorial="revenue-export-btn"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("admin.revenue.exportCSV")}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="mb-6">
            <RevenueSummaryCards
              summary={analytics.summary}
              currency={analytics.merchant?.currency || 'AUD'}
            />
          </div>

          {/* Charts Section */}
          <div className="mb-6">
            {/* Daily Revenue Chart */}
            <DailyRevenueChart
              data={analytics.dailyRevenue}
              currency={analytics.merchant?.currency || 'AUD'}
            />
          </div>

          {/* Order Breakdowns */}
          <div className="mb-6">
            <OrderBreakdownCards
              statusBreakdown={analytics.orderStatusBreakdown}
              typeBreakdown={analytics.orderTypeBreakdown}
            />
          </div>

          {/* Daily Revenue Table */}
          <DailyRevenueTable
            data={analytics.dailyRevenue}
            currency={analytics.merchant?.currency || 'AUD'}
          />
        </>
      )}

      {/* No Data State */}
      {!loading && !error && (!analytics || analytics.dailyRevenue.length === 0) && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("admin.revenue.noData")}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.revenue.noDataDesc")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
