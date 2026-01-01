'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaWallet, FaBolt, FaShieldAlt, FaBoxOpen } from 'react-icons/fa';

export default function BentoGridSection() {
    const { t } = useTranslation();

    return (
        <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.bento.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.bento.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-[auto,auto,auto] md:grid-rows-[220px,220px] gap-5">

                    {/* Item 1: Large Left */}
                    <div className="md:col-span-2 md:row-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-shadow">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 dark:bg-orange-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="text-orange-600 mb-3">
                                <FaWallet className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">{t('landing.bento.payments.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">{t('landing.bento.payments.desc')}</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                            {['QRIS', 'E-Wallet', 'Cards'].map(tag => (
                                <span key={tag} className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* Item 2: Small Right Top */}
                    <div className="md:col-span-1 md:row-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative group hover:shadow-lg transition-shadow">
                        <div className="text-blue-600 mb-3">
                            <FaBolt className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">{t('landing.bento.speed.title')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{t('landing.bento.speed.desc')}</p>
                    </div>

                    {/* Item 3: Small Left Bottom */}
                    <div className="md:col-span-1 md:row-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative group hover:shadow-lg transition-shadow">
                        <div className="text-green-600 mb-3">
                            <FaShieldAlt className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">{t('landing.bento.reliable.title')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{t('landing.bento.reliable.desc')}</p>
                    </div>

                    {/* Item 4: Large Right Bottom */}
                    <div className="md:col-span-2 md:row-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-shadow">
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 dark:bg-purple-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="text-purple-600 mb-3">
                                <FaBoxOpen className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">{t('landing.bento.inventory.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">{t('landing.bento.inventory.desc')}</p>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
