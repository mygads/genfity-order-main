'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function HeroSection() {
    const { t } = useTranslation();
    const router = useRouter();
    const [merchantCode, setMerchantCode] = useState('');

    const handleMerchantCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (merchantCode.trim()) {
            router.push(`/${merchantCode.toUpperCase()}`);
        }
    };

    return (
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            {/* 
              Background Animations - Mimicking Olsera's "floating elements"
              Using CSS animations defined in tailwind config or arbitrary values
            */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Floating Blue Circle (Top Left) */}
                <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-50/80 dark:bg-blue-900/10 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />

                {/* Rotating Pattern (Bottom Right) */}
                <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-orange-50/80 dark:bg-orange-900/10 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite_reverse]" />

                {/* Small floating dots/shapes */}
                <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[#173C82] rounded-full opacity-20 animate-[pulse_4s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/3 right-1/3 w-6 h-6 bg-orange-400 rounded-full opacity-20 animate-[bounce_5s_infinite]" />
            </div>

            <div className="relative z-10 max-w-[1126px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

                    {/* Left Content */}
                    <div className="w-full lg:w-[45%] text-center lg:text-left space-y-6">
                        {/* Tagline Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-[#173C82] dark:text-blue-300 font-bold text-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#173C82]"></span>
                            </span>
                            #1 POS System for Growth
                        </div>

                        {/* Main Headline - Approx 48px, Bold 700 */}
                        <h1 className="text-[40px] leading-[1.2] lg:text-[48px] lg:leading-[67.2px] font-bold text-gray-900 dark:text-white">
                            <span className="text-[#173C82] dark:text-blue-400">#SolusiPasti</span>
                            <span className="block text-gray-900 dark:text-white">
                                Tumbuhkan Bisnis Anda
                            </span>
                        </h1>

                        <p className="text-[16px] leading-[24px] text-gray-600 dark:text-gray-300 max-w-lg mx-auto lg:mx-0 font-normal">
                            Bergabunglah dengan ribuan pengusaha sukses yang telah mempercayakan operasional bisnisnya pada sistem kami.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                            {/* Primary CTA - Solid Blue #173C82, 56px height */}
                            <Link
                                href="/merchant/register"
                                className="px-8 h-[56px] flex items-center justify-center bg-[#173C82] hover:bg-[#122c60] text-white text-[20px] font-semibold rounded-[5px] shadow-lg shadow-blue-900/10 transition-all transform hover:-translate-y-0.5"
                            >
                                {t('landing.hero.cta.register').split(' - ')[0]}
                            </Link>

                            {/* Merchant Code Input */}
                            <form onSubmit={handleMerchantCodeSubmit} className="relative w-full sm:w-[280px]">
                                <input
                                    type="text"
                                    value={merchantCode}
                                    onChange={(e) => setMerchantCode(e.target.value)}
                                    placeholder={t('landing.hero.merchantCodeHint')}
                                    className="w-full h-[56px] pl-5 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[5px] focus:border-[#173C82] focus:ring-1 focus:ring-[#173C82] outline-none transition-all placeholder:text-gray-400 text-gray-900 dark:text-white font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!merchantCode.trim()}
                                    className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 hover:bg-[#173C82] hover:text-white text-gray-400 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </button>
                            </form>
                        </div>

                        <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 pt-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span>Free Trial 14 Days</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span>No Credit Card</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Image - Larger & Cleaner */}
                    <div className="w-full lg:w-[55%] relative flex justify-center lg:justify-end">
                        <div className="relative w-full aspect-[4/3] max-w-[650px]">
                            <Image
                                src="/images/landing/hero/merchant-success.png"
                                alt="Merchant Success Dashboard"
                                fill
                                className="object-contain drop-shadow-2xl animate-[float_6s_ease-in-out_infinite]"
                                priority
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
