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
            iconColor: 'bg-orange-500 text-white',
        },
        {
            key: 'powerfulDashboard',
            image: '/images/landing/desktop_mockup_macbook.png',
            reverse: true,
            iconColor: 'bg-[#173C82] text-white',
        },
        {
            key: 'kitchenDisplay',
            image: '/images/landing/tablet_mockup_ipad.png',
            reverse: false,
            iconColor: 'bg-emerald-500 text-white',
        }
    ];

    return (
        <section className="py-16 lg:py-20 overflow-hidden bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 lg:space-y-24">

                {highlights.map((feature, index) => (
                    <div
                        key={feature.key}
                        className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-12 ${feature.reverse ? 'lg:flex-row-reverse' : ''}`}
                    >
                        {/* Image Side */}
                        <div className="w-full lg:w-1/2 relative group">
                            {/* Subtle background blur */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[80px] opacity-20 -z-10 ${index % 2 === 0 ? 'bg-orange-300 dark:bg-orange-900' : 'bg-blue-300 dark:bg-blue-900'
                                }`}></div>

                            <div className="relative w-full aspect-[4/3] transform transition-transform duration-500 hover:scale-[1.02] max-w-md mx-auto">
                                <Image
                                    src={feature.image}
                                    alt={t(`landing.highlights.${feature.key}.title`)}
                                    fill
                                    className="object-contain drop-shadow-lg"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                />
                            </div>
                        </div>

                        {/* Text Side */}
                        <div className="w-full lg:w-1/2 space-y-4 max-w-lg mx-auto lg:mx-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${feature.iconColor}`}>
                                {feature.key === 'smartMenu' && (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                )}
                                {feature.key === 'powerfulDashboard' && (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                )}
                                {feature.key === 'kitchenDisplay' && (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                )}
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                {t(`landing.highlights.${feature.key}.title`)}
                            </h2>

                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t(`landing.highlights.${feature.key}.desc`)}
                            </p>

                            <ul className="space-y-2 pt-1">
                                {[1, 2, 3].map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {t(`landing.highlights.${feature.key}.point${item}`)}
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
