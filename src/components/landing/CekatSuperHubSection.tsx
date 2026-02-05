'use client';

import Link from 'next/link';
import { HiSparkles } from 'react-icons/hi2';
import { FaArrowRight, FaComments, FaTicketAlt, FaBullhorn, FaUsers, FaPlug, FaWhatsapp } from 'react-icons/fa';

interface FeatureBlock {
    id: string;
    category: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    size: 'large' | 'small';
}

const features: FeatureBlock[] = [
    {
        id: 'omnichannel',
        category: 'POS & Cashier',
        title: 'POS & Cashier Operations',
        description: 'Touch-friendly checkout with split-bill, partial payments, and quick-select support for fast transactions.',
        icon: <FaComments className="w-5 h-5" />,
        size: 'large',
    },
    {
        id: 'ticketing',
        category: 'Inventory',
        title: 'Inventory & Stock Management',
        description: 'Auto-update stock levels, recipe-based deduction, and stock opname for accurate inventory control.',
        icon: <FaTicketAlt className="w-5 h-5" />,
        size: 'large',
    },
    {
        id: 'campaign',
        category: 'Menu & Pricing',
        title: 'Menu, Pricing & Promotions',
        description: 'Time-based pricing, happy hour promotions, and flexible menu management for all your products.',
        icon: <FaBullhorn className="w-5 h-5" />,
        size: 'small',
    },
    {
        id: 'humanagent',
        category: 'QR Ordering',
        title: 'QR Ordering & Online Orders',
        description: 'Table QR codes, web ordering, and real-time order tracking for seamless customer experience.',
        icon: <FaUsers className="w-5 h-5" />,
        size: 'small',
    },
    {
        id: 'openapi',
        category: 'Payments',
        title: 'Payments & QRIS Integration',
        description: 'Multi-gateway payments with QRIS support and settlement-ready reconciliation.',
        icon: <FaPlug className="w-5 h-5" />,
        size: 'small',
    },
];

// Mock dashboard images for each feature
const FeatureMockup = ({ featureId }: { featureId: string }) => {
    switch (featureId) {
        case 'omnichannel':
            return (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl p-4 h-48 border border-slate-100">
                    <div className="flex gap-3 h-full">
                        {/* Chat list */}
                        <div className="w-1/3 space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`p-2 rounded-lg ${i === 1 ? 'bg-blue-100 border-l-2 border-blue-500' : 'bg-white'} flex gap-2`}>
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-1">
                                        <div className="h-2 w-12 bg-gray-300 rounded"></div>
                                        <div className="h-1.5 w-full bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Chat area */}
                        <div className="flex-1 bg-white rounded-lg p-3 flex flex-col">
                            <div className="flex-1 space-y-2">
                                <div className="bg-gray-100 rounded-lg p-2 w-3/4"><div className="h-2 bg-gray-300 rounded"></div></div>
                                <div className="bg-blue-100 rounded-lg p-2 w-3/4 ml-auto"><div className="h-2 bg-blue-300 rounded"></div></div>
                            </div>
                            <div className="mt-2 h-8 bg-gray-100 rounded-full"></div>
                        </div>
                    </div>
                </div>
            );
        case 'ticketing':
            return (
                <div className="bg-gradient-to-br from-slate-50 to-purple-50/50 rounded-xl p-4 h-48 border border-slate-100">
                    <div className="flex gap-2 h-full">
                        {['New', 'Progress', 'Done'].map((col, i) => (
                            <div key={i} className="flex-1 bg-white rounded-lg p-2">
                                <div className="text-[10px] font-semibold text-gray-500 mb-2">{col}</div>
                                {[1, 2].slice(0, 2 - Math.floor(i / 2)).map(j => (
                                    <div key={j} className="bg-gray-50 rounded p-2 mb-1.5 border border-gray-100">
                                        <div className="h-1.5 w-10 bg-gray-300 rounded mb-1"></div>
                                        <div className="h-1 w-8 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'campaign':
            return (
                <div className="bg-gradient-to-br from-slate-50 to-green-50/50 rounded-xl p-4 h-40 border border-slate-100">
                    <div className="flex gap-3 h-full">
                        <div className="w-1/2 bg-white rounded-lg p-3 border border-gray-100">
                            <div className="h-2 w-16 bg-gray-300 rounded mb-2"></div>
                            <div className="space-y-1.5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-200"></div>
                                        <div className="h-1.5 flex-1 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-lg p-3 border border-gray-100">
                            <div className="h-2 w-12 bg-gray-300 rounded mb-2"></div>
                            <div className="h-16 bg-gradient-to-r from-green-100 to-blue-100 rounded flex items-end p-2 gap-1">
                                {[40, 60, 80, 55, 70].map((h, i) => (
                                    <div key={i} className="flex-1 bg-green-300 rounded-t" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'humanagent':
            return (
                <div className="bg-gradient-to-br from-slate-50 to-orange-50/50 rounded-xl p-4 h-40 border border-slate-100">
                    <div className="bg-white rounded-lg p-3 h-full border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-2 w-20 bg-gray-300 rounded"></div>
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 border-2 border-white"></div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[{ label: 'Active', value: '12' }, { label: 'Queue', value: '5' }, { label: 'Done', value: '89' }].map((stat, i) => (
                                <div key={i} className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs font-bold text-gray-700">{stat.value}</div>
                                    <div className="text-[8px] text-gray-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'openapi':
            return (
                <div className="bg-gradient-to-br from-slate-50 to-cyan-50/50 rounded-xl p-4 h-40 border border-slate-100 flex items-center justify-center">
                    <div className="relative">
                        {/* Center hub */}
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            API
                        </div>
                        {/* Orbiting icons */}
                        <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-green-400 shadow"></div>
                        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-purple-400 shadow"></div>
                        <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-orange-400 shadow"></div>
                        <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-pink-400 shadow"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 -left-8 w-5 h-5 rounded-full bg-teal-400 shadow"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-5 h-5 rounded-full bg-indigo-400 shadow"></div>
                    </div>
                </div>
            );
        default:
            return null;
    }
};

export default function CekatSuperHubSection() {
    const largeFeatures = features.filter(f => f.size === 'large');
    const smallFeatures = features.filter(f => f.size === 'small');

    return (
        <section className="py-24 bg-gradient-to-b from-white to-blue-50/30 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">

                {/* Section Header */}
                <div className="text-center mb-16 max-w-4xl mx-auto">
                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[24] md:text-[36px] font-semibold text-black tracking-tight mb-6 leading-[1.1]">
                        More Than Just POS <br />This is Your Business <span className='font-bold text-[#1A66D9]'>Command Center.</span>
                    </h2>
                    <p className="text-[20px] text-black max-w-4xl mx-auto leading-[1.3] mb-10 ">
                        Forget expensive separate software that's hard to integrate! We provide all essential features POS, inventory, ordering, payments, loyalty and AI, in one unified Genfity dashboard.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a 
                            href="https://wa.me/6285174314023"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-gray-200 text-black font-semibold text-[14px] shadow-sm hover:bg-gray-50 transition-colors"
                        >
                            <FaWhatsapp className="w-5 h-5" />
                            Talk to Sales
                        </a>
                        <Link 
                            href="/admin/register"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#1A66D9] text-white font-semibold text-[14px] shadow-lg shadow-blue-500/25 hover:bg-[#1557B9] transition-colors"
                        >
                            Register New Merchant
                            <FaArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="space-y-6">
                    {/* Top row - 2 large cards */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {largeFeatures.map((feature) => (
                            <div
                                key={feature.id}
                                className="bg-white rounded-[24px] p-6 shadow-lg shadow-gray-100/50 border border-gray-100 hover:shadow-xl transition-shadow"
                            >
                                {/* Mockup Image */}
                                <FeatureMockup featureId={feature.id} />

                                {/* Content */}
                                <div className="mt-5">
                                    <div className="inline-flex items-center gap-2 text-[#1A66D9] text-sm font-medium mb-2">
                                        {feature.icon}
                                        <span>{feature.category}</span>
                                    </div>
                                    <h3 className="text-[20px] font-bold text-black mb-1">
                                        {feature.title}
                                    </h3>
                                    <p className="text-black text-[16px] leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom row - 3 smaller cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {smallFeatures.map((feature) => (
                            <div
                                key={feature.id}
                                className="bg-white rounded-[24px] p-5 shadow-lg shadow-gray-100/50 border border-gray-100 hover:shadow-xl transition-shadow"
                            >
                                {/* Mockup Image */}
                                <FeatureMockup featureId={feature.id} />

                                {/* Content */}
                                <div className="mt-4">
                                    <div className="inline-flex items-center gap-2 text-[#1A66D9] text-sm font-medium mb-2">
                                        {feature.icon}
                                        <span>{feature.category}</span>
                                    </div>
                                    <h3 className="text-[20px] font-bold text-black mb-1">
                                        {feature.title}
                                    </h3>
                                    <p className="text-black text-[16px] leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
