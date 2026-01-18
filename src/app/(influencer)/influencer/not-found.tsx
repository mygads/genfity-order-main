'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function InfluencerNotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-6 w-40">
          <Image
            src="/images/error/404.png"
            alt={t('common.notFound')}
            width={472}
            height={152}
            className="h-auto w-full"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('common.notFound')}
        </h1>
        <Link
          href="/influencer/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
