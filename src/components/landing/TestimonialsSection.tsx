'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import Marquee from '@/components/magicui/marquee';
import { FaStar } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function TestimonialsSection() {
    const { t } = useTranslation();

    const baseTestimonials = [
        { id: 1, avatar: '👨‍🍳' },
        { id: 2, avatar: '👩‍💼' },
        { id: 3, avatar: '👨‍💻' },
        { id: 4, avatar: '👩‍🔧' },
        { id: 5, avatar: '👨‍🏫' },
    ];

    const testimonials = Array.from({ length: 24 }, (_, idx) => {
        const item = baseTestimonials[idx % baseTestimonials.length];
        return { ...item, key: `${idx}-${item.id}` };
    });

    const TestimonialCard = ({ item }: { item: { id: number; avatar: string } }) => (
        <div className={cn(
            "relative w-72 cursor-pointer overflow-hidden rounded-xl border p-4 mx-2",
            "border-gray-200 bg-white/80 backdrop-blur hover:bg-white hover:border-gray-300",
            "transition-all duration-300 hover:shadow-md"
        )}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg">
                    {item.avatar}
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-900">
                        {t(`landing.testimonials.${item.id}.author`)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                        {t(`landing.testimonials.${item.id}.role`)}
                    </p>
                </div>
                <div className="flex gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar key={star} className="h-3 w-3 text-yellow-400" />
                    ))}
                </div>
            </div>
            <blockquote className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                &quot;{t(`landing.testimonials.${item.id}.quote`)}&quot;
            </blockquote>
        </div>
    );

    return (
        <section className={cn(LANDING_SECTION, 'border-b border-gray-100 overflow-hidden')}>
            <div className={cn(LANDING_CONTAINER, 'relative z-10')}>
                <BlurFade delay={0.1} inView>
                    <div className="mx-auto max-w-2xl text-center mb-12 space-y-3">
                        <h2 className={LANDING_H2}>
                            {t('landing.testimonials.title')}
                        </h2>
                        <p className={LANDING_P}>
                            {t('landing.testimonials.subtitle')}
                        </p>
                    </div>
                </BlurFade>

                {/* Two-row Marquee */}
                <div className="relative">
                    <Marquee pauseOnHover className="[--duration:18s]">
                        {testimonials.slice(0, 12).map((item) => (
                            <TestimonialCard key={item.key} item={item} />
                        ))}
                    </Marquee>

                    <Marquee pauseOnHover reverse className="[--duration:22s] mt-4">
                        {testimonials.slice(12).map((item) => (
                            <TestimonialCard key={item.key} item={item} />
                        ))}
                    </Marquee>

                    {/* Gradient overlays */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white/80"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white/80"></div>
                </div>
            </div>
        </section>
    );
}
