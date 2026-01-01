'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Image from 'next/image';

export default function FeaturesSection() {
    const { t } = useTranslation();

    const features = [
        {
            key: 'qrcode',
            image: '/images/landing/features/qrcode.png'
        },
        {
            key: 'analytics',
            image: '/images/landing/features/analytics.png'
        },
        {
            key: 'inventory',
            image: '/images/landing/features/inventory.png'
        },
        {
            key: 'multidevice',
            image: '/images/landing/features/multidevice.png'
        },
        {
            key: 'payments',
            image: '/images/landing/features/payments.png'
        },
        {
            key: 'kitchen',
            image: '/images/landing/features/kitchen.png'
        }
    ];

    return (
        <section id="features" className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.features.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.features.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.key}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group text-center flex flex-col items-center"
                        >
                            <div className="mb-5 relative w-32 h-32 transition-transform group-hover:scale-105 duration-300">
                                <Image
                                    src={feature.image}
                                    alt={t(`landing.features.${feature.key}.title`)}
                                    fill
                                    className="object-contain drop-shadow-md"
                                />
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {t(`landing.features.${feature.key}.title`)}
                            </h3>

                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t(`landing.features.${feature.key}.desc`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
