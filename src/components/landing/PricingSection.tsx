'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';

export default function PricingSection() {
    const { t } = useTranslation();
    const [currency, setCurrency] = useState<'idr' | 'aud'>('idr');

    const CheckIcon = ({ className = "w-4 h-4 text-emerald-500" }: { className?: string }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );

    const features = [
        'landing.pricing.feature.allFeatures',
        'landing.pricing.feature.unlimitedMenu',
        'landing.pricing.feature.unlimitedStaff',
        'landing.pricing.feature.support',
        'landing.pricing.feature.cancel'
    ];

    // Feature comparison table data - all features available for all plans
    const featureCategories = [
        {
            category: 'landing.pricing.table.category.ordering',
            features: [
                { key: 'qrOrdering', all: true },
                { key: 'dineIn', all: true },
                { key: 'takeaway', all: true },
                { key: 'digitalMenu', all: true },
            ]
        },
        {
            category: 'landing.pricing.table.category.management',
            features: [
                { key: 'menuManagement', all: true },
                { key: 'categoryManagement', all: true },
                { key: 'addonManagement', all: true },
                { key: 'stockManagement', all: true },
                { key: 'lowStockAlert', all: true },
                { key: 'specialPricing', all: true },
                { key: 'menuScheduling', all: true },
            ]
        },
        {
            category: 'landing.pricing.table.category.operations',
            features: [
                { key: 'orderKanban', all: true },
                { key: 'kitchenDisplay', all: true },
                { key: 'orderHistory', all: true },
                { key: 'paymentRecording', all: true },
                { key: 'multiPayment', all: true },
            ]
        },
        {
            category: 'landing.pricing.table.category.staff',
            features: [
                { key: 'unlimitedStaff', all: true },
                { key: 'rolePermissions', all: true },
                { key: 'staffAccess', all: true },
            ]
        },
        {
            category: 'landing.pricing.table.category.reports',
            features: [
                { key: 'salesReport', all: true },
                { key: 'revenueAnalytics', all: true },
                { key: 'customerInsights', all: true },
                { key: 'exportExcel', all: true },
            ]
        },
        {
            category: 'landing.pricing.table.category.settings',
            features: [
                { key: 'openingHours', all: true },
                { key: 'specialHours', all: true },
                { key: 'multiCurrency', all: true },
                { key: 'emailNotifications', all: true },
                { key: 'multiDevice', all: true },
            ]
        },
    ];

    return (
        <section id="pricing" className="py-16 lg:py-20 bg-white dark:bg-gray-900">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.pricing.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.pricing.subtitle')}
                    </p>

                    <div className="flex justify-center pt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('landing.pricing.allPlansNote')}
                        </span>
                    </div>

                    {/* Currency Toggle */}
                    <div className="flex items-center justify-center pt-2">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex items-center">
                            <button
                                onClick={() => setCurrency('idr')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${currency === 'idr'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {t('landing.pricing.currency.idr')}
                            </button>
                            <button
                                onClick={() => setCurrency('aud')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${currency === 'aud'
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">

                    {/* Deposit (Flexi) - Highlighted */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-[#173C82] shadow-xl relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#173C82] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            {t('landing.pricing.deposit.highlight')}
                        </div>

                        <div className="mb-4 pt-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('landing.pricing.deposit.title')}</h3>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'idr' ? `Rp ${t('landing.pricing.deposit.priceIdr')}` : `$${t('landing.pricing.deposit.priceAud')}`}
                                </span>
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium">{t('landing.pricing.deposit.period')}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('landing.pricing.deposit.desc')}</p>
                        </div>

                        <Link
                            href="/merchant/register"
                            className="w-full block text-center py-3 px-4 bg-[#F07600] hover:bg-[#D96A00] text-white font-semibold rounded-lg transition-all shadow-lg shadow-orange-200 dark:shadow-none mb-5 text-sm"
                        >
                            {t('landing.pricing.deposit.cta')}
                        </Link>

                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            {features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                    <CheckIcon />
                                    {t(feature)}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Monthly (Pro) */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-lg relative group">
                        <div className="absolute top-0 right-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-wide">
                            {t('landing.pricing.monthly.highlight')}
                        </div>

                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('landing.pricing.monthly.title')}</h3>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {currency === 'idr' ? `Rp ${t('landing.pricing.monthly.priceIdr')}` : `$${t('landing.pricing.monthly.priceAud')}`}
                                </span>
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium">{t('landing.pricing.monthly.period')}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('landing.pricing.monthly.desc')}</p>
                        </div>

                        <Link
                            href="/merchant/register"
                            className="w-full block text-center py-3 px-4 bg-[#173C82] hover:bg-[#122c60] text-white font-semibold rounded-lg transition-all shadow-md mb-5 text-sm"
                        >
                            {t('landing.pricing.monthly.cta')}
                        </Link>

                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            {features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                    <CheckIcon />
                                    {t(feature)}
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>

                {/* Feature Comparison Table */}
                <div className="mt-16">
                    <div className="text-center mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('landing.pricing.table.title')}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('landing.pricing.table.subtitle')}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="p-4 text-left">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {t('landing.pricing.table.features')}
                                </span>
                            </div>
                            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700 bg-[#173C82]/5 dark:bg-[#173C82]/10">
                                <span className="text-sm font-semibold text-[#173C82] dark:text-blue-400">
                                    {t('landing.pricing.deposit.title')}
                                </span>
                            </div>
                            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {t('landing.pricing.monthly.title')}
                                </span>
                            </div>
                        </div>

                        {/* Table Body */}
                        {featureCategories.map((category, catIndex) => (
                            <div key={catIndex}>
                                {/* Category Header */}
                                <div className="grid grid-cols-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                    <div className="col-span-3 p-3 px-4">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t(category.category)}
                                        </span>
                                    </div>
                                </div>

                                {/* Feature Rows */}
                                {category.features.map((feature, featIndex) => (
                                    <div
                                        key={featIndex}
                                        className="grid grid-cols-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <div className="p-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                            {t(`landing.pricing.table.feature.${feature.key}`)}
                                        </div>
                                        <div className="p-3 text-center border-l border-gray-100 dark:border-gray-700/50 bg-[#173C82]/5 dark:bg-[#173C82]/10">
                                            <CheckIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                                        </div>
                                        <div className="p-3 text-center border-l border-gray-100 dark:border-gray-700/50">
                                            <CheckIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* CTA Row */}
                        <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900/50">
                            <div className="p-4"></div>
                            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700 bg-[#173C82]/5 dark:bg-[#173C82]/10">
                                <Link
                                    href="/merchant/register"
                                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#F07600] hover:bg-[#D96A00] rounded-lg transition-all shadow-md"
                                >
                                    {t('landing.pricing.deposit.cta')}
                                </Link>
                            </div>
                            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700">
                                <Link
                                    href="/merchant/register"
                                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#173C82] hover:bg-[#122c60] rounded-lg transition-all shadow-md"
                                >
                                    {t('landing.pricing.monthly.cta')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
