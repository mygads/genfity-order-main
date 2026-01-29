"use client";

import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from "@/lib/utils";
import BlurFade from "@/components/magicui/blur-fade";
import Image from 'next/image';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
                className
            )}
        >
            {children}
        </div>
    );
};

const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input p-4 bg-white/80 backdrop-blur border border-gray-200 justify-between flex flex-col space-y-4 relative overflow-hidden",
                className
            )}
        >
            <div className="group-hover/bento:translate-x-2 transition duration-200">
                {icon}
                <div className="font-sans font-semibold text-gray-900 mb-2 mt-2">
                    {title}
                </div>
                <div className="font-sans font-normal text-gray-600 text-xs text-pretty">
                    {description}
                </div>
            </div>
            {header && <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gray-50 items-center justify-center overflow-hidden relative">
                {header}
            </div>}
        </div>
    );
};

export default function FeaturesSection() {
    const { t } = useTranslation();

    const items = [
        {
            title: t('landing.features.qrcode.title'),
            description: t('landing.features.qrcode.desc'),
            header: (
                <div className="relative w-full h-full flex items-center justify-center bg-blue-50">
                    <Image
                        src="/images/landing/features/qrcode.png"
                        alt={t('landing.features.qrcode.title')}
                        width={220}
                        height={220}
                        className="object-contain h-32 w-auto drop-shadow-md transform group-hover/bento:scale-105 transition-transform duration-300"
                    />
                </div>
            ),
            icon: <svg className="w-6 h-6 text-[#173C82]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
            className: "md:col-span-2",
        },
        {
            title: t('landing.features.inventory.title'),
            description: t('landing.features.inventory.desc'),
            header: (
                <div className="relative w-full h-full flex items-center justify-center bg-green-50">
                    <Image
                        src="/images/landing/features/inventory.png"
                        alt={t('landing.features.inventory.title')}
                        width={220}
                        height={220}
                        className="object-contain h-32 w-auto drop-shadow-md transform group-hover/bento:scale-105 transition-transform duration-300"
                    />
                </div>
            ),
            icon: <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
            className: "md:col-span-1",
        },
        {
            title: t('landing.features.kitchen.title'),
            description: t('landing.features.kitchen.desc'),
            header: (
                <div className="relative w-full h-full flex items-center justify-center bg-orange-50">
                    <Image
                        src="/images/landing/features/kitchen.png"
                        alt={t('landing.features.kitchen.title')}
                        width={220}
                        height={220}
                        className="object-contain h-32 w-auto drop-shadow-md transform group-hover/bento:scale-105 transition-transform duration-300"
                    />
                </div>
            ),
            icon: <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            className: "md:col-span-1",
        },
        {
            title: t('landing.features.analytics.title'),
            description: t('landing.features.analytics.desc'),
            header: (
                <div className="relative w-full h-full flex items-center justify-center bg-blue-50">
                    <Image
                        src="/images/landing/features/analytics.png"
                        alt={t('landing.features.analytics.title')}
                        width={220}
                        height={220}
                        className="object-contain h-32 w-auto drop-shadow-md transform group-hover/bento:scale-105 transition-transform duration-300"
                    />
                </div>
            ),
            icon: <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            className: "md:col-span-2",
        },
    ];

    return (
        <section id="features" className={cn(LANDING_SECTION, 'border-b border-gray-100 overflow-hidden')}>
            <div className={cn(LANDING_CONTAINER, 'relative z-10')}>
                <BlurFade delay={0.1} inView>
                    <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                        <h2 className={LANDING_H2}>{t('landing.features.title')}</h2>
                        <p className={LANDING_P}>{t('landing.features.subtitle')}</p>
                    </div>
                </BlurFade>

                <BentoGrid className="max-w-5xl mx-auto">
                    {items.map((item, i) => (
                        <BentoGridItem
                            key={i}
                            title={item.title}
                            description={item.description}
                            header={item.header}
                            icon={item.icon}
                            className={item.className}
                        />
                    ))}
                </BentoGrid>
            </div>
        </section>
    );
}
