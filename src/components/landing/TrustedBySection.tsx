"use client";

import { useTranslation } from '@/lib/i18n/useTranslation';
import Marquee from "@/components/magicui/marquee";
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function TrustedBySection() {
    const { t } = useTranslation();

    const chips = [
        t('landing.trustedBy.chips.restaurant'),
        t('landing.trustedBy.chips.cafe'),
        t('landing.trustedBy.chips.foodCourt'),
        t('landing.trustedBy.chips.bar'),
        t('landing.trustedBy.chips.bakery'),
        t('landing.trustedBy.chips.takeaway'),
        t('landing.trustedBy.chips.delivery'),
        t('landing.trustedBy.chips.qrOrdering'),
        t('landing.trustedBy.chips.pos'),
        t('landing.trustedBy.chips.kds'),
    ];

    const marqueeChips = [...chips, ...chips];

    return (
        <section className={cn(LANDING_SECTION, 'border-b border-gray-100')}>
            <div className={cn(LANDING_CONTAINER, 'mx-auto max-w-3xl text-center space-y-3 mb-10')}>
                <h2 className={LANDING_H2}>{t('landing.trustedBy.title')}</h2>
                <p className={LANDING_P}>{t('landing.trustedBy.subtitle')}</p>
            </div>

            <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
                <Marquee className="[--duration:16s]" pauseOnHover reverse>
                    {marqueeChips.map((label, idx) => (
                        <div
                            key={idx}
                            className="mx-3 inline-flex items-center rounded-full border border-gray-200 bg-white/70 backdrop-blur px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-white"
                        >
                            {label}
                        </div>
                    ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/70"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/70"></div>
            </div>
        </section>
    );
}
