'use client';

import { FaQuoteLeft } from 'react-icons/fa';

interface Testimonial {
    id: string;
    company: string;
    logoText: string;
    avatarBg: string;
    quote: string;
    name: string;
    role: string;
    avatarUrl: string;
}

const testimonials: Testimonial[] = [
    {
        id: 'kebab-house',
        company: 'Wellard Kebab House',
        logoText: 'WK',
        avatarBg: 'bg-orange-500',
        quote: 'We switched from 3 separate systems to Genfity. Now everything is connected — POS, online orders, and inventory. Staff training dropped from 2 weeks to 2 days.',
        name: 'Operations Manager',
        role: 'Wellard Kebab House',
        avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    {
        id: 'coffee-chain',
        company: 'Urban Brew Coffee',
        logoText: 'UB',
        avatarBg: 'bg-amber-600',
        quote: 'QR ordering reduced our wait times by 40%. Customers love ordering from their table, and we can handle more volume with the same staff.',
        name: 'Franchise Owner',
        role: 'Urban Brew Coffee',
        avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    {
        id: 'retail-store',
        company: 'ModernMart Retail',
        logoText: 'MM',
        avatarBg: 'bg-blue-600',
        quote: 'The AI Sales agent handles 80% of our WhatsApp inquiries automatically. Our team now focuses on high-value conversations that actually close.',
        name: 'Sales Director',
        role: 'ModernMart Retail',
        avatarUrl: 'https://randomuser.me/api/portraits/men/86.jpg',
    },
    {
        id: 'restaurant-group',
        company: 'Spice Garden Group',
        logoText: 'SG',
        avatarBg: 'bg-emerald-600',
        quote: 'Managing 5 outlets used to be chaos. Now with multi-branch dashboard, I see everything in real-time. Stock variance dropped by 60%.',
        name: 'CEO',
        role: 'Spice Garden Group',
        avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
    {
        id: 'bakery',
        company: 'Sweet Delights Bakery',
        logoText: 'SD',
        avatarBg: 'bg-pink-500',
        quote: 'Recipe-based inventory changed everything. We know exactly how much flour we need before we run out. Wastage is down 35%.',
        name: 'Head Baker',
        role: 'Sweet Delights Bakery',
        avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
    },
    {
        id: 'service-center',
        company: 'QuickFix Services',
        logoText: 'QF',
        avatarBg: 'bg-purple-500',
        quote: 'The appointment booking and QRIS payment integration made us look professional. Customers pay instantly, no more chasing invoices.',
        name: 'Service Manager',
        role: 'QuickFix Services',
        avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
];

// Duplicate testimonials for seamless loop
const duplicatedTestimonials = [...testimonials, ...testimonials];

export default function CekatEfisiensiSection() {
    return (
        <section className="py-20 bg-white relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 mb-12">

                {/* Section Header */}
                {/* Section Header */}
                <div className="text-center">
                    {/* Pill Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-md font-semibold mb-6">
                        <span>Built to Support Growing Businesses</span>
                    </div>

                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[36px] md:text-[52px] font-semibold text-[#1A1615] tracking-tight mb-6 leading-[1.2]">
                        Real Stories from Genfity<br />Customers
                    </h2>
                    <p className="text-[20px] text-black max-w-3xl mx-auto leading-relaxed">
                        See how F&B, retail, and service businesses are scaling operations and improving customer experience with Genfity Order.
                    </p>
                </div>
            </div>

            {/* Auto-scroll Marquee */}
            <div className="relative w-full overflow-hidden">
                <div
                    className="flex gap-6 animate-marquee"
                    style={{
                        width: 'max-content',
                    }}
                >
                    {duplicatedTestimonials.map((testimonial, index) => (
                        <div
                            key={`${testimonial.id}-${index}`}
                            className="flex-shrink-0 w-[340px] h-[280px] bg-white rounded-[24px] p-6 border border-gray-200 flex flex-col justify-between"

                        >
                            {/* Quote */}
                            <div className="flex-1 mb-4">
                                <div className="flex items-start gap-3">
                                    <FaQuoteLeft className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                                    <p className="text-[16px] text-black leading-relaxed font-['Open_Runde',system-ui,sans-serif] line-clamp-4">
                                        "{testimonial.quote}"
                                    </p>
                                </div>
                            </div>

                            {/* Author Info */}
                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-auto">
                                <img
                                    src={testimonial.avatarUrl}
                                    alt={testimonial.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="text-[16px] font-semibold text-[#1A1615]">
                                        {testimonial.name}
                                    </p>
                                    <p className="text-[12px] text-black">
                                        {testimonial.role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
}
