'use client';

import { useState } from 'react';
import { FaCheck } from 'react-icons/fa';

interface PricingPlan {
    id: string;
    name: string;
    price: string;
    priceLabel: string;
    subtitle: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
}

const pricingTabs = ['POS & Platform', 'Sales AI'];

// POS & Platform pricing plans
const posPlans: PricingPlan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$49',
        priceLabel: 'per month',
        subtitle: 'Perfect for single outlet',
        features: [
            'POS Core (cashier & transactions)',
            'Menu & Category Management',
            'Dine-in / Takeaway / Delivery',
            'Basic Stock Management',
            'Email / Digital Receipts',
            'Basic Reports (CSV/PDF)',
            'Self-serve Onboarding',
            'Email Support',
        ],
        ctaText: 'Get Started',
    },
    {
        id: 'growth',
        name: 'Growth',
        price: '$149',
        priceLabel: 'per month',
        subtitle: 'For growing businesses',
        features: [
            'Everything in Starter',
            'QR Ordering (Genfity Consumer)',
            'Kitchen & Queue Displays',
            'POS Mobile App',
            'Advanced Inventory (recipes)',
            'Voucher & Promo Engine',
            'Advanced Reports & Analytics',
            'Remote Onboarding (1 session)',
            'Priority Email + Chat Support',
        ],
        isPopular: true,
        ctaText: 'Get a Demo',
    },
    {
        id: 'scale',
        name: 'Scale',
        price: '$499',
        priceLabel: 'per month',
        subtitle: 'Enterprise & franchise',
        features: [
            'Everything in Growth',
            'Multi-branch Support',
            'Multi-warehouse Inventory',
            'Enterprise Analytics & API',
            'API Access & Integrations',
            'Dedicated Onboarding & Migration',
            '24/7 Priority Support',
            'Dedicated Account Manager',
        ],
        ctaText: 'Contact Sales',
    },
    {
        id: 'custom',
        name: 'Custom',
        price: 'Talk to Sales',
        priceLabel: '',
        subtitle: 'Tailored for your needs',
        features: [
            'Custom Outlet Limits',
            'Custom Order Volume',
            'White-label Options',
            'Custom Integrations',
            'On-premise Deployment',
            'Custom SLA',
            'Dedicated Support Team',
            'Enterprise Security',
        ],
        ctaText: 'Contact Sales',
    },
];

// Sales AI pricing plans
const salesAIPlans: PricingPlan[] = [
    {
        id: 'ai-basic',
        name: 'AI Basic',
        price: '$79',
        priceLabel: 'per month',
        subtitle: 'Automated inquiries & light ordering',
        features: [
            'WhatsApp Integration (Basic)',
            'Product & Menu Q&A',
            'Automated Response Limits',
            'Basic CRM Logs',
            'Standard SLA',
            'Email Support',
        ],
        ctaText: 'Request AI Demo',
    },
    {
        id: 'ai-pro',
        name: 'AI Pro',
        price: '$399',
        priceLabel: 'per month',
        subtitle: 'Full conversational sales & CRM',
        features: [
            'Advanced WhatsApp (multi-number)',
            'Fine-tuned Product Q&A',
            'Stock-aware Answers',
            'Create Order via Chat',
            'Full Automation & Follow-ups',
            'Full CRM Sync & Segmentation',
            'Per-branch Training (optional)',
            'Priority Support + Model Tuning',
        ],
        isPopular: true,
        ctaText: 'Contact Sales',
    },
];

const allPlans = [posPlans, salesAIPlans];

export default function CekatPricingSection() {
    const [activeTab, setActiveTab] = useState(0);
    const currentPlans = allPlans[activeTab];

    return (
        <section className="py-20 bg-gradient-to-b from-[#f8fafc] to-white relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">

                {/* Section Header */}
                {/* Section Header */}
                <div className="text-center mb-10">
                    {/* Pill Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-md font-semibold mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1A66D9]"></span>
                        <span>Simple pricing, powerful features</span>
                    </div>

                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[36px] md:text-[52px] font-semibold text-[#1A1615] tracking-tight mb-6 leading-[1.2]">
                        Modular Commerce Platform<br />At Competitive Pricing
                    </h2>
                    <p className="text-[18px] text-black max-w-3xl mx-auto leading-relaxed mb-8">
                        Pricing is custom based on outlets, order volume, and integrations. Request a demo for your tailored quote.
                    </p>

                    {/* Tab Switcher */}
                    <div className="inline-flex items-center p-1 rounded-full bg-[#f1f5f9] gap-0.5">
                        {pricingTabs.map((tab, index) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(index)}
                                className={`px-5 py-3 rounded-full text-sm font-medium transition-all ${activeTab === index
                                    ? 'bg-white text-[#1A1615] shadow-sm'
                                    : 'text-black hover:text-[#475569]'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {currentPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-xl border border-[#E2E8F0] flex flex-col ${plan.isPopular ? 'bg-gradient-to-t from-[#eff6ff] via-white to-white shadow-md ring-1 ring-blue-100' : 'bg-white'}`}
                        >
                            {/* Card Header */}
                            <div className="p-5 pb-4">
                                {/* Plan Name with Popular Badge */}
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className={`text-[24px] font-semibold ${plan.isPopular ? 'text-[#1A66D9]' : 'text-black'}`}>
                                        {plan.name}
                                    </h3>
                                    {plan.isPopular && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-blue-50 text-[#1A66D9] border border-blue-200">
                                            Popular
                                        </span>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="mb-0.5">
                                    <span className="text-[28px] font-bold text-black">
                                        {plan.price}
                                    </span>
                                    {plan.priceLabel && (
                                        <span className="text-black text-[14px] ml-1">
                                            {plan.priceLabel}
                                        </span>
                                    )}
                                </div>

                                {/* Subtitle */}
                                {plan.subtitle && (
                                    <p className="text-[14px] text-gray-400">
                                        {plan.subtitle}
                                    </p>
                                )}
                            </div>

                            {/* Features List with Dividers */}
                            <div className="flex-1 px-5">
                                {plan.features.map((feature, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-2.5 py-2.5 ${index < plan.features.length - 1 ? 'border-b border-gray-700]' : ''
                                            }`}
                                    >
                                        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
                                            <FaCheck className="w-3 h-3 text-[#22c55e]" />
                                        </span>
                                        <span className="text-[14px] text-gray-800 leading-snug">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <div className="p-5 pt-4">
                                <button
                                    className={`w-full py-3 rounded-full font-medium text-[14px] transition-all ${plan.isPopular
                                        ? 'bg-[#1A66D9] text-white hover:bg-[#1557B9] shadow-sm'
                                        : 'bg-white text-[#1A1615] border border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                                        }`}
                                >
                                    {plan.ctaText}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
