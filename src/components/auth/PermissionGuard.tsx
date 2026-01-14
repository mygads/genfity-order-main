'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionForPath, isOwnerOnlyDashboardPath } from '@/lib/constants/permissions';
import { useToast } from '@/context/ToastContext';

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

  React.useEffect(() => {
    if (loading) return;
    if (!user) return;

    // Only guard merchant staff (owners always allowed)
    if (isOwner || user.role !== 'MERCHANT_STAFF') return;

    if (isOwnerOnlyDashboardPath(pathname)) {
      showToast({
        variant: 'error',
        title: 'Access denied',
        message: 'This page is only available to the store owner.',
        duration: 5000,
      });
      router.replace('/admin/dashboard');
      return;
    }

    const required = getPermissionForPath(pathname);
    if (!required) return;

    if (!hasPermission(required)) {
      showToast({
        variant: 'error',
        title: 'Access denied',
        message: 'You do not have permission to access this page.',
        duration: 5000,
      });
      router.replace('/admin/dashboard');
    }
  }, [hasPermission, isOwner, loading, pathname, router, showToast, user]);

  return null;
}
