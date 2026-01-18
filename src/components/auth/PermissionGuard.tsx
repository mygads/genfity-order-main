'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionForPath, isOwnerOnlyDashboardPath } from '@/lib/constants/permissions';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Client-side UX guard for staff-only permissions.
 *
 * Note: This is NOT a security boundary. APIs must still enforce permissions.
 * This guard prevents staff from manually navigating to restricted pages.
 */
export default function PermissionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, hasPermission, isOwner } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (pathname?.startsWith('/admin/dashboard/not-allowed')) return;

    // Only guard merchant staff (owners always allowed)
    if (isOwner || user.role !== 'MERCHANT_STAFF') return;

    if (isOwnerOnlyDashboardPath(pathname)) {
      showToast({
        variant: 'error',
        title: t('admin.staff.accessDenied'),
        message: t('admin.staff.noPermissionToAccess'),
        duration: 5000,
      });
      router.replace('/admin/dashboard/not-allowed');
      return;
    }

    const required = getPermissionForPath(pathname);
    if (!required) return;

    if (!hasPermission(required)) {
      showToast({
        variant: 'error',
        title: t('admin.staff.accessDenied'),
        message: t('admin.staff.noPermissionToAccess'),
        duration: 5000,
      });
      router.replace('/admin/dashboard/not-allowed');
    }
  }, [hasPermission, isOwner, loading, pathname, router, showToast, t, user]);

  return null;
}
