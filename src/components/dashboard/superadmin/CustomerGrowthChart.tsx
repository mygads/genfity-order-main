"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface CustomerGrowthDataPoint {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

interface CustomerGrowthChartProps {
  data: CustomerGrowthDataPoint[];
  height?: number;
  showTotal?: boolean;
}

/**
 * Customer Growth Chart Component
 * Displays new customer registrations over time with optional cumulative total
 */
export default function CustomerGrowthChart({ 
  data, 
  height = 350,
  showTotal = true,
}: CustomerGrowthChartProps) {
  // Format dates for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const options: ApexOptions = {
    colors: ["#8b5cf6", "#06b6d4"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: height,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      stacked: false,
    },
    stroke: {
      width: [2, 3],
      curve: "smooth",
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
      hover: {
        size: 5,
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
        hideOverlappingLabels: true,
      },
      tickAmount: Math.min(data.length, 12),
    },
    yaxis: showTotal ? [
      {
        title: {
          text: "New Customers",
          style: {
            fontSize: '12px',
            fontWeight: 500,
            color: "#8b5cf6",
          },
        },
        labels: {
          formatter: (val: number) => `${Math.round(val)}`,
          style: {
            colors: "#8b5cf6",
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Total Customers",
          style: {
            fontSize: '12px',
            fontWeight: 500,
            color: "#06b6d4",
          },
        },
        labels: {
          formatter: (val: number) => {
            if (val >= 1000) {
              return `${(val / 1000).toFixed(1)}K`;
            }
            return `${Math.round(val)}`;
          },
          style: {
            colors: "#06b6d4",
          },
        },
      },
    ] : [
      {
        title: {
          text: "New Customers",
          style: {
            fontSize: '12px',
            fontWeight: 500,
          },
        },
        labels: {
          formatter: (val: number) => `${Math.round(val)}`,
        },
      },
    ],
    legend: {
      show: showTotal,
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
            return `${Math.round(val)} new`;
          }
          return `${Math.round(val)} total`;
        },
      },
    },
  };

  const series = showTotal ? [
    {
      name: "New Customers",
      type: "area",
      data: data.map(item => item.newCustomers),
    },
    {
      name: "Total Customers",
      type: "line",
      data: data.map(item => item.totalCustomers),
    },
  ] : [
    {
      name: "New Customers",
      type: "area",
      data: data.map(item => item.newCustomers),
    },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
        No customer data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={height}
      />
    </div>
  );
}
