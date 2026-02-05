'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import AlertDialog from '@/components/modals/AlertDialog';
import { FaArrowRight, FaQrcode, FaPlay, FaAngellist, FaWhatsapp } from 'react-icons/fa';
import HeroScrollDemo from './HeroScrollDemo';
import { Meteors } from '@/components/ui/meteors';

export default function CekatLightHeroSection() {
    const { t } = useTranslation();
    const router = useRouter();
    const [merchantCode, setMerchantCode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        // Trigger animations after mount
        setIsLoaded(true);
    }, []);

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
        <section className="relative w-full min-h-screen overflow-hidden bg-[linear-gradient(135deg,#e3f2fd_0%,#f8fbff_100%)] flex flex-col pt-[120px] pb-20">
            {/* Background Image with Mask */}
            <div
                className="absolute top-0 left-0 right-0 h-full z-0 pointer-events-none"
                style={{
                    backgroundImage: "url('/images/landing/hero/bg-hero.png')",
                    backgroundPosition: "center top",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)"
                }}
            />
            
            <Meteors number={20} />

            {/* Hero Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center pt-8">
                {/* Badge / Label */}
                <div
                    className={`inline-flex items-center gap-2 px-5 py-1 rounded-full bg-white text-[#2563eb] text-[16px] font-bold tracking-wide mb-6 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards' : 'none' }}
                >
                    <span className="relative flex h-5 w-5">
                        {/* <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span> */}
                        <FaAngellist className="relative inline-flex rounded-full h-5 w-5 text-blue-500" />
                    </span>
                    <span>The First POS That Runs with AI Chat Sales</span>
                </div>

                {/* Main Headline - Genfity Order */}
                <h1
                    className={`font-['Open_Runde','Inter',system-ui,sans-serif] text-[34px] md:text-[56px] leading-[1.1] font-semibold text-black tracking-[-1.56px] mb-8 max-w-3xl relative ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards' : 'none' }}
                >
                    Run Your Entire Business on One{' '}
                    <span className="relative inline-block text-blue-600">
                        Intelligent Commerce
                    </span>{' '}
                    Platform
                </h1>

                {/* Subheadline */}
                <p
                    className={`font-['Open_Runde','Inter',system-ui,sans-serif] text-[16px] md:text-[20px] leading-[1.3] font-normal text-black max-w-2xl mx-auto mb-8 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards' : 'none' }}
                >
                    Genfity Order is a modular ERP, ordering, payments, loyalty and AI sales platform for F&B, retail and service businesses.
                </p>

                {/* Supporting line */}
                {/* <p
                    className={`font-['Open_Runde','Inter',system-ui,sans-serif] text-[14px] md:text-[16px] leading-[24px] font-normal text-gray-600 max-w-[600px] mx-auto mb-7 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards' : 'none' }}
                >
                    From cashier operations to AI-powered sales, everything works together.
                </p> */}

                <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-4 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards' : 'none' }}>
                    <Link href="https://wa.me/6285174314023" target="_blank" rel="noopener noreferrer">
                        <button className="flex items-center gap-2 px-8 py-3 rounded-[100px] bg-[#2563eb] text-white font-bold  transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] group font-['Open_Runde','Inter',system-ui,sans-serif] hover:bg-blue-700">
                            <FaWhatsapp className="w-5 h-5" />
                            <span>Talk to Sales</span>
                        </button>
                    </Link>

                    <Link href="/admin/register">
                        <button className="flex items-center gap-2 px-8 py-3 rounded-[100px] bg-white text-black font-bold border border-gray-200 transition-all duration-200 group font-['Open_Runde','Inter',system-ui,sans-serif] hover:bg-gray-50">
                            <span>Register</span>
                            <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>

                {/* Micro trust line */}
                <div className={`flex flex-wrap items-center justify-center gap-6 mt-8 text-sm font-medium text-gray-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ animation: isLoaded ? 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards' : 'none' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span>No Subscription Needs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span>Free Setup</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span>SLA 99.9%</span>
                    </div>
                </div>

                {/* Scroll Animation Dashboard */}
                <div
                    className={`relative z-10 w-full ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: isLoaded ? 'scaleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards' : 'none' }}
                >
                    <HeroScrollDemo />
                </div>
            </div>

            {/* QR Scanner Modal */}
            {/* {showScanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-800">
                                {t('landing.hero.scanQR') || 'Scan QR Code'}
                            </h3>
                            <button onClick={stopScanner} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="relative aspect-square bg-gray-900">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-40 h-40 relative">
                                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-500 rounded-tl"></div>
                                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-500 rounded-tr"></div>
                                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-500 rounded-bl"></div>
                                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-500 rounded-br"></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 text-center bg-gray-50">
                            <p className="text-xs text-gray-500">{t('landing.hero.scanInstructions') || 'Arahkan kamera ke QR Code'}</p>
                        </div>
                    </div>
                </div>
            )} */}

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
