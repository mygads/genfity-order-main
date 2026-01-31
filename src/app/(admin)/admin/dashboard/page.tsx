'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import MerchantOwnerDashboard from '@/components/dashboard/MerchantOwnerDashboard';
import MerchantStaffDashboard from '@/components/dashboard/MerchantStaffDashboard';
import DeliveryDriverDashboard from '@/components/dashboard/DeliveryDriverDashboard';
import { DashboardSkeleton } from '@/components/common/SkeletonLoaders';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { clearAdminAuth } from '@/lib/utils/adminAuth';
import { clearDriverAuth } from '@/lib/utils/driverAuth';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { useMerchant } from '@/context/MerchantContext';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

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
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingLeaveMerchantId, setPendingLeaveMerchantId] = useState<string | null>(null);
  const { showError } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { merchant } = useMerchant();
  const { isSuspended } = useSubscriptionStatus();

  const isMerchantUser = user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF';
  const isMerchantInactive = isMerchantUser && merchant?.isActive === false;
  const isLocked = isMerchantUser && (isMerchantInactive || isSuspended);

  const wrapLocked = (node: ReactNode) => {
    if (!isLocked) return <>{node}</>;

    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-50 grayscale">
          {node}
        </div>
        <div className="absolute inset-0 z-10 flex items-start justify-center p-4">
          <div className="mt-2 w-full max-w-2xl rounded-xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('admin.dashboard.locked.title')}</p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{t('admin.dashboard.locked.message')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const executeLeaveDisabledMerchant = async (merchantId: string) => {
    if (!merchantId) return;
    setIsLeaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        clearAdminAuth();
        clearDriverAuth();
        router.push('/admin/login');
        return;
      }

      const response = await fetchMerchantApi('/api/merchant/staff/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantId }),
        token,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Failed to leave merchant');
      }

      clearAdminAuth();
      clearDriverAuth();
      router.push('/admin/login');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to leave merchant', 'Error');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveDisabledMerchant = (merchantId: string) => {
    if (!merchantId || isLeaving) return;
    setPendingLeaveMerchantId(merchantId);
    setLeaveConfirmOpen(true);
  };

  const handleConfirmLeaveDisabledMerchant = async () => {
    if (!pendingLeaveMerchantId || isLeaving) return;
    setLeaveConfirmOpen(false);
    const merchantId = pendingLeaveMerchantId;
    setPendingLeaveMerchantId(null);
    await executeLeaveDisabledMerchant(merchantId);
  };

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
    const disabledMerchant = (dashboardData as any).disabledMerchant as
      | { id: string; name: string; code?: string }
      | undefined;
    const isDisabled = Boolean((dashboardData as any).merchantAccessDisabled && disabledMerchant);

    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg className="h-8 w-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            {isDisabled ? 'Merchant access disabled' : t("admin.dashboard.notConnected")}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {isDisabled
              ? `Your access to ${disabledMerchant?.name}${disabledMerchant?.code ? ` (${disabledMerchant.code})` : ''} was disabled by the merchant owner. You can leave this merchant so your account can be invited to another store.`
              : t("admin.sidebar.noMerchant.description")}
          </p>

          {isDisabled && disabledMerchant?.id && (
            <button
              onClick={() => handleLeaveDisabledMerchant(disabledMerchant.id)}
              disabled={isLeaving}
              className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              {isLeaving ? 'Leaving...' : 'Leave Store'}
            </button>
          )}

          <ConfirmDialog
            isOpen={leaveConfirmOpen}
            title="Leave store"
            message="Are you sure you want to leave this merchant? You will be logged out and can be invited to another store."
            confirmText={isLeaving ? 'Leaving...' : 'Leave'}
            cancelText="Cancel"
            variant="warning"
            onConfirm={handleConfirmLeaveDisabledMerchant}
            onCancel={() => {
              if (isLeaving) return;
              setLeaveConfirmOpen(false);
              setPendingLeaveMerchantId(null);
            }}
          />

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
    return wrapLocked(
      <SuperAdminDashboard
        stats={dashboardData.stats}
        recentMerchants={dashboardData.recentMerchants}
      />
    );
  }

  if (dashboardData.role === 'MERCHANT_OWNER') {
    return wrapLocked(
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
    return wrapLocked(
      <MerchantStaffDashboard
        merchant={dashboardData.merchant}
        stats={dashboardData.stats}
      />
    );
  }

  if (dashboardData.role === 'DELIVERY') {
    return wrapLocked(
      <DeliveryDriverDashboard
        merchant={dashboardData.merchant}
        stats={dashboardData.stats}
        activeDeliveries={dashboardData.activeDeliveries}
      />
    );
  }

  return null;
}
