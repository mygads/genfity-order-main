'use client';

import Image from 'next/image';
import { useEffect, useRef, useCallback } from 'react';

// All 6 products distributed across 3 rings
const orbitItems = [
    // Ring 1 - Inner (2 items)
    { id: 'consumer', label: 'Genfity Consumer', image: '/images/landing/product/consumer-logo.png', ring: 1, startAngle: 60 },
    { id: 'pos-mobile', label: 'Genfity POS Mobile', image: '/images/landing/product/pos-mobile-logo.png', ring: 1, startAngle: 240 },
    // Ring 2 - Middle (2 items)
    { id: 'pay', label: 'Genfity Pay', image: '/images/landing/product/pay-logo.png', ring: 2, startAngle: 150 },
    { id: 'pos-core', label: 'Genfity POS Core', image: '/images/landing/product/pos-core-logo.png', ring: 2, startAngle: 330 },
    // Ring 3 - Outer (2 items)
    { id: 'loyalty', label: 'Genfity Loyalty', image: '/images/landing/product/loyalty-logo.png', ring: 3, startAngle: 100 },
    { id: 'sales-ai', label: 'Genfity Sales AI', image: '/images/landing/product/sales-ai-logo.png', ring: 3, startAngle: 280 },
];

// Ring config: radius (px) and rotation speed (deg per frame, negative = reverse)
const ringConfig: Record<number, { radius: number; speed: number }> = {
    1: { radius: 120, speed: 0.15 },
    2: { radius: 210, speed: -0.10 },
    3: { radius: 300, speed: 0.06 },
};

export default function CekatInnovasiSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const headlineRef = useRef<HTMLHeadingElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const rotationRef = useRef(0);
    const scrollVelRef = useRef(0);
    const lastScrollYRef = useRef(0);

    const setItemRef = useCallback((el: HTMLDivElement | null, idx: number) => {
        itemRefs.current[idx] = el;
    }, []);

    // Orbit animation: calculate x/y per item, rotate logo so bottom faces center
    useEffect(() => {
        lastScrollYRef.current = window.scrollY;
        let animationId: number;

        const animate = () => {
            rotationRef.current += 1 + scrollVelRef.current;
            scrollVelRef.current *= 0.95;

            orbitItems.forEach((item, idx) => {
                const el = itemRefs.current[idx];
                if (!el) return;

                const cfg = ringConfig[item.ring];
                const angleDeg = item.startAngle + rotationRef.current * cfg.speed;
                const angleRad = (angleDeg * Math.PI) / 180;

                const x = Math.cos(angleRad) * cfg.radius;
                const y = Math.sin(angleRad) * cfg.radius;

                // Rotate logo so its bottom always points toward center
                // angleDeg is the position angle; +90 makes the bottom face inward
                const logoRotation = angleDeg + 90;

                el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${logoRotation}deg)`;
            });

            animationId = requestAnimationFrame(animate);
        };

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollYRef.current;
            lastScrollYRef.current = currentScrollY;
            // Strong scroll impulse for noticeable acceleration
            scrollVelRef.current += delta * 0.15;
            scrollVelRef.current = Math.max(-4, Math.min(4, scrollVelRef.current));
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
                        highlights.forEach((el, index) => {
                            setTimeout(() => {
                                el.classList.add('is-visible');
                            }, 1000 + (index * 1000));
                        });
                        observer.disconnect();
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

            {/* Concentric Circles Animation - 3 Rings */}
            <div ref={containerRef} className="relative w-full max-w-[750px] mx-auto" style={{ height: '650px' }}>

                {/* SVG Ring Borders - Cekat AI segmented style */}
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] pointer-events-none" viewBox="0 0 650 650">
                    {/* Ring 3 outer */}
                    <circle cx="325" cy="325" r="300" fill="none" stroke="#93c5fd" strokeWidth="10" strokeDasharray="70 50" strokeLinecap="round" opacity="0.12" />
                    <circle cx="325" cy="325" r="300" fill="none" stroke="#bfdbfe" strokeWidth="2.5" strokeDasharray="45 25" strokeLinecap="round" opacity="0.6" />
                    {/* Ring 2 middle */}
                    <circle cx="325" cy="325" r="210" fill="none" stroke="#93c5fd" strokeWidth="8" strokeDasharray="50 40" strokeLinecap="round" opacity="0.12" />
                    <circle cx="325" cy="325" r="210" fill="none" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="30 18" strokeLinecap="round" opacity="0.7" />
                    {/* Ring 1 inner */}
                    <circle cx="325" cy="325" r="120" fill="none" stroke="#93c5fd" strokeWidth="6" strokeDasharray="35 30" strokeLinecap="round" opacity="0.12" />
                    <circle cx="325" cy="325" r="120" fill="none" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="20 14" strokeLinecap="round" opacity="0.8" />
                </svg>

                {/* All orbit items — positioned from center, no rotation */}
                {orbitItems.map((item, idx) => (
                    <div
                        key={item.id}
                        ref={(el) => setItemRef(el, idx)}
                        className="absolute top-1/2 left-1/2 z-10"
                        style={{
                            transform: 'translate(-50%, -50%)',
                            willChange: 'transform',
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.image}
                            alt={item.label}
                            className="w-[100px] h-[45px] md:w-[140px] md:h-[60px] object-contain drop-shadow-lg"
                            draggable={false}
                        />
                    </div>
                ))}

                {/* Central Logo - Genfity */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <Image
                        src="/images/logo/icon.png"
                        alt="Genfity"
                        width={120}
                        height={120}
                        className="w-20 h-20 md:w-28 md:h-28 drop-shadow-2xl"
                    />
                </div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-400/10 blur-[100px] rounded-full -z-10"></div>

            </div>
        </section>
    );
}
