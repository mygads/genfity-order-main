'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';

export default function PricingSection() {
    const { t } = useTranslation();
    const [currency, setCurrency] = useState<'idr' | 'aud'>('idr');

    const _toggleCurrency = () => {
        setCurrency(currency === 'idr' ? 'aud' : 'idr');
    };

    return (
        <section id="pricing" className="py-16 lg:py-24 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.pricing.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.pricing.subtitle')}
                    </p>

                    <div className="flex justify-center mt-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            All Plans Include Full Feature Access
                        </span>
                    </div>

                    {/* Currency Toggle */}
                    <div className="flex items-center justify-center pt-3">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex items-center">
                            <button
                                onClick={() => setCurrency('idr')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currency === 'idr'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {t('landing.pricing.currency.idr')}
                            </button>
                            <button
                                onClick={() => setCurrency('aud')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currency === 'aud'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {t('landing.pricing.currency.aud')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                    {/* Free Trial */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-xl relative group">
                        <div className="mb-5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('landing.pricing.trial.title')}</h3>
                            <div className="mt-3 flex items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'idr' ? 'Rp 0' : '$0'}
                                </span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">30 Days</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('landing.pricing.trial.desc')}</p>
                        </div>

                        <Link
                            href="/admin/login?register=true"
                            className="w-full block text-center py-2.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl transition-colors mb-6 group-hover:bg-orange-500 group-hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-orange-500 text-sm"
                        >
                            {t('landing.pricing.trial.cta')}
                        </Link>

                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.allFeatures')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedMenu')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedStaff')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.support')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.cancel')}
                            </li>
                        </ul>
                    </div>

                    {/* Deposit (Flexi) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-orange-500 shadow-2xl relative transform md:-translate-y-4">
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-lguppercase tracking-wide">
                            {t('landing.pricing.deposit.highlight')}
                        </div>

                        <div className="mb-5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('landing.pricing.deposit.title')}</h3>
                            <div className="mt-3 flex items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'idr' ? `Rp ${t('landing.pricing.deposit.priceIdr')}` : `$${t('landing.pricing.deposit.priceAud')}`}
                                </span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('landing.pricing.deposit.period')}</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('landing.pricing.deposit.desc')}</p>
                        </div>

                        <Link
                            href="/admin/login?register=true"
                            className="w-full block text-center py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/25 mb-6 text-sm"
                        >
                            {t('landing.pricing.deposit.cta')}
                        </Link>

                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.allFeatures')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedMenu')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedStaff')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.support')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.cancel')}
                            </li>
                        </ul>
                    </div>

                    {/* Monthly (Pro) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-xl relative group">
                        <div className="absolute top-0 right-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-lg uppercase tracking-wide">
                            {t('landing.pricing.monthly.highlight')}
                        </div>

                        <div className="mb-5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('landing.pricing.monthly.title')}</h3>
                            <div className="mt-3 flex items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'idr' ? `Rp ${t('landing.pricing.monthly.priceIdr')}` : `$${t('landing.pricing.monthly.priceAud')}`}
                                </span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('landing.pricing.monthly.period')}</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('landing.pricing.monthly.desc')}</p>
                        </div>

                        <Link
                            href="/admin/login?register=true"
                            className="w-full block text-center py-2.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl transition-colors mb-6 group-hover:bg-orange-500 group-hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-orange-500 text-sm"
                        >
                            {t('landing.pricing.monthly.cta')}
                        </Link>

                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.allFeatures')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedMenu')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.unlimitedStaff')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.support')}
                            </li>
                            <li className="flex items-center gap-2.5">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {t('landing.pricing.feature.cancel')}
                            </li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    );
}
