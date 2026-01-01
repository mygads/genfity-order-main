'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function BusinessTypeSection() {
    const { t } = useTranslation();

    const types = [
        {
            key: 'fnb',
            image: '/images/landing/business-types/fnb.png',
            link: '#'
        },
        {
            key: 'retail',
            image: '/images/landing/business-types/retail.png',
            link: '#'
        },
        {
            key: 'service',
            image: '/images/landing/business-types/service.png',
            link: '#'
        }
    ];

    return (
        <section className="py-20 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {t('landing.business_type.title')}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {t('landing.business_type.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {types.map((type) => (
                        <div
                            key={type.key}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden hover:translate-y-[-5px] transition-transform duration-300 border border-gray-100 dark:border-gray-700"
                        >
                            <div className="relative h-64 w-full bg-blue-50 dark:bg-gray-700/50">
                                <Image
                                    src={type.image}
                                    alt={t(`landing.business_type.${type.key}.title`)}
                                    fill
                                    className="object-contain p-6"
                                />
                            </div>
                            <div className="p-8">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    {t(`landing.business_type.${type.key}.title`)}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                    {t(`landing.business_type.${type.key}.desc`)}
                                </p>
                                <Link
                                    href={type.link}
                                    className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 transition-colors group"
                                >
                                    {t('landing.common.learn_more')}
                                    <FaArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
