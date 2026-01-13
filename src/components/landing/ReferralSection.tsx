'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ReferralSection() {
    const { t } = useTranslation();

    return (
        <section className="py-12 bg-white dark:bg-gray-900">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-gray-50 to-orange-50/50 dark:from-gray-800 dark:to-orange-900/10 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                    {/* Subtle accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>

                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                        {/* Left: Content */}
                        <div className="flex-1 text-center lg:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                Partnership
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {t('landing.referral.title')}
                            </h2>

                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('landing.referral.desc')}
                            </p>
                        </div>

                        {/* Right: Stats & CTA */}
                        <div className="flex flex-col items-center lg:items-end gap-4">
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">{t('landing.referral.commission')}</div>
                                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Recurring</div>
                                </div>
                                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-[#173C82] dark:text-blue-400">Lifetime</div>
                                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Earning</div>
                                </div>
                            </div>

                            <Link
                                href="/influencer/register"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                {t('landing.referral.cta')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
