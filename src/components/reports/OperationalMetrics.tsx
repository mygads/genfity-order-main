'use client';

import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface OperationalData {
  averagePrepTime: number; // in minutes
  peakHourEfficiency: number; // percentage
  tableTurnoverRate: number; // per day
  orderFulfillmentRate: number; // percentage
  hourlyPerformance: Array<{
    hour: number;
    efficiency: number; // 0-100
    orderCount: number;
  }>;
  performanceHeatmap?: Array<{
    name: string;
    data: number[];
  }>;
}

interface OperationalMetricsProps {
  data: OperationalData;
}

export default function OperationalMetrics({ data }: OperationalMetricsProps) {
  // Heatmap data - organize by day of week and hour
  const heatmapOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
    },
    plotOptions: {
      heatmap: {
        radius: 2,
        enableShades: true,
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 25, color: '#ef4444', name: 'Low' },
            { from: 26, to: 50, color: '#f59e0b', name: 'Medium' },
            { from: 51, to: 75, color: '#3b82f6', name: 'Good' },
            { from: 76, to: 100, color: '#10b981', name: 'Excellent' },
          ],
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: 'category',
      categories: [
        '00:00',
        '02:00',
        '04:00',
        '06:00',
        '08:00',
        '10:00',
        '12:00',
        '14:00',
        '16:00',
        '18:00',
        '20:00',
        '22:00',
      ],
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val.toFixed(0) + '% efficiency';
        },
      },
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '12px',
    },
  };

  // Sample heatmap data (in real app, this comes from API)
  const heatmapSeries = data.performanceHeatmap || [
    {
      name: 'Monday',
      data: [45, 52, 38, 65, 72, 85, 92, 88, 95, 90, 85, 68],
    },
    {
      name: 'Tuesday',
      data: [48, 50, 42, 68, 75, 88, 95, 90, 92, 88, 82, 65],
    },
    {
      name: 'Wednesday',
      data: [50, 55, 45, 70, 78, 90, 96, 92, 94, 90, 85, 70],
    },
    {
      name: 'Thursday',
      data: [52, 58, 48, 72, 80, 92, 98, 95, 96, 92, 88, 72],
    },
    {
      name: 'Friday',
      data: [55, 60, 50, 75, 82, 94, 100, 98, 98, 95, 90, 75],
    },
    {
      name: 'Saturday',
      data: [58, 62, 52, 78, 85, 96, 100, 100, 100, 98, 92, 78],
    },
    {
      name: 'Sunday',
      data: [50, 55, 45, 70, 75, 88, 95, 92, 95, 90, 85, 70],
    },
  ];

  // Gauge chart for efficiency score
  const getEfficiencyColor = (score: number) => {
    if (score >= 90) return 'text-success-600 dark:text-success-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  const getEfficiencyBgColor = (score: number) => {
    if (score >= 90) return 'bg-success-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-warning-500';
    return 'bg-error-500';
  };

  return (
    <div className="space-y-6">
      {/* Key Operational Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Average Prep Time */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Avg. Prep Time
          </div>
          <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90">
            {data.averagePrepTime.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">minutes</div>
        </div>

        {/* Peak Hour Efficiency */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Peak Hour Efficiency
          </div>
          <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90">
            {data.peakHourEfficiency.toFixed(1)}%
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full transition-all ${getEfficiencyBgColor(data.peakHourEfficiency)}`}
              style={{ width: `${data.peakHourEfficiency}%` }}
            />
          </div>
        </div>

        {/* Table Turnover Rate */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Table Turnover Rate
          </div>
          <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90">
            {data.tableTurnoverRate.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">per day</div>
        </div>

        {/* Order Fulfillment Rate */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Fulfillment Rate
          </div>
          <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90">
            {data.orderFulfillmentRate.toFixed(1)}%
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full transition-all ${getEfficiencyBgColor(data.orderFulfillmentRate)}`}
              style={{ width: `${data.orderFulfillmentRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Performance Heatmap */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
          Performance Heatmap
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Operational efficiency by day and hour
        </p>
        <ReactApexChart
          options={heatmapOptions}
          series={heatmapSeries}
          type="heatmap"
          height={320}
        />
      </div>

      {/* Hourly Performance Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
          Hourly Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Hour
                </th>
                <th className="pb-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Orders
                </th>
                <th className="pb-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Efficiency
                </th>
                <th className="pb-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {data.hourlyPerformance.filter((item) => item.orderCount > 0).slice(0, 10).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 text-sm text-gray-800 dark:text-white/90">
                    {item.hour.toString().padStart(2, '0')}:00
                  </td>
                  <td className="py-3 text-sm text-gray-800 dark:text-white/90">
                    {item.orderCount}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className={`h-full transition-all ${getEfficiencyBgColor(item.efficiency)}`}
                          style={{ width: `${item.efficiency}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.efficiency.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs font-semibold ${getEfficiencyColor(item.efficiency)}`}
                    >
                      {item.efficiency >= 90
                        ? 'Excellent'
                        : item.efficiency >= 70
                          ? 'Good'
                          : item.efficiency >= 50
                            ? 'Medium'
                            : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.hourlyPerformance.filter((item) => item.orderCount > 0).length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No orders in selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
