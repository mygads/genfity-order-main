"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  height?: number;
  currency?: string;
  showOrders?: boolean;
}

/**
 * Revenue Chart Component
 * Displays revenue and order count over time as a dual-axis line chart
 */
export default function RevenueChart({ 
  data, 
  height = 350, 
  currency = "AUD",
  showOrders = true,
}: RevenueChartProps) {
  // Format dates for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    // For data within last 60 days, show short date
    if (daysDiff <= 60) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    // For older data (monthly), show month/year
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Format currency for display
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${currency} ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currency} ${(value / 1000).toFixed(1)}K`;
    }
    return `${currency} ${value.toFixed(0)}`;
  };

  const options: ApexOptions = {
    colors: ["#465fff", "#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height: height,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      width: [3, 2],
      curve: "smooth",
      dashArray: [0, 5],
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: [4, 0],
      colors: ["#465fff", "#10b981"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    xaxis: {
      categories: data.map(item => formatDate(item.date)),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        rotate: -45,
        rotateAlways: data.length > 14,
        style: {
          fontSize: '10px',
        },
        // Show every nth label to prevent overcrowding
        hideOverlappingLabels: true,
      },
      tickAmount: Math.min(data.length, 12),
    },
    yaxis: showOrders ? [
      {
        title: {
          text: "Revenue",
          style: {
            fontSize: '12px',
            fontWeight: 500,
            color: "#465fff",
          },
        },
        labels: {
          formatter: (val: number) => formatCurrency(val),
          style: {
            colors: "#465fff",
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Orders",
          style: {
            fontSize: '12px',
            fontWeight: 500,
            color: "#10b981",
          },
        },
        labels: {
          formatter: (val: number) => `${Math.round(val)}`,
          style: {
            colors: "#10b981",
          },
        },
      },
    ] : [
      {
        title: {
          text: "Revenue",
          style: {
            fontSize: '12px',
            fontWeight: 500,
          },
        },
        labels: {
          formatter: (val: number) => formatCurrency(val),
        },
      },
    ],
    legend: {
      show: showOrders,
      position: "top",
      horizontalAlign: "right",
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
      borderColor: "#e5e7eb",
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        formatter: (val, opts) => {
          if (data[opts.dataPointIndex]) {
            const date = new Date(data[opts.dataPointIndex].date);
            return date.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
          }
          return '';
        },
      },
      y: {
        formatter: (val: number, opts) => {
          if (opts.seriesIndex === 0) {
            return formatCurrency(val);
          }
          return `${Math.round(val)} orders`;
        },
      },
    },
  };

  const series = showOrders ? [
    {
      name: "Revenue",
      type: "line",
      data: data.map(item => item.revenue),
    },
    {
      name: "Orders",
      type: "line",
      data: data.map(item => item.orderCount),
    },
  ] : [
    {
      name: "Revenue",
      type: "line",
      data: data.map(item => item.revenue),
    },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
        No revenue data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type="line"
        height={height}
      />
    </div>
  );
}
