/**
 * Reports Page (Merchant Owner Only)
 * Route: /admin/dashboard/reports
 * Access: MERCHANT_OWNER only (staff cannot access)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PeriodComparison, CustomerAnalytics, OperationalMetrics } from '@/components/reports';
import { TopMenuItemsChart, HourlyDistributionChart } from '@/components/revenue';
import { ReportsPageSkeleton } from '@/components/common/SkeletonLoaders';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    periodComparison?: {
      metrics: Array<{
        label: string;
        current: number;
        previous: number;
        format: 'currency' | 'number' | 'decimal';
      }>;
    };
    customerAnalytics?: {
      newCustomers: number;
      returningCustomers: number;
      retentionRate: number;
      averageLifetimeValue: number;
      churnRate: number;
    };
    operationalMetrics?: {
      averagePrepTime: number;
      peakHourEfficiency: number;
      tableTurnoverRate: number;
      orderFulfillmentRate: number;
      hourlyPerformance: Array<{ hour: number; orderCount: number; efficiency: number }>;
    };
    topMenuItems?: Array<{ menuItemId: number; name: string; quantitySold: number; totalRevenue: number }>;
    merchant?: { currency: string };
  } | null>(null);

  // Date range state (same as revenue page)
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Show contextual hint on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.exportReportsTip);
      // Show click hint for export button after delay
      const timer = setTimeout(() => {
        showClickHint(CLICK_HINTS.exportReportsButton);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, showHint, showClickHint]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
        period: 'custom',
      });

      const response = await fetch(`/api/merchant/reports?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch reports data');
      }

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert(t("admin.reports.exportPDFSoon"));
  };

  if (loading) {
    return <ReportsPageSkeleton />;
  }

  return (
    <div className="space-y-6" data-tutorial="reports-page">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("admin.reports.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("admin.reports.subtitle")}
        </p>
      </div>

      {/* Date Range & Export */}
      <div className="mb-6 flex items-center justify-between" data-tutorial="reports-controls">
        <div className="flex items-center gap-3" data-tutorial="reports-date-filter">
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
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.reports.last7Days")}</option>
            <option value={`${(() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              return d.toISOString().split('T')[0];
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.reports.last30Days")}</option>
            <option value={`${(() => {
              const d = new Date();
              d.setDate(d.getDate() - 90);
              return d.toISOString().split('T')[0];
            })()}|${new Date().toISOString().split('T')[0]}`}>{t("admin.reports.last90Days")}</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportPDF}
          disabled={!data}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          data-tutorial="reports-export-btn"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("admin.reports.exportPDF")}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Period Comparison */}
          <div className="mb-6">
            {data.periodComparison && (
              <PeriodComparison
                comparisonMode="custom"
                metrics={data.periodComparison.metrics}
                currency={data.merchant?.currency || 'AUD'}
              />
            )}
          </div>

          {/* Customer Analytics */}
          <div className="mb-6">
            {data.customerAnalytics && <CustomerAnalytics data={data.customerAnalytics} />}
          </div>

          {/* Operational Metrics */}
          <div className="mb-6">
            {data.operationalMetrics && <OperationalMetrics data={data.operationalMetrics} />}
          </div>

          {/* Top Menu Items & Hourly Distribution */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Menu Items */}
            {data.topMenuItems && (
              <TopMenuItemsChart
                data={data.topMenuItems.map((item) => ({
                  menuId: item.menuItemId.toString(),
                  menuName: item.name,
                  totalQuantity: item.quantitySold,
                  totalRevenue: item.totalRevenue,
                }))}
                currency={data.merchant?.currency || 'AUD'}
              />
            )}

            {/* Hourly Distribution */}
            {data.operationalMetrics?.hourlyPerformance && (
              <HourlyDistributionChart
                data={data.operationalMetrics.hourlyPerformance.map((item) => ({
                  hour: item.hour,
                  orderCount: item.orderCount,
                  revenue: 0,
                }))}
              />
            )}
          </div>
        </>
      )}

      {/* No Data State */}
      {!loading && !error && !data && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("admin.reports.noData")}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.reports.noDataDesc")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
