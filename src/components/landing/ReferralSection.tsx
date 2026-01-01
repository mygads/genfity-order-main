'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';

export default function ReferralSection() {
    const { t } = useTranslation();

    return (
        <section className="py-8 bg-gray-50 dark:bg-gray-800/50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden relative text-center">

                    {/* Compact Background Accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>

                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            Partnership
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                            {t('landing.referral.title')}
                        </h2>

                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            {t('landing.referral.desc')}
                        </p>

                        <div className="py-4 flex justify-center gap-8">
                            <div className="text-center">
                                <div className="text-3xl font-extrabold text-orange-600">{t('landing.referral.commission')}</div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recurring</div>
                            </div>
                            <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                            <div className="text-center">
                                <div className="text-3xl font-extrabold text-blue-600">Lifetime</div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Earning Period</div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link
                                href="/admin/login?register=true"
                                className="inline-block px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-gray-200 dark:shadow-none text-sm"
                            >
                                {t('landing.referral.cta')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
