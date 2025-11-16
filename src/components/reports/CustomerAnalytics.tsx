'use client';

import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface CustomerData {
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  averageLifetimeValue: number;
  churnRate: number;
}

interface CustomerAnalyticsProps {
  data: CustomerData;
}

export default function CustomerAnalytics({ data }: CustomerAnalyticsProps) {
  // Donut Chart Options
  const donutOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
    },
    colors: ['#465fff', '#94a3b8'],
    labels: ['Returning Customers', 'New Customers'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
      style: {
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 500,
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 700,
              formatter: function (val: string) {
                return val;
              },
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 500,
              formatter: function (w) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return total.toString();
              },
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      fontSize: '14px',
      fontWeight: 500,
      markers: {
        size: 8,
      },
      itemMargin: {
        horizontal: 12,
        vertical: 8,
      },
    },
    stroke: {
      width: 2,
      colors: ['#ffffff'],
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' customers';
        },
      },
    },
  };

  const donutSeries = [data.returningCustomers, data.newCustomers];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      {/* Header */}
      <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
        Customer Analytics
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer Segmentation Chart */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">
            Customer Segmentation
          </h3>
          <div className="flex justify-center">
            <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={280} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <h3 className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Key Metrics</h3>

          {/* Retention Rate */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/50 dark:bg-white/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Retention Rate
              </span>
              <span className="text-sm font-bold text-success-600 dark:text-success-400">
                {data.retentionRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full bg-success-500 transition-all"
                style={{ width: `${data.retentionRate}%` }}
              />
            </div>
          </div>

          {/* Average Lifetime Value */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/50 dark:bg-white/[0.02]">
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Avg. Customer Lifetime Value
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white/90">
              {formatCurrency(data.averageLifetimeValue)}
            </div>
          </div>

          {/* Churn Rate */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/50 dark:bg-white/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Churn Rate
              </span>
              <span className="text-sm font-bold text-error-600 dark:text-error-400">
                {data.churnRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full bg-error-500 transition-all"
                style={{ width: `${data.churnRate}%` }}
              />
            </div>
          </div>

          {/* Total Customers */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/50 dark:bg-white/[0.02]">
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Customers
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white/90">
              {(data.newCustomers + data.returningCustomers).toLocaleString('id-ID')}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {data.newCustomers.toLocaleString('id-ID')} new, {data.returningCustomers.toLocaleString('id-ID')} returning
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
