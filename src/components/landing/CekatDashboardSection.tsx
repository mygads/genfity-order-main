'use client';

import { useState, useEffect } from 'react';
import { FaBox, FaUsers, FaChartLine, FaBolt, FaArrowRight } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';

interface TabItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    title: string;
    description: string;
    highlights: string[];
    ctaText: string;
}

const tabs: TabItem[] = [
    {
        id: 'order',
        icon: <FaBox className="w-4 h-4" />,
        label: 'Sales & Revenue',
        title: 'Sales & Revenue Reports',
        description: 'Monitor all sales transactions and revenue across outlets with ',
        highlights: ['Real-time Analytics', 'Exportable CSV/PDF Reports'],
        ctaText: 'See Sales Dashboard',
    },
    {
        id: 'crm',
        icon: <FaUsers className="w-4 h-4" />,
        label: 'Inventory',
        title: 'Inventory Movement',
        description: 'Track stock levels, auto-deduction, and alerts with ',
        highlights: ['Recipe-based Usage', 'Multi-warehouse Support'],
        ctaText: 'See Inventory Dashboard',
    },
    {
        id: 'marketing',
        icon: <FaChartLine className="w-4 h-4" />,
        label: 'Customer Data',
        title: 'Customer & Voucher Data',
        description: 'Manage customer profiles, vouchers, and loyalty with ',
        highlights: ['Customer Insights', 'Voucher Campaigns'],
        ctaText: 'See Customer Dashboard',
    },
    {
        id: 'automation',
        icon: <FaBolt className="w-4 h-4" />,
        label: 'Multi-branch',
        title: 'Multi-branch Overview',
        description: 'Centralized control for all your outlets with ',
        highlights: ['Branch Comparison', 'Unified Reporting'],
        ctaText: 'See Branch Dashboard',
    },
];

const SLIDE_DURATION = 5000; // 5 seconds

export default function CekatDashboardSection() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);

    const activeTabData = tabs[activeIndex];

    // Auto-advance to next slide when animation ends
    useEffect(() => {
        const timer = setTimeout(() => {
            setActiveIndex(prev => (prev + 1) % tabs.length);
            setAnimationKey(prev => prev + 1);
        }, SLIDE_DURATION);

        return () => clearTimeout(timer);
    }, [activeIndex, animationKey]);

    // Handle manual tab click - go to clicked tab, then continue sequence
    const handleTabClick = (index: number) => {
        if (index === activeIndex) return;
        setActiveIndex(index);
        setAnimationKey(prev => prev + 1);
    };

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* CSS Animation */}
            <style jsx>{`
                @keyframes progressFill {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .progress-bar {
                    animation: progressFill ${SLIDE_DURATION}ms linear forwards;
                }
            `}</style>

            <div className="max-w-6xl mx-auto px-6">

                {/* Section Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-md font-semibold mb-6">
                        <HiSparkles className="w-4 h-4" />
                        <span>Unified Dashboard</span>
                    </div>
                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[36px] md:text-[52px] font-semibold text-[#1A1615] tracking-tight mb-6 leading-[1.2]">
                        Control Your Entire Business<br className="hidden md:block" />
                        <span className="text-[#1A66D9]">From One Dashboard</span>
                    </h2>
                    <p className="text-[20px] text-black max-w-2xl mx-auto leading-relaxed ">
                        Monitor sales, orders, inventory, customers and performance across all outlets in real time.
                    </p>
                </div>

                {/* Two Column Layout */}
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

                    {/* Left Column - Feature Info & Tabs */}
                    <div className="w-full lg:w-[440px] flex-shrink-0">
                        {/* Active Feature Title */}
                        <h3 className="text-[28px] md:text-[40px] font-semibold text-black mb-2">
                            {activeTabData.title}
                        </h3>

                        {/* Description with highlights */}
                        <p className="text-black text-[20px] mb-6 font-medium">
                            {activeTabData.description}
                            {activeTabData.highlights.map((h, i) => (
                                <span key={i}>
                                    <span className="font-bold text-black">{h}</span>
                                    {i < activeTabData.highlights.length - 1 ? ', ' : '.'}
                                </span>
                            ))}
                        </p>

                        {/* CTA Button - no animation, just static */}
                        <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#1A66D9] text-white font-semibold text-[16px] shadow-lg shadow-blue-500/25 hover:bg-[#1557B9] transition-colors mb-6">
                            {activeTabData.ctaText}
                            <FaArrowRight className="w-3 h-3" />
                        </button>

                        {/* Vertical Tab Switcher - with countdown animation */}
                        <div className="space-y-2">
                            {tabs.map((tab, index) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(index)}
                                    className="relative max-w-[60%] w-full flex items-center gap-3 px-5 py-3 rounded-full text-left overflow-hidden bg-[#F5F5F5] hover:bg-[#EBEBEB] transition-colors"
                                >
                                    {/* Progress bar background for active tab */}
                                    {activeIndex === index && (
                                        <div
                                            key={`tab-progress-${animationKey}`}
                                            className="absolute inset-y-0 left-0 bg-[#E0E0E0]"
                                            style={{
                                                animation: `progressFill ${SLIDE_DURATION}ms linear forwards`,
                                            }}
                                        />
                                    )}
                                    <span className="relative z-10 text-[#6B7280]">
                                        {tab.icon}
                                    </span>
                                    <span className="relative z-10 text-[16px] text-black font-semibold">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Dashboard Preview */}
                    <div className="flex-1 w-full">
                        <div className="relative">
                            {/* Dashboard Frame */}
                            <div className="relative rounded-[24px] overflow-hidden bg-white p-3 shadow-2xl shadow-gray-200/60 border border-gray-100">
                                <div className="relative aspect-[16/10] rounded-[16px] overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100">
                                    {/* Different mock UI for each tab */}
                                    <div className="p-6 h-full">
                                        {/* Window Controls */}
                                        <div className="flex gap-2 mb-4">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        </div>

                                        {/* Dynamic content based on active tab */}
                                        {activeIndex === 0 && (
                                            <div className="flex gap-4 h-[calc(100%-32px)]">
                                                <div className="w-1/3 space-y-2">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`p-3 rounded-xl ${i === 1 ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'} flex gap-3`}>
                                                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                            <div className="flex-1">
                                                                <div className="h-3 w-20 bg-gray-300 rounded mb-1"></div>
                                                                <div className="h-2 w-full bg-gray-200 rounded"></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 bg-white rounded-xl p-4 flex flex-col">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="bg-gray-100 rounded-xl p-3 w-2/3"><div className="h-3 bg-gray-300 rounded w-full"></div></div>
                                                        <div className="bg-blue-100 rounded-xl p-3 w-2/3 ml-auto"><div className="h-3 bg-blue-300 rounded w-full"></div></div>
                                                    </div>
                                                    <div className="mt-4 h-10 bg-gray-100 rounded-full flex items-center px-4">
                                                        <div className="h-3 w-32 bg-gray-300 rounded"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeIndex === 1 && (
                                            <div className="flex gap-3 h-[calc(100%-32px)]">
                                                {['New Leads', 'Contacted', 'Meeting', 'Closed'].map((col, i) => (
                                                    <div key={i} className="flex-1 bg-gray-50 rounded-xl p-2">
                                                        <div className="text-xs font-semibold text-gray-600 mb-2 px-2">{col}</div>
                                                        {[1, 2, 3].slice(0, 3 - i).map(j => (
                                                            <div key={j} className="bg-white rounded-lg p-2 mb-2 shadow-sm border border-gray-100">
                                                                <div className="h-2 w-16 bg-gray-300 rounded mb-1"></div>
                                                                <div className="h-2 w-12 bg-gray-200 rounded"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeIndex === 2 && (
                                            <div className="h-[calc(100%-32px)] flex flex-col">
                                                <div className="flex gap-4 mb-4">
                                                    {[{ label: 'Sent', value: '12.5K', bg: 'bg-blue-50', text: 'text-blue-600' }, { label: 'Opened', value: '8.2K', bg: 'bg-green-50', text: 'text-green-600' }, { label: 'Clicked', value: '3.1K', bg: 'bg-purple-50', text: 'text-purple-600' }].map((stat, i) => (
                                                        <div key={i} className={`flex-1 ${stat.bg} rounded-xl p-3 border border-gray-100`}>
                                                            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                                                            <div className={`text-lg font-bold ${stat.text}`}>{stat.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
                                                    <div className="flex items-end gap-2 h-full">
                                                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75].map((h, i) => (
                                                            <div key={i} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${h}%` }}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeIndex === 3 && (
                                            <div className="h-[calc(100%-32px)] flex items-center justify-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-24 h-16 rounded-xl bg-green-100 border-2 border-green-300 flex items-center justify-center text-green-600 text-xs font-semibold">Trigger</div>
                                                    <div className="w-8 h-0.5 bg-gray-300"></div>
                                                    <div className="w-24 h-16 rounded-xl bg-blue-100 border-2 border-blue-300 flex items-center justify-center text-blue-600 text-xs font-semibold">AI Agent</div>
                                                    <div className="w-8 h-0.5 bg-gray-300"></div>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="w-20 h-12 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 text-[10px] font-semibold">Email</div>
                                                        <div className="w-20 h-12 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 text-[10px] font-semibold">WhatsApp</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Floating decorative icons */}
                            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-blue-500">
                                <FaBox className="w-4 h-4" />
                            </div>
                            <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-green-500">
                                <FaChartLine className="w-4 h-4" />
                            </div>
                            <div className="absolute top-1/2 -right-4 w-8 h-8 rounded-lg bg-white shadow-lg flex items-center justify-center text-purple-500">
                                <FaUsers className="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}
