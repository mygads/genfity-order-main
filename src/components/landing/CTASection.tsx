'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className="py-16 bg-white dark:bg-gray-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-orange-600 rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl">

                    {/* Abstract shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-800/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                            {t('landing.cta.title')}
                        </h2>
                        <p className="text-orange-100 text-lg max-w-xl mx-auto">
                            {t('landing.cta.subtitle')}
                        </p>

                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href="/admin/login?register=true"
                                className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-full text-lg font-bold shadow-lg transition-all transform hover:-translate-y-1"
                            >
                                {t('landing.cta.button')}
                            </Link>
                            <div className="flex items-center gap-2 text-orange-200 text-xs font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                {t('landing.cta.noCreditCard')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
