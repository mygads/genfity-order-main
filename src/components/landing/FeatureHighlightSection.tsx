'use client';

import Image from 'next/image';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function FeatureHighlightSection() {
    const { t } = useTranslation();

    const [activeIndex, setActiveIndex] = React.useState(0);
    const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    const highlights = [
        {
            key: 'smartMenu',
            image: '/images/landing/mobile_mockup_iphone.png',
            iconColor: 'bg-brand-500 text-white',
        },
        {
            key: 'powerfulDashboard',
            image: '/images/landing/desktop_mockup_macbook.png',
            iconColor: 'bg-[#173C82] text-white',
        },
        {
            key: 'kitchenDisplay',
            image: '/images/landing/tablet_mockup_ipad.png',
            iconColor: 'bg-emerald-500 text-white',
        }
    ];

    React.useEffect(() => {
        const elements = itemRefs.current.filter(Boolean) as HTMLDivElement[];
        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

                if (visible[0]?.target) {
                    const idx = elements.findIndex((el) => el === visible[0].target);
                    if (idx >= 0) setActiveIndex(idx);
                }
            },
            {
                root: null,
                threshold: [0.35, 0.5, 0.65],
                rootMargin: '-20% 0px -55% 0px',
            }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <section className={LANDING_SECTION}>
            <div className={cn(LANDING_CONTAINER, 'space-y-12 lg:space-y-16')}>

                <div className="mx-auto max-w-3xl text-center space-y-3">
                    <h2 className={LANDING_H2}>{t('landing.highlights.sectionTitle')}</h2>
                    <p className={LANDING_P}>{t('landing.highlights.sectionSubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
                    {/* Left: scrollable narrative */}
                    <div className="space-y-6">
                        {highlights.map((feature, index) => (
                            <div
                                key={feature.key}
                                ref={(el) => {
                                    itemRefs.current[index] = el;
                                }}
                                className={cn(
                                    'rounded-2xl border border-gray-200 bg-white/60 backdrop-blur p-6 shadow-sm',
                                    'min-h-[52vh] flex flex-col justify-center',
                                    activeIndex === index ? 'ring-2 ring-[#173C82]/15' : 'ring-0'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shadow-sm', feature.iconColor)}>
                                        <span className="text-sm font-extrabold">{index + 1}</span>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                                            {t(`landing.highlights.${feature.key}.title`)}
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {t(`landing.highlights.${feature.key}.desc`)}
                                        </p>

                                        <ul className="space-y-2 pt-1">
                                            {[1, 2, 3].map((item) => (
                                                <li key={item} className="flex items-start gap-2">
                                                    <span className="mt-0.5 h-4 w-4 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    </span>
                                                    <span className="text-sm text-gray-700">
                                                        {t(`landing.highlights.${feature.key}.point${item}`)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: sticky preview (changes on scroll) */}
                    <div className="lg:sticky lg:top-24">
                        <div className="relative rounded-2xl border border-gray-200 bg-white/60 backdrop-blur p-6 shadow-sm">
                            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(600px_circle_at_50%_20%,rgba(23,60,130,0.12),transparent_60%)]" />
                            <div className="relative mx-auto w-full max-w-md aspect-[4/3]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={highlights[activeIndex]?.key}
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                        transition={{ duration: 0.25 }}
                                        className="absolute inset-0"
                                    >
                                        <Image
                                            src={highlights[activeIndex]?.image}
                                            alt={t(`landing.highlights.${highlights[activeIndex]?.key}.title`)}
                                            fill
                                            className="object-contain drop-shadow-lg"
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
