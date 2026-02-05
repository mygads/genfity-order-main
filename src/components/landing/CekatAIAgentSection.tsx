'use client';

import Link from 'next/link';
import { 
    FaComments, 
    FaArrowRight, 
    FaStore, 
    FaCashRegister, 
    FaBoxOpen, 
    FaDesktop, 
    FaMobileAlt, 
    FaQrcode, 
    FaRocket, 
    FaLock, 
    FaRobot, 
    FaWhatsapp, 
    FaChartLine, 
    FaSync, 
    FaCreditCard, 
    FaRandom, 
    FaChartBar, 
    FaBell, 
    FaWifi, 
    FaPrint, 
    FaMagic,
    FaMobile,
    FaStar,
    FaGift,
    FaUserFriends
} from 'react-icons/fa';

interface FeatureItem {
    icon: React.ReactNode;
    iconColor: string;
    title: string;
    description: string;
}

interface FeatureBlock {
    badge: string;
    badgeIcon: React.ReactNode;
    isNew?: boolean;
    title: string;
    titleHighlight: string;
    description: string;
    learnMoreUrl: string;
    features: FeatureItem[];
    reversed?: boolean;
}

const featureBlocks: FeatureBlock[] = [
    {
        badge: "Genfity POS Core",
        badgeIcon: <FaStore />,
        title: "POS & ERP for",
        titleHighlight: "Daily Operations",
        description: "The operational backbone: cashier, inventory, and HQ reporting in one unified system designed for multi-branch scaling.",
        learnMoreUrl: "/product/genfity-pos",
        features: [
            { icon: <FaCashRegister />, iconColor: "bg-blue-600 text-white", title: "Cashier & Transactions", description: "Touch-friendly POS with split-bill support" },
            { icon: <FaBoxOpen />, iconColor: "bg-purple-600 text-white", title: "Inventory & Recipes", description: "Auto stock deduction, recipe-based usage" },
            { icon: <FaDesktop />, iconColor: "bg-green-600 text-white", title: "Kitchen & Queue Displays", description: "KDS, customer display, multi-station routing" },
        ],
        reversed: false,
    },
    {
        badge: "Genfity Consumer",
        badgeIcon: <FaMobileAlt />,
        title: "Modern Customer Ordering",
        titleHighlight: "No App Required",
        description: "Web-first customer ordering experience. QR, per-table, or direct web ordering without app installs.",
        learnMoreUrl: "/product/genfity-consumer",
        features: [
            { icon: <FaQrcode />, iconColor: "bg-blue-600 text-white", title: "QR & Per-Table Ordering", description: "Generate QR that links directly to menu" },
            { icon: <FaRocket />, iconColor: "bg-purple-600 text-white", title: "All Order Types", description: "Dine-in, takeaway & delivery flows" },
            { icon: <FaLock />, iconColor: "bg-green-600 text-white", title: "Easy Login", description: "OTP / WhatsApp / Email for quick checkout" },
        ],
        reversed: true,
    },
    {
        badge: "Genfity Sales AI",
        badgeIcon: <FaRobot />,
        isNew: true,
        title: "AI That Actively",
        titleHighlight: "Helps You Sell",
        description: "AI answers, recommends, and converts. Integrated into WhatsApp and Genfity workflows for 24/7 automated sales.",
        learnMoreUrl: "/product/genfity-sales-ai",
        features: [
            { icon: <FaWhatsapp />, iconColor: "bg-blue-600 text-white", title: "WhatsApp Product Q&A", description: "Natural language answers & order capture" },
            { icon: <FaChartLine />, iconColor: "bg-purple-600 text-white", title: "Stock-Aware Suggestions", description: "AI checks real-time stock before recommending" },
            { icon: <FaSync />, iconColor: "bg-green-600 text-white", title: "Automated Follow-up", description: "Voucher reminders & repeat order nudges" },
        ],
        reversed: false,
    },
    {
        badge: "Genfity Pay",
        badgeIcon: <FaCreditCard />,
        title: "Payments & QRIS",
        titleHighlight: "Ready",
        description: "Accept all payment methods with QRIS under your merchant name. Real-time reconciliation and settlement-ready architecture.",
        learnMoreUrl: "/product/genfity-pay",
        features: [
            { icon: <FaQrcode />, iconColor: "bg-blue-600 text-white", title: "QRIS Integration", description: "Static & dynamic QR under merchant name" },
            { icon: <FaRandom />, iconColor: "bg-purple-600 text-white", title: "Multi-Gateway", description: "Split payments & multiple payment options" },
            { icon: <FaChartBar />, iconColor: "bg-green-600 text-white", title: "Real-time Reconciliation", description: "Instant settlement & refund support" },
        ],
        reversed: true,
    },
    {
        badge: "Genfity POS Mobile",
        badgeIcon: <FaMobile />,
        title: "Mobile Companion for",
        titleHighlight: "Field Operations",
        description: "Take your POS anywhere with mobile companion app. Real-time notifications, offline support, and role-based access.",
        learnMoreUrl: "/product/genfity-mobile",
        features: [
            { icon: <FaBell />, iconColor: "bg-blue-600 text-white", title: "Real-time Notifications", description: "Instant order alerts on your phone" },
            { icon: <FaWifi />, iconColor: "bg-purple-600 text-white", title: "Offline Cashier", description: "Emergency checkout when network is down" },
            { icon: <FaPrint />, iconColor: "bg-green-600 text-white", title: "Wireless Printing", description: "Bluetooth/WiFi printer setup" },
        ],
        reversed: false,
    },
    {
        badge: "Genfity Loyalty",
        badgeIcon: <FaStar />,
        title: "Build Customer",
        titleHighlight: "Loyalty That Lasts",
        description: "Turn one-time visitors into regulars with a built-in loyalty system. Points, rewards, and member tiers fully integrated with your POS.",
        learnMoreUrl: "/product/genfity-loyalty",
        features: [
            { icon: <FaGift />, iconColor: "bg-blue-600 text-white", title: "Points & Rewards", description: "Earn points on every purchase automatically" },
            { icon: <FaUserFriends />, iconColor: "bg-purple-600 text-white", title: "Member Tiers", description: "Silver, Gold, Platinum levels with custom perks" },
            { icon: <FaChartLine />, iconColor: "bg-green-600 text-white", title: "Customer Insights", description: "Track spending habits and favorite items" },
        ],
        reversed: true,
    },
];

export default function CekatAIAgentSection() {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">

                {/* Section Header */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-md font-semibold mb-6">
                        <FaMagic className="w-4 h-4" />
                        <span>Core Product Suite</span>
                    </div>
                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[36px] md:text-[52px] font-semibold text-black tracking-tight mb-6 leading-[1.1]">
                        Everything You Need to<br className="hidden md:block" />Run Your Business
                    </h2>
                    <p className="text-[20px] text-black max-w-3xl mx-auto leading-[1.4]    ">
                        From cashier operations to AI-powered sales, everything works together in one unified platform built for F&B, retail, and service businesses.
                    </p>
                </div>

                {/* Feature Blocks - Z Pattern */}
                <div className="space-y-32">
                    {featureBlocks.map((block, index) => (
                        <div
                            key={index}
                            className={`flex flex-col ${block.reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}
                        >
                            {/* Image Side */}
                            <div className="flex-1 w-full">
                                <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-2xl shadow-blue-200/40 border border-blue-100/60">
                                    <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden bg-white border border-slate-100">
                                        {/* Placeholder for actual dashboard image */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-8">
                                            <div className="text-7xl mb-6">{block.badgeIcon}</div>
                                            <p className="text-gray-400 text-sm text-center max-w-xs">{block.badge} Dashboard</p>
                                            {/* Mock UI elements */}
                                            <div className="mt-6 flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Text Side */}
                            <div className="flex-1 w-full">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-md font-semibold mb-4">
                                    <span>{block.badgeIcon}</span>
                                    <span>{block.badge}</span>
                                    {block.isNew && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">New</span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-[32px] md:text-[40px] font-semibold text-black mb-4 leading-[1.2]">
                                    {block.title}{' '}
                                    <span className="text-[#1A66D9]">{block.titleHighlight}</span>
                                </h3>

                                {/* Description */}
                                <p className="text-gray-700 text-[18px] mb-4 ">
                                    {block.description}
                                </p>

                                {/* Feature List */}
                                <div className="space-y-4 mb-10">
                                    {block.features.map((feature, fIndex) => (
                                        <div key={fIndex} className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-xl ${feature.iconColor} flex items-center justify-center text-xl`}>
                                                {feature.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1A1615] text-[15px]">{feature.title}</p>
                                                <p className="text-black font-medium text-[16px]">{feature.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap gap-4">
                                    <a 
                                        href="https://wa.me/6285174314023"
                                        target="_blank"
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#1A66D9] text-white font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:bg-[#1557B9] transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                                    >
                                        <FaWhatsapp className="w-5 h-5" />
                                        Get a Demo
                                    </a>
                                    <Link 
                                        href={block.learnMoreUrl}
                                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#F3F4F6] text-[#1A1615] font-semibold text-[15px] hover:bg-[#E5E7EB] transition-all"
                                    >
                                        Learn More
                                        <FaArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
