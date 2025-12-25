'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Settings Page - Redirects to Merchant Edit
 * Route: /admin/dashboard/settings -> /admin/dashboard/merchant/edit
 */
export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    router.replace('/admin/dashboard/merchant/edit');
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.redirecting')}</p>
      </div>
    </div>
  );
}
