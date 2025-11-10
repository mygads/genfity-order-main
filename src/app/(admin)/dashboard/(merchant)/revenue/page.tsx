"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

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
        setDailyRevenue(data.data || []);
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
      <>
        <PageBreadCrumb pageTitle="Revenue Reports" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading revenue...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Revenue Reports" />

      <div className="mt-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => setReportType("daily")}
            className={`rounded px-6 py-2.5 font-medium ${
              reportType === "daily"
                ? "bg-primary text-white"
                : "border border-stroke bg-white text-black hover:bg-gray-2 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
            }`}
          >
            Daily Revenue
          </button>
          <button
            onClick={() => setReportType("total")}
            className={`rounded px-6 py-2.5 font-medium ${
              reportType === "total"
                ? "bg-primary text-white"
                : "border border-stroke bg-white text-black hover:bg-gray-2 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
            }`}
          >
            Total Revenue
          </button>
        </div>

        {reportType === "daily" ? (
          <ComponentCard title="Daily Revenue Breakdown">
            {dailyRevenue.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-body-color">No revenue data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Date</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Orders</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Revenue</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Tax</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRevenue.map((item, index) => (
                      <tr key={index} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-4">{item.totalOrders}</td>
                        <td className="px-4 py-4">Rp {parseFloat(item.totalRevenue).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-4">Rp {parseFloat(item.totalTax).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-4 font-bold">Rp {parseFloat(item.grandTotal).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-2 font-bold dark:bg-meta-4">
                      <td className="px-4 py-4">TOTAL</td>
                      <td className="px-4 py-4">
                        {dailyRevenue.reduce((sum, item) => sum + item.totalOrders, 0)}
                      </td>
                      <td className="px-4 py-4">
                        Rp {dailyRevenue
                          .reduce((sum, item) => sum + parseFloat(item.totalRevenue), 0)
                          .toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-4">
                        Rp {dailyRevenue
                          .reduce((sum, item) => sum + parseFloat(item.totalTax), 0)
                          .toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-4">
                        Rp {dailyRevenue
                          .reduce((sum, item) => sum + parseFloat(item.grandTotal), 0)
                          .toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </ComponentCard>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H11V6.15288C7.60771 6.57471 5 9.47967 5 13C5 16.866 8.13401 20 12 20C15.866 20 19 16.866 19 13C19 9.47968 16.3923 6.57471 13 6.15288V4H15C15.5523 4 16 3.55228 16 3C16 2.44772 15.5523 2 15 2H9ZM17 13C17 15.7614 14.7614 18 12 18C9.23858 18 7 15.7614 7 13C7 10.2386 9.23858 8 12 8C14.7614 8 17 10.2386 17 13Z"/>
                </svg>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-body-color">Total Orders</h4>
                <p className="text-3xl font-bold text-black dark:text-white">
                  {totalRevenue?.totalOrders || 0}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <svg className="fill-success" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.41 18.09V20H10.74V18.07C9.03 17.71 7.58 16.61 7.47 14.67H9.43C9.53 15.82 10.29 16.58 12.09 16.58C14.15 16.58 14.58 15.54 14.58 14.89C14.58 13.93 14.15 13.19 11.71 12.62C8.85 11.94 7.44 10.87 7.44 8.93C7.44 7.23 8.73 5.97 10.74 5.54V3.5H13.41V5.53C15.47 6.01 16.53 7.42 16.6 9.23H14.64C14.58 8.05 13.98 7.36 12.09 7.36C10.31 7.36 9.46 8.01 9.46 9.03C9.46 9.97 10.12 10.5 12.38 11.04C14.64 11.58 16.6 12.44 16.6 14.87C16.6 16.38 15.58 17.77 13.41 18.09Z"/>
                </svg>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-body-color">Total Revenue</h4>
                <p className="text-2xl font-bold text-success">
                  Rp {parseFloat(totalRevenue?.totalRevenue || "0").toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <svg className="fill-warning" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z"/>
                </svg>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-body-color">Total Tax</h4>
                <p className="text-2xl font-bold text-warning">
                  Rp {parseFloat(totalRevenue?.totalTax || "0").toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-meta-3/10">
                <svg className="fill-meta-3" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.53 11.06L15.47 10L11 14.47V3H9V14.47L4.53 10L3.47 11.06L10 17.59L16.53 11.06ZM19 19H5V21H19V19Z"/>
                </svg>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-body-color">Grand Total</h4>
                <p className="text-2xl font-bold text-meta-3">
                  Rp {parseFloat(totalRevenue?.grandTotal || "0").toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
