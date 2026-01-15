'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Image from 'next/image';

export default function HowItWorksSection() {
    const { t } = useTranslation();

    const steps = [
        {
            num: 1,
            image: '/images/landing/illustration_register.png',
            color: 'bg-[#173C82]'
        },
        {
            num: 2,
            image: '/images/landing/illustration_setup.png',
            color: 'bg-brand-500'
        },
        {
            num: 3,
            image: '/images/landing/illustration_golive.png',
            color: 'bg-emerald-500'
        }
    ];

    return (
        <section id="how-it-works" className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.howItWorks.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.howItWorks.subtitle')}
                    </p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-20 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#173C82] via-brand-500 to-emerald-500 opacity-30"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative z-10">
                        {steps.map((step) => (
                            <div key={step.num} className="flex flex-col items-center text-center group">
                                <div className="relative w-40 h-40 mb-5 transition-transform group-hover:scale-105 duration-300">
                                    <Image
                                        src={step.image}
                                        alt={`Step ${step.num}`}
                                        fill
                                        className="object-contain drop-shadow-md"
                                    />
                                    <div className={`absolute -top-1 -right-1 w-7 h-7 ${step.color} text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white dark:border-gray-900`}>
                                        {step.num}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    {t(`landing.howItWorks.step${step.num}.title`)}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                                    {t(`landing.howItWorks.step${step.num}.desc`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
