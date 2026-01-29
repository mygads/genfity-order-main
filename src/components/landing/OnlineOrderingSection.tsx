'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import { InteractiveHoverButton } from '@/components/magicui/interactive-hover-button';
import { FaChartLine, FaMoneyBillWave, FaRocket, FaUsers } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function OnlineOrderingSection() {
    const { t } = useTranslation();

    const benefits = [
        { icon: FaRocket, title: t('landing.onlineOrder.benefits.expandReach.title'), desc: t('landing.onlineOrder.benefits.expandReach.desc') },
        { icon: FaMoneyBillWave, title: t('landing.onlineOrder.benefits.lowCommission.title'), desc: t('landing.onlineOrder.benefits.lowCommission.desc') },
        { icon: FaUsers, title: t('landing.onlineOrder.benefits.dataStorage.title'), desc: t('landing.onlineOrder.benefits.dataStorage.desc') },
        { icon: FaChartLine, title: t('landing.onlineOrder.orderModes.badge'), desc: t('landing.onlineOrder.orderModes.desc') },
    ];

    return (
        <section className={cn(LANDING_SECTION, 'border-b border-gray-100')}>
            <div className={cn(LANDING_CONTAINER, 'max-w-6xl')}>
                <BlurFade delay={0.1} inView>
                    <div>
                        <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                            <h2 className={LANDING_H2}>{t('landing.onlineOrder.title')}</h2>
                            <p className={LANDING_P}>{t('landing.onlineOrder.subtitle')}</p>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-12">
                            {/* Text Content */}
                            <div className="flex-1 space-y-6 text-center lg:text-left">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {benefits.map((item, i) => (
                                    <div key={i} className="flex gap-3 p-3 bg-white/70 backdrop-blur rounded-xl border border-gray-100">
                                        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/70 text-[#173C82] shadow-sm">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2">
                                <InteractiveHoverButton className="w-full sm:w-auto">
                                    {t('landing.onlineOrder.cta')}
                                </InteractiveHoverButton>
                            </div>
                        </div>

                        {/* Visual/Image area - simplified with code illustration for now if no image */}
                        <div className="flex-1 w-full max-w-md lg:max-w-none">
                            <div className="relative aspect-[4/3] bg-white/70 backdrop-blur rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex items-center justify-center p-8">
                                <div className="absolute inset-0 bg-grid-black/[0.05]" />
                                {/* Mock UI */}
                                <div className="relative w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                                    <div className="h-4 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="h-24 bg-blue-50 rounded"></div>
                                            <div className="h-24 bg-orange-50 rounded"></div>
                                        </div>
                                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                    </div>
                                    {/* Floating Stats */}
                                    <div className="absolute bottom-4 right-4 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-gray-100">
                                        <span className="text-xs font-bold text-green-500">Orders +13.5% 🚀</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </BlurFade>
            </div>
        </section>
    );
}
