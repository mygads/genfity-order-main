'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import NumberTicker from '@/components/magicui/number-ticker';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function StatsSection() {
    const { t } = useTranslation();

    const stats = [
        { value: 1200, suffix: '+', label: t('landing.stats.merchants'), sublabel: t('landing.stats.merchants_desc') },
        { value: 50, suffix: '+', label: t('landing.stats.cities'), sublabel: t('landing.stats.cities_desc') },
        { value: 99.9, suffix: '%', label: t('landing.stats.uptime'), sublabel: t('landing.stats.uptime_desc'), decimals: 1 },
    ];

    return (
        <section className={cn(LANDING_SECTION, 'border-b border-slate-200/60')}>
            <div className={cn(LANDING_CONTAINER, 'max-w-5xl')}>
                <div className="mx-auto max-w-3xl text-center space-y-3 mb-10">
                    <h2 className={LANDING_H2}>{t('landing.stats.title')}</h2>
                    <p className={LANDING_P}>{t('landing.stats.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="space-y-1 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm"
                        >
                            <div className="flex items-baseline justify-center">
                                <NumberTicker
                                    value={stat.value}
                                    decimalPlaces={stat.decimals || 0}
                                    className="text-3xl sm:text-4xl font-extrabold text-slate-900"
                                />
                                <span className="text-xl sm:text-2xl font-bold text-slate-900 ml-0.5">
                                    {stat.suffix}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                {stat.label}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500">
                                {stat.sublabel}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
