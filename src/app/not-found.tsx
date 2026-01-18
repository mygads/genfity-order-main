'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto w-full max-w-[280px] mb-6">
          <Image
            src="/images/error/404.png"
            alt={t('common.notFound')}
            width={472}
            height={152}
            className="w-full h-auto"
            priority
          />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {t('common.notFound')}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
        >
          {t('common.backHome')}
        </Link>
      </div>
    </div>
  );
}
