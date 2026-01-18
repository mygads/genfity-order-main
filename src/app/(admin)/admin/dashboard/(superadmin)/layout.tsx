'use client';

import React from 'react';
import Link from 'next/link';
import { FaBan } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        {t('common.loading')}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
            <FaBan className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('admin.staff.accessDenied')}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.staff.noPermissionToAccess')}
          </p>
          <Link
            href="/admin/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
