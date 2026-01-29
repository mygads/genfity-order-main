'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function HowItWorksSection() {
    const { t } = useTranslation();

    const steps = [
        { num: 1, color: 'bg-[#173C82]' },
        { num: 2, color: 'bg-brand-500' },
        { num: 3, color: 'bg-emerald-500' }
    ];

    return (
        <section id="how-it-works" className={cn(LANDING_SECTION, 'overflow-hidden')}>

            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[55%] left-[15%] right-[15%] h-0.5 bg-gray-100 -z-0"></div>

            <div className={cn(LANDING_CONTAINER, 'max-w-5xl relative z-10')}>
                <BlurFade delay={0.1} inView>
                    <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                        <h2 className={LANDING_H2}>{t('landing.howItWorks.title')}</h2>
                        <p className={LANDING_P}>{t('landing.howItWorks.subtitle')}</p>
                    </div>
                </BlurFade>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
                    {steps.map((step, i) => (
                        <BlurFade key={step.num} delay={0.2 + (i * 0.1)} inView>
                            <div className="relative bg-white md:bg-transparent p-6 md:p-0 rounded-xl border md:border-none border-gray-100 text-center group">
                                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${step.color} text-white flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                                    {step.num}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {t(`landing.howItWorks.step${step.num}.title`)}
                                </h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                    {t(`landing.howItWorks.step${step.num}.desc`)}
                                </p>
                            </div>
                        </BlurFade>
                    ))}
                </div>
            </div>
        </section>
    );
}
