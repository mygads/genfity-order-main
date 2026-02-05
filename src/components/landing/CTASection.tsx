'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import { BorderBeam } from '@/components/magicui/border-beam';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className={'bg-white py-12 pb-20'}>
            <div className={'max-w-6xl mx-auto px-6'}>
                <BlurFade delay={0.2} inView>
                    <div className="relative bg-gradient-to-br from-[#173C82] via-[#1a4590] to-[#0f2a5c] rounded-2xl p-8 md:p-10 text-center overflow-hidden shadow-xl">
                        <BorderBeam size={200} duration={12} delay={0} borderWidth={1.5} />

                        {/* Decorative orbs */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-300/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10 space-y-5">
                            <div>
                                <h2 className={cn(LANDING_H2, 'text-white leading-tight mb-2')}>
                                    Create Your Merchant Account in Minutes
                                </h2>
                                <p className={cn(LANDING_P, 'text-blue-100 max-w-lg mx-auto')}>
                                    No sales call. No setup fee. Start managing your business today.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <Link
                                    href="/admin/register"
                                    className="group inline-flex items-center justify-center px-6 py-2.5 bg-white hover:bg-gray-100 text-[#173C82] font-bold text-sm rounded-lg shadow-lg transition-all hover:-translate-y-0.5"
                                >
                                    <span className="flex items-center gap-2">
                                        Create Free Merchant Account
                                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                </Link>

                                <div className="flex items-center gap-1.5 text-blue-200 text-xs font-medium">
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    No commitment required
                                </div>
                            </div>
                        </div>
                    </div>
                </BlurFade>
            </div>
        </section>
    );
}
