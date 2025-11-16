"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface LineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
  color?: string;
  title?: string;
}

export default function LineChart({ 
  data, 
  height = 300, 
  color = "#465fff",
  title 
}: LineChartProps) {
  const options: ApexOptions = {
    colors: [color],
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
      width: 3,
      curve: "smooth",
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 5,
      colors: [color],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    xaxis: {
      categories: data.map(item => item.label),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        rotate: -45,
        rotateAlways: data.length > 12,
        style: {
          fontSize: '10px',
        },
      },
    },
    yaxis: {
      title: {
        text: undefined,
      },
      labels: {
        formatter: (val: number) => {
          // Format large numbers
          if (val >= 1000000) {
            return `${(val / 1000000).toFixed(1)}M`;
          } else if (val >= 1000) {
            return `${(val / 1000).toFixed(1)}K`;
          }
          return `${Math.round(val)}`;
        },
      },
    },
    legend: {
      show: false,
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
    },
    tooltip: {
      x: {
        show: true,
      },
      y: {
        formatter: (val: number) => {
          // Format large numbers
          if (val >= 1000000) {
            return `${(val / 1000000).toFixed(2)}M`;
          } else if (val >= 1000) {
            return `${(val / 1000).toFixed(1)}K`;
          }
          return `${val}`;
        },
      },
    },
  };

  const series = [
    {
      name: title || "Growth",
      data: data.map(item => item.value),
    },
  ];

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
