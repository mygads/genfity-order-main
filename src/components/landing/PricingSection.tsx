'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';
import BlurFade from '@/components/magicui/blur-fade';
import { BorderBeam } from '@/components/magicui/border-beam';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function PricingSection() {
    const { t } = useTranslation();
    const [currency, setCurrency] = useState<'idr' | 'aud'>('idr');

    type Availability = true | false | 'limited' | 'paid' | 'addon' | 'varies';

    const CheckIcon = ({ className = "w-3.5 h-3.5 text-emerald-500" }: { className?: string }) => (
        <FaCheck className={className} />
    );

    const XIcon = ({ className = "w-3.5 h-3.5 text-red-400" }: { className?: string }) => (
        <FaTimes className={className} />
    );

    const features = [
        'landing.pricing.feature.allFeatures',
        'landing.pricing.feature.unlimitedMenu',
        'landing.pricing.feature.unlimitedStaff',
        'landing.pricing.feature.support',
        'landing.pricing.feature.cancel'
    ];

    const competitorFeatureGroups: Array<{
        groupKey: string;
        rows: Array<{
            featureKey: string;
            genfity: Availability;
            moka: Availability;
            majoo: Availability;
            others: Availability;
        }>;
    }> = [
            {
                groupKey: 'ordering',
                rows: [
                    { featureKey: 'qrOrdering', genfity: true, moka: true, majoo: 'limited', others: 'limited' },
                    { featureKey: 'noAppInstall', genfity: true, moka: 'varies', majoo: 'varies', others: 'varies' },
                    { featureKey: 'tablesQr', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'deliveryZones', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                    { featureKey: 'reservations', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                ],
            },
            {
                groupKey: 'pos',
                rows: [
                    { featureKey: 'posMode', genfity: true, moka: true, majoo: true, others: 'varies' },
                    { featureKey: 'customerDisplay', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                ],
            },
            {
                groupKey: 'kitchen',
                rows: [
                    { featureKey: 'kds', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                    { featureKey: 'orderQueueKitchen', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                    { featureKey: 'realtimeUpdates', genfity: true, moka: 'varies', majoo: 'varies', others: 'varies' },
                ],
            },
            {
                groupKey: 'menu',
                rows: [
                    { featureKey: 'menuBuilder', genfity: true, moka: true, majoo: true, others: 'varies' },
                    { featureKey: 'menuCategories', genfity: true, moka: true, majoo: true, others: 'varies' },
                    { featureKey: 'addons', genfity: true, moka: 'limited', majoo: 'limited', others: 'paid' },
                    { featureKey: 'menuBooks', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'bulkUploadMenu', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                    { featureKey: 'specialPrices', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                ],
            },
            {
                groupKey: 'inventory',
                rows: [
                    { featureKey: 'stockTracking', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                    { featureKey: 'dailyStockTemplate', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                ],
            },
            {
                groupKey: 'marketing',
                rows: [
                    { featureKey: 'vouchers', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                    { featureKey: 'voucherAnalytics', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                    { featureKey: 'referralCodes', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'notifications', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'pushNotifications', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                ],
            },
            {
                groupKey: 'analytics',
                rows: [
                    { featureKey: 'analyticsSales', genfity: true, moka: true, majoo: true, others: 'limited' },
                    { featureKey: 'analyticsMenuPerformance', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'analyticsCustomers', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'reports', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                ],
            },
            {
                groupKey: 'operations',
                rows: [
                    { featureKey: 'staffPermissions', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                    { featureKey: 'multiLanguage', genfity: true, moka: 'limited', majoo: 'limited', others: 'limited' },
                    { featureKey: 'multiBranch', genfity: true, moka: 'paid', majoo: 'paid', others: 'paid' },
                    { featureKey: 'drivers', genfity: true, moka: 'addon', majoo: 'addon', others: 'paid' },
                    { featureKey: 'taxSettings', genfity: true, moka: 'varies', majoo: 'varies', others: 'varies' },
                    { featureKey: 'receiptPdf', genfity: true, moka: 'varies', majoo: 'varies', others: 'varies' },
                    { featureKey: 'pwaInstallable', genfity: true, moka: 'varies', majoo: 'varies', others: 'varies' },
                ],
            },
        ];

    const renderAvailability = (value: Availability) => {
        if (value === true) {
            return (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                </div>
            );
        }
        if (value === false) {
            return <XIcon />;
        }

        const label =
            value === 'limited'
                ? t('landing.compare.value.limited')
                : value === 'paid'
                    ? t('landing.compare.value.paid')
                    : value === 'addon'
                        ? t('landing.compare.value.addon')
                        : t('landing.compare.value.varies');

        return <span className="text-[10px] text-orange-600 font-semibold">{label}</span>;
    };

    return (
        <section id="pricing" className={cn(LANDING_SECTION, 'border-b border-gray-100')}>
            <div className={cn(LANDING_CONTAINER, 'max-w-6xl')}>

                {/* Header */}
                <BlurFade delay={0.1} inView>
                    <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                        <h2 className={LANDING_H2}>
                            {t('landing.pricing.title')}
                        </h2>
                        <p className={LANDING_P}>
                            {t('landing.pricing.subtitle')}
                        </p>

                        {/* Currency Toggle */}
                        <div className="flex items-center justify-center pt-3">
                            <div className="bg-white/70 backdrop-blur p-1 rounded-lg inline-flex items-center shadow-sm border border-gray-200">
                                <button
                                    onClick={() => setCurrency('idr')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'idr'
                                        ? 'bg-[#173C82] text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {t('landing.pricing.currency.idr')}
                                </button>
                                <button
                                    onClick={() => setCurrency('aud')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'aud'
                                        ? 'bg-[#173C82] text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {t('landing.pricing.currency.aud')}
                                </button>
                            </div>
                        </div>
                    </div>
                </BlurFade>

                {/* Pricing Cards - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">

                    {/* Flexi (Deposit) */}
                    <BlurFade delay={0.2} inView>
                        <div className="relative bg-gradient-to-br from-[#173C82] to-[#0f2a5c] rounded-2xl p-6 shadow-xl overflow-hidden group h-full">
                            <BorderBeam size={150} duration={10} delay={0} borderWidth={1.5} />

                            <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                ⭐ Best
                            </div>

                            <div className="relative z-10 text-center">
                                <h3 className="text-base font-bold text-white mb-2">{t('landing.pricing.deposit.title')}</h3>
                                <div className="flex items-baseline justify-center gap-0.5 mb-1">
                                    <span className="text-3xl font-extrabold text-white">
                                        {currency === 'idr' ? `Rp ${t('landing.pricing.deposit.priceIdr')}` : `$${t('landing.pricing.deposit.priceAud')}`}
                                    </span>
                                </div>
                                <span className="text-xs text-blue-200">{t('landing.pricing.deposit.period')}</span>
                                <p className="mt-2 text-xs text-blue-100 leading-relaxed">{t('landing.pricing.deposit.desc')}</p>
                            </div>

                            <div className="relative z-10 mt-5">
                                <Link
                                    href="/admin/register"
                                    className="w-full block text-center py-2.5 px-4 bg-white hover:bg-gray-100 text-[#173C82] font-bold rounded-lg transition-all shadow-md text-sm"
                                >
                                    {t('landing.pricing.deposit.cta')} →
                                </Link>
                            </div>

                            <div className="relative z-10 mt-5 space-y-2">
                                <ul className="space-y-1.5 text-xs text-blue-100">
                                    {features.slice(0, 3).map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckIcon className="w-3 h-3 text-white" />
                                            {t(feature)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </BlurFade>

                    {/* Pro (Monthly) */}
                    <BlurFade delay={0.3} inView>
                        <div className="relative bg-white/70 backdrop-blur rounded-2xl p-6 border border-gray-200 hover:bg-white hover:shadow-lg transition-all h-full">
                            <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Fixed
                            </div>

                            <div className="text-center">
                                <h3 className="text-base font-bold text-gray-900 mb-2">{t('landing.pricing.monthly.title')}</h3>
                                <div className="flex items-baseline justify-center gap-0.5 mb-1">
                                    <span className="text-3xl font-extrabold text-gray-900">
                                        {currency === 'idr' ? `Rp ${t('landing.pricing.monthly.priceIdr')}` : `$${t('landing.pricing.monthly.priceAud')}`}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">{t('landing.pricing.monthly.period')}</span>
                                <p className="mt-2 text-xs text-gray-600 leading-relaxed">{t('landing.pricing.monthly.desc')}</p>
                            </div>

                            <div className="mt-5">
                                <Link
                                    href="/admin/register"
                                    className="w-full block text-center py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all shadow-md text-sm"
                                >
                                    {t('landing.pricing.monthly.cta')} →
                                </Link>
                            </div>

                            <div className="mt-5 space-y-2">
                                <ul className="space-y-1.5 text-xs text-gray-600">
                                    {features.slice(0, 3).map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckIcon className="w-3 h-3 text-emerald-500" />
                                            {t(feature)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </BlurFade>
                </div>

                {/* Competitor Comparison Table */}
                <BlurFade delay={0.4} inView>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {t('landing.compare.title')}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {t('landing.compare.subtitle')}
                            </p>
                        </div>

                        <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Table Header */}
                            <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-200">
                                <div className="p-3 text-left">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('landing.compare.table.feature')}</span>
                                </div>
                                <div className="p-3 text-center border-l border-gray-200 bg-[#173C82]/5">
                                    <span className="text-xs font-bold text-[#173C82]">Genfity</span>
                                </div>
                                <div className="p-3 text-center border-l border-gray-200">
                                    <span className="text-xs font-bold text-gray-500">Moka</span>
                                </div>
                                <div className="p-3 text-center border-l border-gray-200">
                                    <span className="text-xs font-bold text-gray-500">Majoo</span>
                                </div>
                                <div className="p-3 text-center border-l border-gray-200">
                                    <span className="text-xs font-bold text-gray-500">Others</span>
                                </div>
                            </div>

                            {/* Table Body */}
                            {competitorFeatureGroups.map((group, groupIndex) => (
                                <div key={group.groupKey}>
                                    <div
                                        className={`grid grid-cols-5 bg-white ${groupIndex === 0 ? '' : 'border-t border-gray-100'
                                            }`}
                                    >
                                        <div className="col-span-5 px-3 py-2">
                                            <span className="text-[11px] font-bold text-gray-800">
                                                {t(`landing.compare.group.${group.groupKey}`)}
                                            </span>
                                        </div>
                                    </div>

                                    {group.rows.map((row, index) => (
                                        <div
                                            key={`${group.groupKey}-${index}`}
                                            className="grid grid-cols-5 border-t border-gray-100 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <div className="p-3 text-xs text-gray-700 font-medium">
                                                {t(`landing.compare.feature.${row.featureKey}`)}
                                            </div>
                                            <div className="p-3 text-center border-l border-gray-100 bg-[#173C82]/5 flex items-center justify-center">
                                                {renderAvailability(row.genfity)}
                                            </div>
                                            <div className="p-3 text-center border-l border-gray-100 flex items-center justify-center">
                                                {renderAvailability(row.moka)}
                                            </div>
                                            <div className="p-3 text-center border-l border-gray-100 flex items-center justify-center">
                                                {renderAvailability(row.majoo)}
                                            </div>
                                            <div className="p-3 text-center border-l border-gray-100 flex items-center justify-center">
                                                {renderAvailability(row.others)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </BlurFade>

                {/* Bottom Note */}
                <BlurFade delay={0.5} inView>
                    <div className="mt-10 text-center">
                        <p className="text-xs text-gray-500">
                            🎉 <span className="font-semibold text-gray-700">{t('landing.hero.badges.trial')}</span> • {t('landing.cta.noCreditCard')} • {t('landing.pricing.feature.cancel')}
                        </p>
                    </div>
                </BlurFade>
            </div>
        </section>
    );
}
