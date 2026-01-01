'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Image from 'next/image';

export default function HowItWorksSection() {
    const { t } = useTranslation();

    return (
        <section id="how-it-works" className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.howItWorks.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.howItWorks.subtitle')}
                    </p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[100px] left-[16%] right-[16%] h-1 bg-gray-100 dark:bg-gray-800 -z-0 border-t-2 border-dashed border-gray-300 dark:border-gray-700"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="relative w-48 h-48 mb-6 transition-transform group-hover:scale-105 duration-300">
                                <Image
                                    src="/images/landing/illustration_register.png"
                                    alt="Register Step"
                                    fill
                                    className="object-contain drop-shadow-md"
                                />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-gray-900">1</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('landing.howItWorks.step1.title')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                                {t('landing.howItWorks.step1.desc')}
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="relative w-48 h-48 mb-6 transition-transform group-hover:scale-105 duration-300">
                                <Image
                                    src="/images/landing/illustration_setup.png"
                                    alt="Setup Step"
                                    fill
                                    className="object-contain drop-shadow-md"
                                />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-gray-900">2</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('landing.howItWorks.step2.title')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                                {t('landing.howItWorks.step2.desc')}
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="relative w-48 h-48 mb-6 transition-transform group-hover:scale-105 duration-300">
                                <Image
                                    src="/images/landing/illustration_golive.png"
                                    alt="Go Live Step"
                                    fill
                                    className="object-contain drop-shadow-md"
                                />
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-gray-900">3</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('landing.howItWorks.step3.title')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                                {t('landing.howItWorks.step3.desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
