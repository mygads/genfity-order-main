'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import AlertDialog from '@/components/modals/AlertDialog';

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
            router.push(`/${merchantCode.toUpperCase()}`);
        }
    };

    const startScanner = async () => {
        setShowScanner(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            // Wait for next tick to ensure video element is mounted
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
                            {t('landing.hero.badge')}
                        </div>

                        {/* Main Headline - Approx 48px, Bold 700 */}
                        <h1 className="text-[40px] leading-[1.2] lg:text-[48px] lg:leading-[67.2px] font-bold text-gray-900 dark:text-white">
                            <span className="text-[#173C82] dark:text-blue-400">{t('landing.hero.tagline')}</span>
                            <span className="block text-gray-900 dark:text-white">
                                {t('landing.hero.headline')}
                            </span>
                        </h1>

                        <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 max-w-md mx-auto lg:mx-0">
                            {t('landing.hero.subtitle')}
                        </p>

                        {/* CTA Buttons - Compact & Aligned */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start pt-2">
                            {/* Primary CTA - Register Button */}
                            <Link
                                href="/merchant/register"
                                className="inline-flex items-center justify-center px-6 py-3 bg-[#173C82] hover:bg-[#122c60] text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                {t('landing.hero.cta.register')}
                            </Link>

                            {/* Merchant Code Input - Clean placeholder style */}
                            <form onSubmit={handleMerchantCodeSubmit} className="relative">
                                <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors overflow-hidden">
                                    <input
                                        type="text"
                                        value={merchantCode}
                                        onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                                        placeholder={t('landing.hero.merchantCodePlaceholder')}
                                        className="w-36 px-4 py-2.5 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    />
                                    <div className="flex items-center border-l border-gray-200 dark:border-gray-700">
                                        {/* QR Scan Button */}
                                        <button
                                            type="button"
                                            onClick={startScanner}
                                            className="p-2.5 text-gray-400 hover:text-[#173C82] dark:hover:text-blue-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                            title="Scan QR Code"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                                <rect x="14" y="14" width="3" height="3" />
                                                <path d="M17 14v3h3" />
                                                <path d="M14 17h3v3" />
                                            </svg>
                                        </button>
                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={!merchantCode.trim()}
                                            className="p-2.5 text-gray-400 hover:text-[#173C82] dark:hover:text-blue-400 transition-colors disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                <polyline points="12 5 19 12 12 19"></polyline>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center lg:justify-start gap-5 text-sm text-gray-500 dark:text-gray-400 pt-1">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span>{t('landing.hero.badges.trial')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span>{t('landing.hero.badges.noCard')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Image */}
                    <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-lg aspect-square">
                            <Image
                                src="/images/landing/hero/merchant-success.png"
                                alt="Merchant Success"
                                fill
                                className="object-contain drop-shadow-xl"
                                priority
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm mx-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('landing.hero.scanQR')}
                                </h3>
                                <button
                                    onClick={stopScanner}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            {/* Camera View */}
                            <div className="relative aspect-square bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                {/* Scan Frame Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-48 h-48 relative">
                                        {/* Corner markers */}
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl"></div>
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr"></div>
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl"></div>
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br"></div>
                                        {/* Scan line animation */}
                                        <div className="absolute inset-x-0 h-0.5 bg-[#173C82] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="p-4 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('landing.hero.scanInstructions')}
                                </p>
                            </div>
                        </div>
                    </div>
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
