'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-[#173C82] to-[#0f2850] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                    {/* Subtle decorations */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative z-10 space-y-5">
                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                            {t('landing.cta.title')}
                        </h2>
                        <p className="text-blue-100 text-base max-w-lg mx-auto">
                            {t('landing.cta.subtitle')}
                        </p>

                        <div className="flex flex-col items-center gap-3 pt-2">
                            <Link
                                href="/merchant/register"
                                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#F07600] hover:bg-[#D96A00] text-white font-semibold rounded-lg shadow-lg shadow-orange-900/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                {t('landing.cta.button')}
                            </Link>
                            <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                {t('landing.cta.noCreditCard')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
