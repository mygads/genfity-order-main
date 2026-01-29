'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaWallet, FaBolt, FaShieldAlt, FaBoxOpen } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function BentoGridSection() {
    const { t } = useTranslation();

    return (
        <section className={LANDING_SECTION}>
            <div className={LANDING_CONTAINER}>
                <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                    <h2 className={LANDING_H2}>
                        {t('landing.bento.title')}
                    </h2>
                    <p className={LANDING_P}>
                        {t('landing.bento.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-[auto,auto,auto] md:grid-rows-[200px,200px] gap-4">

                    {/* Item 1: Large Left - Payments */}
                    <div className="md:col-span-2 md:row-span-1 bg-white/80 backdrop-blur rounded-xl p-5 border border-gray-100 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                        <div className="relative z-10">
                            <div className="text-brand-500 mb-2">
                                <FaWallet className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('landing.bento.payments.title')}</h3>
                            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">{t('landing.bento.payments.desc')}</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {['Cards'].map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{tag}</span>
                            ))}
                        </div>
                    </div>

                    {/* Item 2: Small Right Top - Speed */}
                    <div className="md:col-span-1 md:row-span-1 bg-white/80 backdrop-blur rounded-xl p-5 border border-gray-100 relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="text-[#173C82] mb-2">
                            <FaBolt className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">{t('landing.bento.speed.title')}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{t('landing.bento.speed.desc')}</p>
                    </div>

                    {/* Item 3: Small Left Bottom - Reliable */}
                    <div className="md:col-span-1 md:row-span-1 bg-white/80 backdrop-blur rounded-xl p-5 border border-gray-100 relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="text-emerald-500 mb-2">
                            <FaShieldAlt className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">{t('landing.bento.reliable.title')}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{t('landing.bento.reliable.desc')}</p>
                    </div>

                    {/* Item 4: Large Right Bottom - Inventory */}
                    <div className="md:col-span-2 md:row-span-1 bg-white/80 backdrop-blur rounded-xl p-5 border border-gray-100 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>
                        <div className="relative z-10">
                            <div className="text-purple-500 mb-2">
                                <FaBoxOpen className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('landing.bento.inventory.title')}</h3>
                            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">{t('landing.bento.inventory.desc')}</p>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
