"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface DashboardStats {
  totalMerchants: number;
  activeMerchants: number;
  inactiveMerchants: number;
}

interface Merchant {
  id: string;
  isActive: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMerchants: 0,
    activeMerchants: 0,
    inactiveMerchants: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/signin");
          return;
        }

        const response = await fetch("/api/admin/merchants", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch merchants");
        }

        const data = await response.json();
        const merchants = data.data as Merchant[] || [];

        setStats({
          totalMerchants: merchants.length,
          activeMerchants: merchants.filter((m) => m.isActive).length,
          inactiveMerchants: merchants.filter((m) => !m.isActive).length,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle="Admin Dashboard" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Admin Dashboard" />

      <div className="mt-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-body-color">Total Merchants</h4>
                <p className="mt-2 text-3xl font-bold text-black dark:text-white">{stats.totalMerchants}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-2">
                <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-body-color">Active Merchants</h4>
                <p className="mt-2 text-3xl font-bold text-success">{stats.activeMerchants}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <svg className="fill-success" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-body-color">Inactive Merchants</h4>
                <p className="mt-2 text-3xl font-bold text-meta-1">{stats.inactiveMerchants}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-1/10">
                <svg className="fill-meta-1" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <ComponentCard title="Quick Actions">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => router.push("/admin/merchants/create")}
              className="flex flex-col items-center justify-center rounded-lg border border-stroke bg-gray-2 p-6 transition hover:bg-gray-3 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-4/90"
            >
              <svg className="mb-3 fill-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">Create Merchant</span>
            </button>

            <button
              onClick={() => router.push("/admin/merchants")}
              className="flex flex-col items-center justify-center rounded-lg border border-stroke bg-gray-2 p-6 transition hover:bg-gray-3 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-4/90"
            >
              <svg className="mb-3 fill-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">View All Merchants</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="flex flex-col items-center justify-center rounded-lg border border-stroke bg-gray-2 p-6 transition hover:bg-gray-3 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-4/90"
            >
              <svg className="mb-3 fill-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">Refresh Stats</span>
            </button>

            <button
              onClick={() => router.push("/admin/merchants?activeOnly=false")}
              className="flex flex-col items-center justify-center rounded-lg border border-stroke bg-gray-2 p-6 transition hover:bg-gray-3 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-meta-4/90"
            >
              <svg className="mb-3 fill-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">Manage Users</span>
            </button>
          </div>
        </ComponentCard>

        {/* Welcome Message */}
        <ComponentCard title="Welcome to GENFITY Admin Dashboard">
          <div className="space-y-4">
            <p className="text-sm text-body-color">
              This is your central hub for managing the GENFITY online ordering system.
              From here, you can:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-body-color">
              <li>Create and manage merchant accounts</li>
              <li>Monitor merchant activity and status</li>
              <li>View system-wide statistics</li>
              <li>Access merchant management tools</li>
            </ul>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => router.push("/admin/merchants/create")}
                className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
              >
                Get Started
              </button>
              <button
                onClick={() => router.push("/admin/merchants")}
                className="rounded border border-stroke px-6 py-2.5 font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                View Merchants
              </button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}

