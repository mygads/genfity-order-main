'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CustomerMerchantPageNotFound() {
  const { t } = useTranslation();
  const params = useParams<{ merchantCode?: string }>();
  const merchantCode = params?.merchantCode ? String(params.merchantCode) : '';

  const backHref = merchantCode ? `/${merchantCode}` : '/';
  const merchantLabel = useMemo(() => merchantCode || t('landing.merchantCode'), [merchantCode, t]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-125 mx-auto w-full bg-white shadow-sm">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center px-4 py-3">
            <h1 className="flex-1 text-center font-semibold text-gray-900 text-base">
              {t('customer.notFound.merchantPageTitle')}
            </h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-70 mb-8">
            <Image
              src="/images/error/404.png"
              alt={t('common.notFound')}
              width={472}
              height={152}
              className="w-full h-auto"
              priority
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.notFound')}</h2>
            <p className="text-sm text-gray-500 whitespace-pre-line">
              {t('customer.notFound.merchantPageMessage', { merchantCode: merchantLabel })}
            </p>
          </div>

          <Link
            href={backHref}
            className="w-full max-w-xs h-12 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            {t('customer.notFound.backToMerchant')}
          </Link>
        </main>

        <footer className="py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">{t('landing.footer')}</p>
        </footer>
      </div>
    </div>
  );
}
