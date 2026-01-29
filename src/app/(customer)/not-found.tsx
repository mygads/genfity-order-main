'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CustomerNotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-125 border border-gray-200 rounded-2xl shadow-sm p-6 text-center bg-white">
        <div className="mx-auto w-full max-w-70 mb-6">
          <Image
            src="/images/error/404.png"
            alt={t('common.notFound')}
            width={472}
            height={152}
            className="w-full h-auto"
            priority
          />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('customer.notFound.customerPageTitle')}</h1>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{t('customer.notFound.customerPageMessage')}</p>

        <Link
          href="/merchant"
          className="inline-flex items-center justify-center h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
        >
          {t('customer.notFound.backToMerchantEntry')}
        </Link>
      </div>
    </div>
  );
}
