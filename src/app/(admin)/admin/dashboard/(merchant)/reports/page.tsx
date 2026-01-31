/**
 * Reports Page (Merchant Owner Only)
 * Route: /admin/dashboard/reports
 * Access: MERCHANT_OWNER only (staff cannot access)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopMenuItemsChart, HourlyDistributionChart } from '@/components/revenue';
import { ReportsPageSkeleton } from '@/components/common/SkeletonLoaders';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";
import AlertDialog from '@/components/modals/AlertDialog';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { formatCurrency } from '@/lib/utils/format';
import { FaChartBar, FaFileCsv, FaFileExcel, FaFilePdf } from 'react-icons/fa';
import IconToggle from '@/components/ui/IconToggle';
import { buildOrderApiUrl } from '@/lib/utils/orderApiClient';

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />,
});

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportSoonOpen, setExportSoonOpen] = useState(false);
  const [data, setData] = useState<{
    periodComparison?: {
      metrics: Array<{
        label: string;
        current: number;
        previous: number;
        format: 'currency' | 'number' | 'decimal';
      }>;
    };
    summary?: {
      totalRevenue: number;
      netRevenue: number;
      totalOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      completionRate: number;
      averageOrderValue: number;
      subtotal: number;
      totalDiscount: number;
      totalTax: number;
      totalServiceCharge: number;
      totalPackagingFee: number;
      totalDeliveryFee: number;
    };
    feesBreakdown?: {
      tax: number;
      serviceCharge: number;
      packagingFee: number;
      deliveryFee: number;
      discount: number;
    };
    voucherSummary?: {
      bySource: Array<{ source: string; count: number; amount: number }>;
      topTemplates: Array<{ label: string; count: number; amount: number }>;
    };
    orderTypeBreakdown?: Array<{ type: string; count: number; revenue: number }>;
    orderStatusBreakdown?: Array<{ status: string; count: number }>;
    paymentBreakdown?: Array<{ method: string; count: number; revenue: number }>;
    scheduledSummary?: { scheduledCount: number; scheduledRevenue: number };
    dailyRevenue?: Array<{ date: string; totalRevenue: number; totalOrders: number }>;
    anomalies?: Array<{ date: string; revenue: number; expected: number; deltaPct: number }>;
    anomalySettings?: { windowSize: number; stdDevMultiplier: number; minDropPct: number };
    topMenuItems?: Array<{ key: string; name: string; quantity: number; revenue: number }>;
    hourlyPerformance?: Array<{ hour: number; orderCount: number; efficiency: number; avgPrepTime?: number | null }>;
    merchant?: { currency: string; timezone?: string };
  } | null>(null);

  // Date range state (same as revenue page)
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [orderType, setOrderType] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [voucherSource, setVoucherSource] = useState('');
  const [scheduledOnly, setScheduledOnly] = useState(false);
  const [anomalyWindow, setAnomalyWindow] = useState(7);
  const [anomalyStdDev, setAnomalyStdDev] = useState(2);
  const [anomalyMinDropPct, setAnomalyMinDropPct] = useState(15);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presets, setPresets] = useState<Array<{ id: string; name: string; filters: Record<string, unknown> }>>([]);

  const presetsStorageKey = 'genfity_reports_presets';

  useEffect(() => {
    fetchReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, orderType, status, paymentMethod, voucherSource, scheduledOnly, anomalyWindow, anomalyStdDev, anomalyMinDropPct]);

  useEffect(() => {
    const stored = localStorage.getItem(presetsStorageKey);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch {
        setPresets([]);
      }
    }
  }, []);

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

      if (orderType) params.append('orderType', orderType);
      if (status) params.append('status', status);
      if (paymentMethod) params.append('paymentMethod', paymentMethod);
      if (voucherSource) params.append('voucherSource', voucherSource);
      if (scheduledOnly) params.append('scheduledOnly', 'true');
      params.append('anomalyWindow', String(anomalyWindow));
      params.append('anomalyStdDev', String(anomalyStdDev));
      params.append('anomalyMinDropPct', String(anomalyMinDropPct));

      const response = await fetch(buildOrderApiUrl(`/api/merchant/reports?${params}`), {
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
    setExportSoonOpen(true);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!data) return;
    const XLSX = await import('xlsx');

    const summaryRows = [
      [t('admin.reports.totalRevenue'), data.summary?.totalRevenue || 0],
      [t('admin.reports.netRevenue'), data.summary?.netRevenue || 0],
      [t('admin.reports.totalOrders'), data.summary?.totalOrders || 0],
      [t('admin.reports.averageOrderValue'), data.summary?.averageOrderValue || 0],
      [t('admin.reports.completionRate'), data.summary?.completionRate || 0],
      [t('admin.reports.totalFees'), totalFees],
      [t('admin.reports.totalDiscounts'), data.summary?.totalDiscount || 0],
    ];

    const dailyRows = (data.dailyRevenue || []).map((row) => ({
      date: row.date,
      revenue: row.totalRevenue,
      orders: row.totalOrders,
    }));

    const topItemsRows = (data.topMenuItems || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: item.revenue,
    }));

    const voucherRows = (data.voucherSummary?.bySource || []).map((item) => ({
      source: item.source,
      count: item.count,
      amount: item.amount,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily Revenue');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topItemsRows), 'Top Items');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(voucherRows), 'Vouchers');

    const filename = `reports_${startDate}_${endDate}.${format}`;

    if (format === 'xlsx') {
      XLSX.writeFile(wb, filename);
      return;
    }

    const csv = XLSX.utils.sheet_to_csv(wb.Sheets['Daily Revenue']);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const savePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const nextPreset = {
      id: `${Date.now()}`,
      name: trimmed,
      filters: {
        startDate,
        endDate,
        orderType,
        status,
        paymentMethod,
        voucherSource,
        scheduledOnly,
        anomalyWindow,
        anomalyStdDev,
        anomalyMinDropPct,
        alertsEnabled,
      },
    };
    const nextPresets = [...presets, nextPreset];
    setPresets(nextPresets);
    setPresetName('');
    localStorage.setItem(presetsStorageKey, JSON.stringify(nextPresets));
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    const filters = preset.filters as Record<string, any>;
    setStartDate(filters.startDate || startDate);
    setEndDate(filters.endDate || endDate);
    setOrderType(filters.orderType || '');
    setStatus(filters.status || '');
    setPaymentMethod(filters.paymentMethod || '');
    setVoucherSource(filters.voucherSource || '');
    setScheduledOnly(Boolean(filters.scheduledOnly));
    setAnomalyWindow(filters.anomalyWindow ?? 7);
    setAnomalyStdDev(filters.anomalyStdDev ?? 2);
    setAnomalyMinDropPct(filters.anomalyMinDropPct ?? 15);
    setAlertsEnabled(Boolean(filters.alertsEnabled));
  };

  const removePreset = (presetId: string) => {
    const nextPresets = presets.filter((item) => item.id !== presetId);
    setPresets(nextPresets);
    if (selectedPreset === presetId) {
      setSelectedPreset('');
    }
    localStorage.setItem(presetsStorageKey, JSON.stringify(nextPresets));
  };

  const currency = data?.merchant?.currency || 'AUD';
  const timezone = data?.merchant?.timezone || 'Asia/Jakarta';
  const formatMoney = (value: number) => formatCurrency(value, currency, 'en');
  const totalFees = data?.feesBreakdown
    ? (data.feesBreakdown.tax || 0)
      + (data.feesBreakdown.serviceCharge || 0)
      + (data.feesBreakdown.packagingFee || 0)
      + (data.feesBreakdown.deliveryFee || 0)
    : 0;

  if (loading) {
    return <ReportsPageSkeleton />;
  }

  const revenueTrendOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    colors: ['#f97316', '#3b82f6'],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data?.dailyRevenue?.map((d) => d.date) || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        labels: { formatter: (val: number) => Math.round(val).toString() },
      },
      {
        opposite: true,
        labels: { formatter: (val: number) => Math.round(val).toString() },
      },
    ],
    grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
    tooltip: {
      y: {
        formatter: (val: number, opts) => (opts.seriesIndex === 0 ? formatMoney(val) : `${Math.round(val)} orders`),
      },
    },
  };

  const feesBreakdownOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    colors: ['#3b82f6'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [
        t('admin.reports.feeTax'),
        t('admin.reports.feeService'),
        t('admin.reports.feePackaging'),
        t('admin.reports.feeDelivery'),
        t('admin.reports.discount'),
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { formatter: (val: number) => Math.round(val).toString() },
    },
    grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
    tooltip: { y: { formatter: (val: number) => formatMoney(val) } },
  };

  const voucherOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Outfit, sans-serif' },
    labels: data?.voucherSummary?.bySource.map((source) => source.source) || [],
    colors: ['#22c55e', '#a855f7', '#f97316', '#3b82f6'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
  };

  const formatStatusLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  const formatOrderTypeLabel = (value: string) => {
    switch (value) {
      case 'DINE_IN':
        return t('admin.reports.orderTypeDineIn');
      case 'TAKEAWAY':
        return t('admin.reports.orderTypeTakeaway');
      case 'DELIVERY':
        return t('admin.reports.orderTypeDelivery');
      case 'PICKUP':
        return t('admin.reports.orderTypePickup');
      default:
        return value;
    }
  };

  const orderStatusOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Outfit, sans-serif' },
    labels: data?.orderStatusBreakdown?.map((item) => formatStatusLabel(item.status)) || [],
    colors: ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#a855f7'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
  };

  const paymentOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Outfit, sans-serif' },
    labels: data?.paymentBreakdown?.map((item) => item.method) || [],
    colors: ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
  };

  return (
    <div className="space-y-6" data-tutorial="reports-page">
      <AlertDialog
        isOpen={exportSoonOpen}
        title={t("common.comingSoon") || "Coming soon"}
        message={t("admin.reports.exportPDFSoon")}
        variant="info"
        onClose={() => setExportSoonOpen(false)}
      />

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("admin.reports.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("admin.reports.subtitle")}
        </p>
      </div>

      {/* Date Range & Filters */}
      <div className="mb-6 flex flex-col gap-4" data-tutorial="reports-controls">
        <div className="flex flex-wrap items-center gap-3" data-tutorial="reports-date-filter">
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

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
            <span className="text-sm text-gray-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">{t('admin.reports.allOrderTypes')}</option>
            <option value="DINE_IN">{t('admin.reports.orderTypeDineIn')}</option>
            <option value="TAKEAWAY">{t('admin.reports.orderTypeTakeaway')}</option>
            <option value="DELIVERY">{t('admin.reports.orderTypeDelivery')}</option>
            <option value="PICKUP">{t('admin.reports.orderTypePickup')}</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">{t('admin.reports.allStatuses')}</option>
            <option value="COMPLETED">{t('admin.reports.statusCompleted')}</option>
            <option value="CANCELLED">{t('admin.reports.statusCancelled')}</option>
            <option value="PENDING">{t('admin.reports.statusPending')}</option>
            <option value="CONFIRMED">{t('admin.reports.statusConfirmed')}</option>
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">{t('admin.reports.allPaymentMethods')}</option>
            <option value="CASH">{t('admin.reports.paymentCash')}</option>
            <option value="CARD">{t('admin.reports.paymentCard')}</option>
            <option value="QRIS">{t('admin.reports.paymentQris')}</option>
            <option value="BANK_TRANSFER">{t('admin.reports.paymentBank')}</option>
          </select>

          <select
            value={voucherSource}
            onChange={(e) => setVoucherSource(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">{t('admin.reports.allVoucherSources')}</option>
            <option value="POS_VOUCHER">{t('admin.reports.voucherPos')}</option>
            <option value="CUSTOMER_VOUCHER">{t('admin.reports.voucherCustomer')}</option>
            <option value="MANUAL">{t('admin.reports.voucherManual')}</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={scheduledOnly}
              onChange={(e) => setScheduledOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
            />
            {t('admin.reports.scheduledOnly')}
          </label>

          <button
            onClick={handleExportPDF}
            disabled={!data}
            className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
            data-tutorial="reports-export-btn"
          >
            <FaFilePdf className="h-4 w-4" />
            {t('admin.reports.exportPDF')}
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={!data}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            <FaFileCsv className="h-4 w-4" />
            {t('admin.reports.exportCsv')}
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={!data}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            <FaFileExcel className="h-4 w-4" />
            {t('admin.reports.exportXlsx')}
          </button>
        </div>
      </div>

      {/* Presets & Alerts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.reports.presetsTitle')}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('admin.reports.presetNamePlaceholder')}
              className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
            <button
              onClick={savePreset}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
            >
              {t('admin.reports.savePreset')}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                applyPreset(e.target.value);
              }}
              className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="">{t('admin.reports.selectPreset')}</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
            <button
              onClick={() => removePreset(selectedPreset)}
              disabled={!selectedPreset}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
            >
              {t('admin.reports.deletePreset')}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.reports.anomalyRules')}</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-gray-500">{t('admin.reports.anomalyWindow')}</label>
              <input
                type="number"
                min={3}
                value={anomalyWindow}
                onChange={(e) => setAnomalyWindow(Number(e.target.value) || 7)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.reports.anomalyStdDev')}</label>
              <input
                type="number"
                step={0.5}
                min={0.5}
                value={anomalyStdDev}
                onChange={(e) => setAnomalyStdDev(Number(e.target.value) || 2)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('admin.reports.anomalyDrop')}</label>
              <input
                type="number"
                min={0}
                value={anomalyMinDropPct}
                onChange={(e) => setAnomalyMinDropPct(Number(e.target.value) || 15)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <IconToggle
                checked={alertsEnabled}
                onChange={setAlertsEnabled}
                label={t('admin.reports.enableAlerts')}
                size="sm"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t('admin.reports.anomalyHint')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.totalRevenue')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(data.summary?.totalRevenue || 0)}
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.netRevenue')}: {formatMoney(data.summary?.netRevenue || 0)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.totalOrders')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {data.summary?.totalOrders || 0}
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.completedOrders')}: {data.summary?.completedOrders || 0}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.averageOrderValue')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(data.summary?.averageOrderValue || 0)}
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.completionRate')}: {(data.summary?.completionRate || 0).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.totalFees')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(totalFees)}
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.totalDiscounts')}: {formatMoney(data.summary?.totalDiscount || 0)}</div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.cancellationRate')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {data.summary?.totalOrders ? ((data.summary.cancelledOrders / data.summary.totalOrders) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.cancelledOrders')}: {data.summary?.cancelledOrders || 0}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.scheduledRevenue')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(data.scheduledSummary?.scheduledRevenue || 0)}
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.scheduledOrders')}: {data.scheduledSummary?.scheduledCount || 0}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.reports.discountRate')}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {data.summary?.subtotal ? ((data.summary.totalDiscount / data.summary.subtotal) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-xs text-gray-500">{t('admin.reports.totalDiscounts')}: {formatMoney(data.summary?.totalDiscount || 0)}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.dailyRevenue')}</h3>
              <p className="text-xs text-gray-500">{t('admin.reports.timezoneLabel', { timezone })}</p>
              <ReactApexChart
                options={revenueTrendOptions}
                series={[
                  { name: t('admin.reports.revenueSeries'), data: data.dailyRevenue?.map((d) => d.totalRevenue) || [] },
                  { name: t('admin.reports.ordersSeries'), data: data.dailyRevenue?.map((d) => d.totalOrders) || [] },
                ]}
                type="line"
                height={300}
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.feesAndDiscounts')}</h3>
              <ReactApexChart
                options={feesBreakdownOptions}
                series={[{
                  name: t('admin.reports.feesSeries'),
                  data: [
                    data.feesBreakdown?.tax || 0,
                    data.feesBreakdown?.serviceCharge || 0,
                    data.feesBreakdown?.packagingFee || 0,
                    data.feesBreakdown?.deliveryFee || 0,
                    data.feesBreakdown?.discount || 0,
                  ],
                }]}
                type="bar"
                height={300}
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.voucherUsage')}</h3>
              {data.voucherSummary?.bySource?.length ? (
                <ReactApexChart
                  options={voucherOptions}
                  series={data.voucherSummary.bySource.map((item) => item.count)}
                  type="donut"
                  height={260}
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">
                  {t('admin.reports.noVoucherData')}
                </div>
              )}
              {data.voucherSummary?.topTemplates?.length ? (
                <div className="mt-4 space-y-2 text-sm">
                  {data.voucherSummary.topTemplates.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                      <span className="truncate">{item.label}</span>
                      <span className="font-medium">{formatMoney(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.orderStatus')}</h3>
              {data.orderStatusBreakdown?.length ? (
                <ReactApexChart
                  options={orderStatusOptions}
                  series={data.orderStatusBreakdown.map((item) => item.count)}
                  type="donut"
                  height={260}
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">
                  {t('admin.reports.noStatusData')}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.salesModes')}</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {data.orderTypeBreakdown?.map((item) => (
                  <div key={item.type} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{formatOrderTypeLabel(item.type)}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{item.count}</div>
                    <div className="text-xs text-gray-500">{formatMoney(item.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.paymentMix')}</h3>
            {data.paymentBreakdown?.length ? (
              <ReactApexChart
                options={paymentOptions}
                series={data.paymentBreakdown.map((item) => item.count)}
                type="donut"
                height={260}
              />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">
                {t('admin.reports.noPaymentData')}
              </div>
            )}
          </div>

          {/* Operational & Menu Performance */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.topMenuItems && (
              <TopMenuItemsChart
                data={data.topMenuItems.map((item) => ({
                  menuId: item.key,
                  menuName: item.name,
                  totalQuantity: item.quantity,
                  totalRevenue: item.revenue,
                }))}
                currency={currency}
              />
            )}

            {data.hourlyPerformance && (
              <HourlyDistributionChart
                data={data.hourlyPerformance.map((item) => ({
                  hour: item.hour,
                  orderCount: item.orderCount,
                  revenue: 0,
                }))}
              />
            )}
          </div>

          {/* Anomaly Detection */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.reports.anomalyDetection')}</h3>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{alertsEnabled ? t('admin.reports.alertsOn') : t('admin.reports.alertsOff')}</span>
              <span>{t('admin.reports.timezoneLabel', { timezone })}</span>
            </div>
            {data.anomalies && data.anomalies.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.anomalies.map((anomaly) => (
                  <div key={anomaly.date} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40">
                    <div>
                      <div className="font-medium">{anomaly.date}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-200">
                        {t('admin.reports.expected')}: {formatMoney(anomaly.expected)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(anomaly.revenue)}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-200">{anomaly.deltaPct.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">{t('admin.reports.noAnomalies')}</div>
            )}
          </div>
        </>
      )}

      {/* No Data State */}
      {!loading && !error && !data && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <FaChartBar className="mx-auto h-12 w-12 text-gray-400" />
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
