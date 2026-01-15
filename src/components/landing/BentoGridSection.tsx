'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaWallet, FaBolt, FaShieldAlt, FaBoxOpen } from 'react-icons/fa';

export default function BentoGridSection() {
    const { t } = useTranslation();

    return (
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.bento.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.bento.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-[auto,auto,auto] md:grid-rows-[200px,200px] gap-4">

                    {/* Item 1: Large Left - Payments */}
                    <div className="md:col-span-2 md:row-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-50 dark:bg-brand-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                        <div className="relative z-10">
                            <div className="text-brand-500 mb-2">
                                <FaWallet className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('landing.bento.payments.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">{t('landing.bento.payments.desc')}</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {['Cards'].map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* Item 2: Small Right Top - Speed */}
                    <div className="md:col-span-1 md:row-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="text-[#173C82] dark:text-blue-400 mb-2">
                            <FaBolt className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{t('landing.bento.speed.title')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{t('landing.bento.speed.desc')}</p>
                    </div>

                    {/* Item 3: Small Left Bottom - Reliable */}
                    <div className="md:col-span-1 md:row-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="text-emerald-500 mb-2">
                            <FaShieldAlt className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{t('landing.bento.reliable.title')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{t('landing.bento.reliable.desc')}</p>
                    </div>

                    {/* Item 4: Large Right Bottom - Inventory */}
                    <div className="md:col-span-2 md:row-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 dark:bg-purple-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>
                        <div className="relative z-10">
                            <div className="text-purple-500 mb-2">
                                <FaBoxOpen className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('landing.bento.inventory.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">{t('landing.bento.inventory.desc')}</p>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
