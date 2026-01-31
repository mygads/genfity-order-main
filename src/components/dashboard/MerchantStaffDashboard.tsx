import StoreToggleButton from './StoreToggleButton';
import { isStoreEffectivelyOpen, type OpeningHour } from '@/lib/utils/storeStatus';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import { hasStaffPermission } from '@/lib/utils/adminAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useRouter } from 'next/navigation';
import { clearAdminAuth } from '@/lib/utils/adminAuth';
import { clearDriverAuth } from '@/lib/utils/driverAuth';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/ToastContainer';

// Custom types based on Prisma schema
type Merchant = {
  id: bigint;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  currency?: string;
  isOpen: boolean;
  isManualOverride: boolean;
  openingHours: OpeningHour[];
  timezone: string;
};

interface MerchantStaffDashboardProps {
  merchant: Merchant;
  stats: {
    todayOrders: number;
    pendingOrders: number;
    totalOrders: number;
    activeMenuItems: number;
  };
}

/**
 * GENFITY Merchant Staff Dashboard Component
 * 
 * @description
 * Displays limited statistics for staff users:
 * - Today's orders (priority metric)
 * - Pending orders (action required)
 * - Total orders (historical context)
 * - Active menu items (inventory awareness)
 * 
 * @note
 * Staff users DO NOT have access to revenue data
 */
export default function MerchantStaffDashboard({
  merchant,
  stats,
}: MerchantStaffDashboardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const canToggleStore = hasStaffPermission(STAFF_PERMISSIONS.STORE_TOGGLE_OPEN);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { toasts, success: showSuccess, error: showError } = useToast();

  const handleLeaveStore = () => {
    setShowLeaveConfirm(true);
  };

  const doLeaveStore = async () => {
    try {
      setIsLeaving(true);
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
        body: JSON.stringify({ merchantId: merchant.id.toString() }),
        token,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.message || t('admin.staff.leaveMerchantError'));
      }

      // Leaving a merchant should log the user out of BOTH portals.
      clearAdminAuth();
      clearDriverAuth();
      showSuccess('Success', t('admin.staff.leaveMerchantSuccess'));
      router.push('/admin/login');
    } catch (error) {
      showError('Error', error instanceof Error ? error.message : t('admin.staff.leaveMerchantError'));
    } finally {
      setIsLeaving(false);
    }
  };

  const effectivelyOpen = isStoreEffectivelyOpen({
    isOpen: merchant.isOpen,
    isManualOverride: merchant.isManualOverride,
    openingHours: merchant.openingHours,
    timezone: merchant.timezone,
  });

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      {/* Merchant Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{merchant.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Staff Dashboard</p>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  effectivelyOpen
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${effectivelyOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {effectivelyOpen ? t('common.open') : t('common.closed')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canToggleStore && (
              <StoreToggleButton
                initialIsOpen={merchant.isOpen ?? true}
                initialIsManualOverride={merchant.isManualOverride ?? false}
                effectivelyOpen={effectivelyOpen}
                merchantId={merchant.id.toString()}
              />
            )}

            <button
              type="button"
              onClick={handleLeaveStore}
              disabled={isLeaving}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-900/10"
              title={t('admin.staff.leaveMerchant')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              {isLeaving ? 'Leaving...' : t('admin.staff.leaveMerchant')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLeaveConfirm}
        onClose={() => {
          if (isLeaving) return;
          setShowLeaveConfirm(false);
        }}
        onConfirm={doLeaveStore}
        title={t('admin.staff.leaveMerchant')}
        message={t('admin.staff.leaveMerchantConfirm')}
        confirmText={isLeaving ? (t('common.loading') || 'Processing...') : (t('admin.staff.leaveMerchant') || 'Leave Store')}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="danger"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Orders - Priority */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.todayOrders}
              </h3>
              <p className="mt-1 text-sm text-brand-600">
                Current workload
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
              <svg
                className="h-6 w-6 text-brand-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Orders - Action Required */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.pendingOrders}
              </h3>
              <p className="mt-1 text-sm text-yellow-600">
                Needs attention
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <svg
                className="h-6 w-6 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Orders - Historical Context */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalOrders}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                All time
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <svg
                className="h-6 w-6 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Menu Items - Inventory Awareness */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Menu
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeMenuItems}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Available items
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
