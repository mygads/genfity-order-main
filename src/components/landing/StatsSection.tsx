'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

export default function StatsSection() {
    const { t } = useTranslation();

    const stats = [
        {
            value: "85,000+",
            label: t('landing.stats.merchants'),
            description: t('landing.stats.merchants_desc')
        },
        {
            value: "500+",
            label: t('landing.stats.cities'),
            description: t('landing.stats.cities_desc')
        },
        {
            value: "9+",
            label: t('landing.stats.years'),
            description: t('landing.stats.years_desc')
        }
    ];

    return (
        <section className="py-16 bg-blue-600 dark:bg-blue-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {t('landing.stats.title')}
                    </h2>
                    <p className="text-blue-100 max-w-2xl mx-auto">
                        {t('landing.stats.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    {stats.map((stat, index) => (
                        <div key={index} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
                            <div className="text-4xl md:text-5xl font-extrabold mb-2 text-white">
                                {stat.value}
                            </div>
                            <div className="text-xl font-semibold mb-2 text-blue-100">
                                {stat.label}
                            </div>
                            <p className="text-sm text-blue-200">
                                {stat.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
