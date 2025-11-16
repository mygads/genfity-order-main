"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RevenueData {
  date: string;
  totalOrders: number;
  totalRevenue: string;
  totalTax: string;
  grandTotal: string;
}

interface TotalRevenue {
  totalOrders: number;
  totalRevenue: string;
  totalTax: string;
  grandTotal: string;
}

export default function MerchantRevenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [reportType, setReportType] = useState<"daily" | "total">("daily");
  const [dailyRevenue, setDailyRevenue] = useState<RevenueData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<TotalRevenue | null>(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/signin");
        return;
      }

      const response = await fetch(`/api/merchant/revenue?type=${reportType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch revenue");
      }

      const data = await response.json();

      if (reportType === "daily") {
        if (data.success && Array.isArray(data.data)) {
          setDailyRevenue(data.data);
        } else {
          setDailyRevenue([]);
        }
      } else {
        setTotalRevenue(data.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Revenue Reports</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and analyze your revenue data</p>
        </div>
        <div className="py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading revenue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Revenue Reports</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and analyze your revenue data</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-error-100 p-4 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Report Type Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setReportType("daily")}
          className={`h-11 rounded-lg px-6 font-medium transition-colors ${
            reportType === "daily"
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-gray-700"
          }`}
        >
          Daily Revenue
        </button>
        <button
          onClick={() => setReportType("total")}
          className={`h-11 rounded-lg px-6 font-medium transition-colors ${
            reportType === "total"
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-gray-700"
          }`}
        >
          Total Revenue
        </button>
      </div>

      {/* Content */}
      {reportType === "daily" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Daily Revenue Breakdown</h2>
          {dailyRevenue.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">No revenue data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">Orders</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">Revenue</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">Tax</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dailyRevenue.map((item, index) => (
                    <tr key={index} className="text-gray-800 dark:text-white/90">
                      <td className="px-4 py-3 font-medium">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3">{item.totalOrders}</td>
                      <td className="px-4 py-3">Rp {parseFloat(item.totalRevenue).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">Rp {parseFloat(item.totalTax).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 font-bold">Rp {parseFloat(item.grandTotal).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white/90">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3">
                      {dailyRevenue.reduce((sum, item) => sum + item.totalOrders, 0)}
                    </td>
                    <td className="px-4 py-3">
                      Rp {dailyRevenue
                        .reduce((sum, item) => sum + parseFloat(item.totalRevenue), 0)
                        .toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      Rp {dailyRevenue
                        .reduce((sum, item) => sum + parseFloat(item.totalTax), 0)
                        .toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      Rp {dailyRevenue
                        .reduce((sum, item) => sum + parseFloat(item.grandTotal), 0)
                        .toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Orders Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
              <svg className="fill-brand-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H11V6.15288C7.60771 6.57471 5 9.47967 5 13C5 16.866 8.13401 20 12 20C15.866 20 19 16.866 19 13C19 9.47968 16.3923 6.57471 13 6.15288V4H15C15.5523 4 16 3.55228 16 3C16 2.44772 15.5523 2 15 2H9ZM17 13C17 15.7614 14.7614 18 12 18C9.23858 18 7 15.7614 7 13C7 10.2386 9.23858 8 12 8C14.7614 8 17 10.2386 17 13Z"/>
              </svg>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h4>
              <p className="text-3xl font-bold text-gray-900 dark:text-white/90">
                {totalRevenue?.totalOrders || 0}
              </p>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-500/10">
              <svg className="fill-success-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.41 18.09V20H10.74V18.07C9.03 17.71 7.58 16.61 7.47 14.67H9.43C9.53 15.82 10.29 16.58 12.09 16.58C14.15 16.58 14.58 15.54 14.58 14.89C14.58 13.93 14.15 13.19 11.71 12.62C8.85 11.94 7.44 10.87 7.44 8.93C7.44 7.23 8.73 5.97 10.74 5.54V3.5H13.41V5.53C15.47 6.01 16.53 7.42 16.6 9.23H14.64C14.58 8.05 13.98 7.36 12.09 7.36C10.31 7.36 9.46 8.01 9.46 9.03C9.46 9.97 10.12 10.5 12.38 11.04C14.64 11.58 16.6 12.44 16.6 14.87C16.6 16.38 15.58 17.77 13.41 18.09Z"/>
              </svg>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</h4>
              <p className="text-2xl font-bold text-success-700 dark:text-success-400">
                Rp {parseFloat(totalRevenue?.totalRevenue || "0").toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Total Tax Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-500/10">
              <svg className="fill-warning-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z"/>
              </svg>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Total Tax</h4>
              <p className="text-2xl font-bold text-warning-700 dark:text-warning-400">
                Rp {parseFloat(totalRevenue?.totalTax || "0").toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <svg className="fill-blue-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.53 11.06L15.47 10L11 14.47V3H9V14.47L4.53 10L3.47 11.06L10 17.59L16.53 11.06ZM19 19H5V21H19V19Z"/>
              </svg>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Grand Total</h4>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                Rp {parseFloat(totalRevenue?.grandTotal || "0").toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
