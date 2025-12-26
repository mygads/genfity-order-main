"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ActivityHeatmapDataPoint {
  dayOfWeek: number;
  hour: number;
  orderCount: number;
}

interface ActivityHeatmapProps {
  data: ActivityHeatmapDataPoint[];
  height?: number;
}

/**
 * Activity Heatmap Component
 * Displays merchant order activity by day of week and hour
 */
export default function ActivityHeatmap({ 
  data, 
  height = 350,
}: ActivityHeatmapProps) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format hour labels
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Transform data into heatmap format
  // ApexCharts heatmap expects: { x: category, y: value }
  // We need to create series for each day, with data points for each hour
  const transformData = () => {
    // Find max value for color scaling
    const maxCount = Math.max(...data.map(d => d.orderCount), 1);
    
    // Create series for each day
    const series = daysOfWeek.map((day, dayIndex) => {
      const dayData = [];
      // Only show business hours (6am to 11pm) for cleaner display
      for (let hour = 6; hour <= 23; hour++) {
        const point = data.find(d => d.dayOfWeek === dayIndex && d.hour === hour);
        dayData.push({
          x: formatHour(hour),
          y: point?.orderCount || 0,
        });
      }
      return {
        name: day,
        data: dayData,
      };
    });
    
    return { series, maxCount };
  };

  const { series, maxCount } = transformData();

  // Color ranges based on order count
  const getColorRanges = () => {
    const step = maxCount / 5;
    return [
      { from: 0, to: 0, color: '#f3f4f6', name: 'No orders' },
      { from: 1, to: Math.ceil(step), color: '#dbeafe', name: 'Low' },
      { from: Math.ceil(step) + 1, to: Math.ceil(step * 2), color: '#93c5fd', name: 'Medium-Low' },
      { from: Math.ceil(step * 2) + 1, to: Math.ceil(step * 3), color: '#3b82f6', name: 'Medium' },
      { from: Math.ceil(step * 3) + 1, to: Math.ceil(step * 4), color: '#1d4ed8', name: 'Medium-High' },
      { from: Math.ceil(step * 4) + 1, to: maxCount + 10, color: '#1e3a8a', name: 'High' },
    ];
  };

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "heatmap",
      height: height,
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        colorScale: {
          ranges: getColorRanges(),
        },
      },
    },
    xaxis: {
      labels: {
        rotate: -45,
        style: {
          fontSize: '10px',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
        },
      },
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
    },
    tooltip: {
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const day = daysOfWeek[seriesIndex];
        const hour = w.globals.labels[dataPointIndex];
        const value = w.globals.series[seriesIndex][dataPointIndex];
        
        return `
          <div class="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div class="font-medium text-gray-900 dark:text-white">${day} at ${hour}</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">${value} orders</div>
          </div>
        `;
      },
    },
    grid: {
      show: true,
      borderColor: "#e5e7eb",
      padding: {
        left: 0,
        right: 0,
      },
    },
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
        No activity data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type="heatmap"
        height={height}
      />
    </div>
  );
}
