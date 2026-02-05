'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import AlertDialog from '@/components/modals/AlertDialog';
import { motion } from 'framer-motion';
import BlurFade from '@/components/magicui/blur-fade';
import AnimatedGridPattern from '@/components/magicui/animated-grid-pattern';
import { AuroraText } from '@/components/magicui/aurora-text';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H1, LANDING_KICKER, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function HeroSection() {
    const { t } = useTranslation();
    const router = useRouter();
    const [merchantCode, setMerchantCode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleMerchantCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (merchantCode.trim()) {
            router.push(`/merchant/${merchantCode.toUpperCase()}`);
        }
    };

    const startScanner = async () => {
        setShowScanner(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (err) {
            console.error('Camera access denied:', err);
            setShowScanner(false);
            setAlertState({
                isOpen: true,
                title: 'Camera Access Required',
                message: 'Unable to access camera. Please check permissions.'
            });
        }
    };

    const stopScanner = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowScanner(false);
    };

    return (
        <section
            className={cn(
                LANDING_SECTION,
                'overflow-hidden border-b border-slate-200/60',
                'pt-20 pb-12 sm:pt-24 sm:pb-14 lg:pt-28 lg:pb-16'
            )}
        >
            {/* Interactive Grid Pattern */}
            <AnimatedGridPattern
                numSquares={30}
                maxOpacity={0.08}
                duration={3}
                repeatDelay={1}
                className={cn(
                    "mask-[radial-gradient(600px_circle_at_center,white,transparent)]",
                    "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
                )}
            />

            <div className={cn('relative z-10', LANDING_CONTAINER)}>
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

                    {/* Left Content */}
                    <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
                        {/* Tagline Badge */}
                        <BlurFade delay={0.1} yOffset={10} blur="0px">
                            <div className={cn(LANDING_KICKER, 'gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700')}
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600"></span>
                                </span>
                                {t('landing.hero.badge')}
                            </div>
                        </BlurFade>

                        {/* Main Headline with Aurora Text */}
                        <BlurFade delay={0.2} yOffset={10} blur="0px">
                            <h1 className={cn(LANDING_H1, 'leading-[1.05]')}>
                                <AuroraText className="block mb-1">{t('landing.hero.tagline')}</AuroraText>
                                <span className="block text-slate-900">{t('landing.hero.headline')}</span>
                            </h1>
                        </BlurFade>

                        <BlurFade delay={0.3} yOffset={10} blur="0px">
                            <p className={cn(LANDING_P, 'max-w-lg mx-auto lg:mx-0')}>
                                {t('landing.hero.subtitle')}
                            </p>
                        </BlurFade>

                        {/* CTA Buttons */}
                        <BlurFade delay={0.4} yOffset={10} blur="0px">
                            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                                {/* Rainbow Button */}
                                <Link href="/admin/register">
                                    <RainbowButton className="text-sm">
                                        {t('landing.hero.cta.register')}
                                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </RainbowButton>
                                </Link>

                                {/* Merchant Code Input */}
                                <form onSubmit={handleMerchantCodeSubmit} className="relative">
                                    <div className="flex items-center bg-white/90 border border-slate-200 rounded-full hover:border-sky-300 transition-colors shadow-sm backdrop-blur">
                                        <input
                                            type="text"
                                            value={merchantCode}
                                            onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                                            placeholder={t('landing.hero.merchantCodePlaceholder')}
                                            className="w-36 px-4 py-2 bg-transparent border-none focus:ring-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 uppercase tracking-wider"
                                        />
                                        <div className="flex items-center pr-1 gap-0.5">
                                            <button
                                                type="button"
                                                onClick={startScanner}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                                                title="Scan QR"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                                    <rect x="14" y="14" width="3" height="3" />
                                                </svg>
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!merchantCode.trim()}
                                                className="p-1.5 text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-full transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    <polyline points="12 5 19 12 12 19"></polyline>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </BlurFade>

                        {/* Trust Badges */}
                        <BlurFade delay={0.5} yOffset={10} blur="0px">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>{t('landing.hero.badges.trial')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>{t('landing.hero.badges.noCard')}</span>
                                </div>
                            </div>
                        </BlurFade>
                    </div>

                    {/* Right Image */}
                    <div className="w-full lg:w-1/2 relative flex justify-center">
                        <BlurFade delay={0.4} duration={0.8} yOffset={0} blur="0px">
                            <div className="relative w-full max-w-md aspect-square">
                                <div className="absolute -inset-6 rounded-4xl bg-linear-to-br from-sky-100/70 via-white to-indigo-100/60 blur-2xl" />
                                <Image
                                    src="/images/landing/hero/hero-genfity.png"
                                    alt="Genfity Restaurant Order System"
                                    fill
                                    className="relative object-contain drop-shadow-2xl"
                                    priority
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />

                                {/* Floating UI Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1, duration: 0.5 }}
                                    className="absolute -bottom-4 -left-4 lg:bottom-8 lg:left-0 bg-white/90 p-3 rounded-2xl shadow-lg border border-slate-200/70 backdrop-blur hidden sm:block"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500">Monthly Revenue</p>
                                            <p className="text-sm font-bold text-gray-900">+125%</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </BlurFade>
                    </div>
                </div>
            </div>

            {/* QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
                    >
                        <div className="flex items-center justify-between p-3 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {t('landing.hero.scanQR')}
                            </h3>
                            <button onClick={stopScanner} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="relative aspect-square bg-black">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-40 h-40 relative">
                                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl"></div>
                                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr"></div>
                                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl"></div>
                                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br"></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 text-center bg-gray-50">
                            <p className="text-xs text-gray-500">{t('landing.hero.scanInstructions')}</p>
                        </div>
                    </motion.div>
                </div>
            )}

            <AlertDialog
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                variant="warning"
                onClose={() => setAlertState({ isOpen: false, title: '', message: '' })}
            />
        </section>
    );
}
