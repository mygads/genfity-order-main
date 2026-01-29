'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import { PulsatingButton } from '@/components/magicui/pulsating-button';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function ReferralSection() {
    const { t } = useTranslation();

    return (
        <section id="referral" className={cn(LANDING_SECTION, 'border-t border-gray-100')}>
            <div className={cn(LANDING_CONTAINER, 'max-w-4xl')}>
                <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                    <h2 className={LANDING_H2}>{t('landing.referral.title')}</h2>
                    <p className={LANDING_P}>{t('landing.referral.desc')}</p>
                </div>

                <BlurFade delay={0.1} inView>
                    <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-gray-200">

                        {/* Content */}
                        <div className="flex-1 text-center md:text-left space-y-2">

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 max-w-md mx-auto md:mx-0">
                                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                                        {t('landing.referral.steps.step1')}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-800">
                                        {t('landing.referral.steps.step1Desc')}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                                        {t('landing.referral.steps.step2')}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-800">
                                        {t('landing.referral.steps.step2Desc')}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                                        {t('landing.referral.steps.step3')}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-800">
                                        {t('landing.referral.steps.step3Desc')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center md:justify-start gap-4 pt-1">
                                <div className="text-center md:text-left">
                                    <div className="text-xl font-bold text-[#173C82]">{t('landing.referral.commission')}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('landing.referral.period')}</div>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="flex-shrink-0">
                            <Link href="/influencer/register">
                                <PulsatingButton pulseColor="#3b82f6" className="text-sm px-6 py-2">
                                    {t('landing.referral.cta')}
                                </PulsatingButton>
                            </Link>
                        </div>
                    </div>
                </BlurFade>
            </div>
        </section>
    );
}
