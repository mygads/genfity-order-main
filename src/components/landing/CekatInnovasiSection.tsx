'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { FaCashRegister, FaMobileAlt, FaQrcode, FaCreditCard, FaGift, FaRobot } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

// Orbiting features on different rings - Genfity ecosystem
const ring1Features = [
    { id: 'pos-mobile', label: 'Genfity POS Mobile', sublabel: 'Mobile companion', icon: FaMobileAlt, angle: 0 },
    { id: 'consumer', label: 'Genfity Consumer', sublabel: 'Customer ordering', icon: FaQrcode, angle: 180 },
];

const ring2Features = [
    { id: 'pay', label: 'Genfity Pay', sublabel: 'Payments & QRIS', icon: FaCreditCard, angle: 45 },
    { id: 'loyalty', label: 'Genfity Loyalty', sublabel: 'Membership & rewards', icon: FaGift, angle: 135, comingSoon: true },
    { id: 'sales-ai', label: 'Genfity Sales AI', sublabel: 'AI Sales & CS', icon: FaRobot, angle: 270, highlight: true },
];

// Helper to get initial position on ring
const getInitialPos = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
        x: Math.cos(rad) * radius,
        y: Math.sin(rad) * radius,
    };
};

export default function CekatInnovasiSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const headlineRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let rotation = 0;
        let lastScrollY = window.scrollY;
        let scrollVelocity = 0;
        let animationId: number;

        const ring1 = containerRef.current.querySelector('[data-ring="1"]') as HTMLElement;
        const ring2 = containerRef.current.querySelector('[data-ring="2"]') as HTMLElement;
        const labels1 = containerRef.current.querySelectorAll('[data-label="1"]') as NodeListOf<HTMLElement>;
        const labels2 = containerRef.current.querySelectorAll('[data-label="2"]') as NodeListOf<HTMLElement>;

        const animate = () => {
            // Apply base rotation + scroll velocity
            rotation += 0.080 + scrollVelocity; // Base rotation speed

            // Decay scroll velocity smoothly
            scrollVelocity *= 0.92;

            // Update ring transforms
            if (ring1) ring1.style.transform = `translate(-50%, -50%) rotate(${rotation * 0.8}deg)`;
            if (ring2) ring2.style.transform = `translate(-50%, -50%) rotate(${-rotation * 0.5}deg)`;

            // Counter-rotate labels to keep text readable
            labels1.forEach(label => {
                label.style.transform = `translate(-50%, -50%) rotate(${-rotation * 0.8}deg)`;
            });
            labels2.forEach(label => {
                label.style.transform = `translate(-50%, -50%) rotate(${rotation * 0.5}deg)`;
            });

            animationId = requestAnimationFrame(animate);
        };

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY;
            lastScrollY = currentScrollY;

            // Scroll sensitivity
            scrollVelocity += delta * 0.030;

            // Smaller clamp
            scrollVelocity = Math.max(-0.5, Math.min(0.5, scrollVelocity));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(animationId);
        };
    }, []);

    // Intersection Observer for brush highlight animation on scroll
    useEffect(() => {
        if (!headlineRef.current) return;

        const highlights = headlineRef.current.querySelectorAll('.highlight-text-wrapper');
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Add visible class to trigger animation
                        // Initial delay: 2s, then 1s between each
                        highlights.forEach((el, index) => {
                            setTimeout(() => {
                                el.classList.add('is-visible');
                            }, 1000 + (index * 1000)); // 1s initial + 1s stagger
                        });
                        observer.disconnect(); // Only trigger once
                    }
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(headlineRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <section className="py-20 bg-white relative overflow-hidden z-20 rounded-t-[48px] md:rounded-t-[80px] -mt-24 md:-mt-72">
            {/* Headline */}
            <div className="max-w-5xl mx-auto px-6 text-center mb-20 relative z-10">
                <h2 ref={headlineRef} className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[32px] md:text-[46px] leading-tight font-normal text-[#1a1615] tracking-tight">
                    One Integrated System That Connects{' '}
                    <span className="highlight-text-wrapper relative inline-block whitespace-nowrap">
                        Every Part
                        {/* SVG Brush Highlight - Scroll Triggered */}
                        <svg 
                            className="absolute pointer-events-none overflow-visible" 
                            style={{ 
                                top: '-8px', 
                                left: '-16px', 
                                width: 'calc(100% + 40px)', 
                                height: 'calc(100% + 18px)' 
                            }}
                            viewBox="0 0 200 60" 
                            preserveAspectRatio="none"
                        >
                            <path 
                                className="highlight-brush-path"
                                d="M10,30 C10,8 40,3 100,3 C160,3 190,8 190,30 C190,52 160,57 100,57 C40,57 10,52 10,30" 
                                fill="none" 
                                stroke="#3b82f6" 
                                strokeWidth="10" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                    </span>{' '}
                    of{' '}
                    <span className="highlight-text-wrapper relative inline-block whitespace-nowrap">
                        Your Business
                        {/* SVG Brush Highlight - Scroll Triggered */}
                        <svg 
                            className="absolute pointer-events-none overflow-visible" 
                            style={{ 
                                top: '-8px', 
                                left: '-16px', 
                                width: 'calc(100% + 40px)', 
                                height: 'calc(100% + 18px)' 
                            }}
                            viewBox="0 0 200 60" 
                            preserveAspectRatio="none"
                        >
                            <path 
                                className="highlight-brush-path"
                                d="M10,30 C10,8 40,3 100,3 C160,3 190,8 190,30 C190,52 160,57 100,57 C40,57 10,52 10,30" 
                                fill="none" 
                                stroke="#3b82f6" 
                                strokeWidth="10" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                    </span>
                </h2>
                {/* <p className="text-[18px] text-gray-600 mt-6 max-w-2xl mx-auto">
                    Operations, ordering, payments, customers and AI sales are fully connected in one unified ecosystem.
                </p> */}
            </div>

            {/* Concentric Circles Animation */}
            <div ref={containerRef} className="relative w-full max-w-[700px] mx-auto" style={{ height: '500px' }}>

                {/* Ring 2 - Outer (220px radius) */}
                <div
                    data-ring="2"
                    className="absolute top-1/2 left-1/2 w-[440px] h-[440px] rounded-full border-2 border-blue-200/60"
                    style={{ transform: 'translate(-50%, -50%)', willChange: 'transform' }}
                >
                    {ring2Features.map((feature) => {
                        const pos = getInitialPos(feature.angle, 220);
                        return (
                            <div
                                key={feature.id}
                                data-label="2"
                                className={`absolute flex flex-col items-center gap-1 px-4 py-2 rounded-xl shadow-md border text-xs font-medium whitespace-nowrap ${
                                    feature.highlight
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : feature.comingSoon
                                        ? 'bg-gray-100 text-gray-500 border-gray-200'
                                        : 'bg-white text-gray-700 border-blue-100'
                                }`}
                                style={{
                                    left: `calc(50% + ${pos.x}px)`,
                                    top: `calc(50% + ${pos.y}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    willChange: 'transform'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <feature.icon className={`w-4 h-4 ${feature.highlight ? 'text-white' : 'text-blue-500'}`} />
                                    <span className="font-semibold">{feature.label}</span>
                                    {feature.comingSoon && <span className="text-[8px] bg-gray-200 text-gray-500 px-1 rounded">Soon</span>}
                                </div>
                                <span className={`text-[10px] ${feature.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{feature.sublabel}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Ring 1 - Inner (130px radius) */}
                <div
                    data-ring="1"
                    className="absolute top-1/2 left-1/2 w-[260px] h-[260px] rounded-full border-2 border-blue-200/80"
                    style={{ transform: 'translate(-50%, -50%)', willChange: 'transform' }}
                >
                    {ring1Features.map((feature) => {
                        const pos = getInitialPos(feature.angle, 130);
                        return (
                            <div
                                key={feature.id}
                                data-label="1"
                                className="absolute flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white shadow-md border border-blue-100 text-xs font-medium text-gray-700 whitespace-nowrap"
                                style={{
                                    left: `calc(50% + ${pos.x}px)`,
                                    top: `calc(50% + ${pos.y}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    willChange: 'transform'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <feature.icon className="w-4 h-4 text-indigo-500" />
                                    <span className="font-semibold">{feature.label}</span>
                                </div>
                                <span className="text-[10px] text-gray-500">{feature.sublabel}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Central Logo - POS Core */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <Image
                        src="/images/logo/icon.png"
                        alt="Genfity POS Core"
                        width={120}
                        height={120}
                        className="w-32 h-32 md:w-36 md:h-36 drop-shadow-2xl"
                    />

                    {/* <div className="w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl flex flex-col items-center justify-center text-white">
                        <FaCashRegister className="w-10 h-10 md:w-12 md:h-12 mb-1" />
                        <span className="text-xs font-bold">Genfity POS Core</span>
                        <span className="text-[10px] opacity-80">The Operational Backbone</span>
                    </div> */}
                </div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-400/10 blur-[80px] rounded-full -z-10"></div>

            </div>

            {/* Caption under diagram */}
            {/* <p className="text-center text-gray-500 text-sm mt-8">
                No data silos. No manual sync. Everything works in real time.
            </p> */}
        </section>
    );
}
