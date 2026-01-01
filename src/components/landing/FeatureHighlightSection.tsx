'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function FeatureHighlightSection() {
    const { t } = useTranslation();

    const highlights = [
        {
            key: 'smartMenu',
            image: '/images/landing/mobile_mockup_iphone.png',
            reverse: false,
            color: 'bg-orange-50 dark:bg-orange-900/10',
            iconColor: 'bg-orange-500 text-white',
        },
        {
            key: 'powerfulDashboard',
            image: '/images/landing/desktop_mockup_macbook.png',
            reverse: true,
            color: 'bg-white dark:bg-gray-800',
            iconColor: 'bg-blue-500 text-white',
        },
        {
            key: 'kitchenDisplay',
            image: '/images/landing/tablet_mockup_ipad.png',
            reverse: false,
            color: 'bg-orange-50 dark:bg-orange-900/10',
            iconColor: 'bg-green-500 text-white',
        }
    ];

    return (
        <section className="py-16 lg:py-24 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 lg:space-y-32">

                {highlights.map((feature, index) => (
                    <div
                        key={feature.key}
                        className={`flex flex-col lg:flex-row items-center gap-10 lg:gap-16 ${feature.reverse ? 'lg:flex-row-reverse' : ''}`}
                    >
                        {/* Image Side - Reduced Size */}
                        <div className="w-full lg:w-1/2 relative group perspective-1000">
                            {/* Decorative blobs */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] rounded-full blur-[60px] opacity-30 -z-10 ${index % 2 === 0 ? 'bg-orange-200 dark:bg-orange-900/20' : 'bg-blue-200 dark:bg-blue-900/20'
                                }`}></div>

                            <div className="relative w-full aspect-[4/3] transform transition-transform duration-700 hover:scale-[1.01] hover:rotate-1 max-w-lg mx-auto">
                                <Image
                                    src={feature.image}
                                    alt={t(`landing.highlights.${feature.key}.title` as any)}
                                    fill
                                    className="object-contain drop-shadow-xl"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                />
                            </div>
                        </div>

                        {/* Text Side - Compact Typography */}
                        <div className="w-full lg:w-1/2 space-y-4 max-w-lg mx-auto lg:mx-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20 ${feature.iconColor}`}>
                                {feature.key === 'smartMenu' && (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                )}
                                {feature.key === 'powerfulDashboard' && (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                )}
                                {feature.key === 'kitchenDisplay' && (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                )}
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                {t(`landing.highlights.${feature.key}.title` as any)}
                            </h2>

                            <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                                {t(`landing.highlights.${feature.key}.desc` as any)}
                            </p>

                            <ul className="space-y-3 pt-2">
                                {[1, 2, 3].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5">
                                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t(`landing.highlights.${feature.key}.point${item}` as any)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}

            </div>
        </section>
    );
}
