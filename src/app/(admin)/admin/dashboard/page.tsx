'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import MerchantOwnerDashboard from '@/components/dashboard/MerchantOwnerDashboard';
import MerchantStaffDashboard from '@/components/dashboard/MerchantStaffDashboard';
import DeliveryDriverDashboard from '@/components/dashboard/DeliveryDriverDashboard';
import { DashboardSkeleton } from '@/components/common/SkeletonLoaders';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * GENFITY Admin Dashboard Page (CSR + SWR)
 * 
 * @description
 * Client-side rendered dashboard with SWR for data caching and real-time updates
 * Features:
 * - Auto-refresh every 5 seconds for live order updates
 * - Optimistic UI with SWR
 * - Skeleton loaders for better UX
 * - Hydration-safe rendering
 * 
 * Role-based dashboards:
 * - SUPER_ADMIN: Total merchants, users, orders, revenue
 * - MERCHANT_OWNER: Total menu items, staff, orders, revenue
 * - MERCHANT_STAFF: Today's orders, pending orders
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hasToken, setHasToken] = useState(true); // Assume true to prevent flash
  const { showError } = useToast();
  const { t } = useTranslation();

  // Handle mount state to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setHasToken(false);
      router.push('/admin/login');
    }
  }, [router]);

  // Use SWR for automatic caching, revalidation, and polling
  const { data, error, isLoading, mutate } = useSWR(
    isMounted && hasToken ? '/api/admin/dashboard' : null, // Only fetch when mounted and has token
    {
      refreshInterval: 5000, // Poll every 5 seconds for live updates
      revalidateOnFocus: true, // Refetch when window regains focus
      shouldRetryOnError: true,
      errorRetryCount: Infinity,
      errorRetryInterval: 5000,
    }
  );

  // Listen for merchant status updates and refresh dashboard
  useEffect(() => {
    const handleMerchantStatusUpdate = () => {
      mutate(); // Revalidate SWR data immediately
    };

    window.addEventListener('merchantStatusUpdated', handleMerchantStatusUpdate);
    return () => window.removeEventListener('merchantStatusUpdated', handleMerchantStatusUpdate);
  }, [mutate]);

  // Show error toast when fetch fails
  useEffect(() => {
    if (error && !isLoading && data) {
      showError('Error getting dashboard data from server', 'Connection Error');
    }
  }, [error, isLoading, data, showError]);

  // Show skeleton during SSR and initial mount
  if (!isMounted || (isLoading && !data)) {
    return <DashboardSkeleton />;
  }

  // Redirect happening
  if (!hasToken) {
    return <DashboardSkeleton />;
  }

  if (!data?.success || !data?.data) {
    return <DashboardSkeleton />;
  }

  const dashboardData = data.data;

  // No merchant connection
  if (dashboardData.noMerchant) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg className="h-8 w-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            {t("admin.dashboard.notConnected")}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {t("admin.sidebar.noMerchant.description")}
          </p>
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  {t("admin.dashboard.needHelp")}
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  {t("admin.dashboard.contactAdmin")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render dashboard based on role
  if (dashboardData.role === 'SUPER_ADMIN') {
    return (
      <SuperAdminDashboard
        stats={dashboardData.stats}
        recentMerchants={dashboardData.recentMerchants}
      />
    );
  }

  if (dashboardData.role === 'MERCHANT_OWNER') {
    return (
      <MerchantOwnerDashboard
        merchant={dashboardData.merchant}
        stats={dashboardData.stats}
        analytics={dashboardData.analytics}
        recentOrders={dashboardData.recentOrders}
        topSellingItems={dashboardData.topSellingItems}
        orderStatusBreakdown={dashboardData.orderStatusBreakdown}
        lowStockItems={dashboardData.lowStockItems}
      />
    );
  }

  if (dashboardData.role === 'MERCHANT_STAFF') {
    return (
      <MerchantStaffDashboard
        merchant={dashboardData.merchant}
        stats={dashboardData.stats}
        recentOrders={dashboardData.recentOrders}
      />
    );
  }

  if (dashboardData.role === 'DELIVERY') {
    return (
      <DeliveryDriverDashboard
        merchant={dashboardData.merchant}
        stats={dashboardData.stats}
        activeDeliveries={dashboardData.activeDeliveries}
      />
    );
  }

  return null;
}
