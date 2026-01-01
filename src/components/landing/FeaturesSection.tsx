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
        <section id="features" className="py-20 lg:py-24 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        {t('landing.features.title')}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        {t('landing.features.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, _index) => (
                        <div
                            key={feature.key}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group text-center flex flex-col items-center hover:-translate-y-1"
                        >
                            <div className="mb-6 relative w-40 h-40 transition-transform group-hover:scale-105 duration-300">
                                <Image
                                    src={feature.image}
                                    alt={t(`landing.features.${feature.key}.title`)}
                                    fill
                                    className="object-contain drop-shadow-md"
                                />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {t(`landing.features.${feature.key}.title`)}
                            </h3>

                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t(`landing.features.${feature.key}.desc`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
