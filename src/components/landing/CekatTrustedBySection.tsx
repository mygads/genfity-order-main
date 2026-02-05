'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Marquee from "@/components/magicui/marquee";
import Image from 'next/image';

export default function CekatTrustedBySection() {
    const { t } = useTranslation();

    // Brand logos - F&B & Retail brands using Genfity
    const brands = [
        { name: "Wellard Kebab House", color: "#FF7B00" },
        { name: "Urban Brew Coffee", color: "#5D4037" },
        { name: "Bella Pasta Co.", color: "#C62828" },
        { name: "Golden Dragon Kitchen", color: "#D32F2F" },
        { name: "Fresh Mart", color: "#2E7D32" },
        { name: "Smoothie Station", color: "#7B1FA2" },
        { name: "Sushi Express", color: "#00695C" },
        { name: "The Salad Bar", color: "#388E3C" },
        { name: "Baker's Delight", color: "#E65100" },
        { name: "Tea Time Cafe", color: "#00838F" },
        { name: "Grill Masters", color: "#BF360C" },
        { name: "Frozen Treats", color: "#1565C0" },
    ];

    return (
        <section className="mt-8 pb-8 pt-8 bg-transparent overflow-hidden relative z-10">
            <div className="max-w-[1200px] mx-auto px-6 text-center mb-10">
                <p className="font-['Inter',system-ui,sans-serif] text-[18px] md:text-[20px] font-semibold text-black tracking-tight">
                    Trusted by 500+ F&B, retail and service businesses worldwide
                </p>
            </div>

            {/* Logo Marquee - scrolls Right to Left by default */}
            <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
                <Marquee className="[--duration:30s] [--gap:2rem]">
                    {brands.map((brand, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-center mx-4 px-6 py-3 transition-all duration-300 cursor-pointer group"
                        >
                            {/* Logo placeholder - styled box with brand initial */}
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-white font-bold text-sm"
                                style={{ backgroundColor: brand.color }}
                            >
                                {brand.name.charAt(0)}
                            </div>
                            <span className="text-sm md:text-base font-semibold text-slate-600 group-hover:text-slate-800 whitespace-nowrap">
                                {brand.name}
                            </span>
                        </div>
                    ))}
                </Marquee>
            </div>
        </section>
    );
}
