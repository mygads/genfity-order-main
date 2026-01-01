'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Image from 'next/image';
import Link from 'next/link';
import {
    FaStore, FaChartLine, FaWallet,
    FaGlobeAsia, FaPercentage, FaDatabase,
    FaUtensils, FaShoppingBag, FaMotorcycle, FaBolt
} from 'react-icons/fa';

export default function OnlineOrderingSection() {
    const { t } = useTranslation();
    const [activeMode, setActiveMode] = useState<'dineIn' | 'pickup' | 'delivery'>('dineIn');

    // Product Features
    const features = [
        {
            key: 'salesMode',
            icon: <FaStore className="w-8 h-8" />,
            color: 'bg-blue-50 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            key: 'upselling',
            icon: <FaChartLine className="w-8 h-8" />,
            color: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400'
        },
        {
            key: 'digitalPayment',
            icon: <FaWallet className="w-8 h-8" />,
            color: 'bg-purple-50 dark:bg-purple-900/20',
            iconColor: 'text-purple-600 dark:text-purple-400'
        }
    ];

    // Benefits
    const benefits = [
        {
            key: 'expandReach',
            icon: <FaGlobeAsia className="w-6 h-6" />
        },
        {
            key: 'lowCommission',
            icon: <FaPercentage className="w-6 h-6" />
        },
        {
            key: 'dataStorage',
            icon: <FaDatabase className="w-6 h-6" />
        }
    ];

    // Order Modes
    const orderModes = [
        { key: 'dineIn', icon: <FaUtensils /> },
        { key: 'pickup', icon: <FaShoppingBag /> },
        { key: 'delivery', icon: <FaMotorcycle /> }
    ];

    return (
        <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Hero Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#173C82]/10 dark:bg-[#173C82]/20 text-[#173C82] dark:text-blue-400 font-semibold text-sm mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {t('landing.onlineOrder.badge')}
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        {t('landing.onlineOrder.title')}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {t('landing.onlineOrder.subtitle')}
                    </p>
                </div>

                {/* Product Features */}
                <div className="mb-20">
                    <div className="text-center mb-10">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('landing.onlineOrder.features.title')}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.key}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.color} ${feature.iconColor} mb-4`}>
                                    {feature.icon}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    {t(`landing.onlineOrder.features.${feature.key}.title`)}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {t(`landing.onlineOrder.features.${feature.key}.desc`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="mb-20">
                    <div className="text-center mb-10">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('landing.onlineOrder.benefits.title')}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {benefits.map((benefit) => (
                            <div
                                key={benefit.key}
                                className="bg-gradient-to-br from-[#173C82] to-[#1e4a9a] rounded-2xl p-6 text-white group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mb-4">
                                    {benefit.icon}
                                </div>
                                <h4 className="text-lg font-bold mb-2">
                                    {t(`landing.onlineOrder.benefits.${benefit.key}.title`)}
                                </h4>
                                <p className="text-sm text-blue-100 leading-relaxed">
                                    {t(`landing.onlineOrder.benefits.${benefit.key}.desc`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Modes Interactive Section */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Left Content */}
                        <div className="p-8 lg:p-12">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium text-xs mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {t('landing.onlineOrder.orderModes.badge')}
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                {t('landing.onlineOrder.orderModes.title')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                {t('landing.onlineOrder.orderModes.desc')}
                            </p>

                            {/* Mode Tabs */}
                            <div className="flex flex-wrap gap-3 mb-8">
                                {orderModes.map((mode) => (
                                    <button
                                        key={mode.key}
                                        onClick={() => setActiveMode(mode.key as 'dineIn' | 'pickup' | 'delivery')}
                                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${activeMode === mode.key
                                            ? 'bg-[#173C82] text-white shadow-lg shadow-blue-900/20'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        <span className="text-lg">{mode.icon}</span>
                                        {t(`landing.onlineOrder.orderModes.${mode.key}`)}
                                    </button>
                                ))}
                            </div>

                            {/* Mode Description */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t(`landing.onlineOrder.orderModes.${activeMode}Desc`)}
                                </p>
                            </div>
                        </div>

                        {/* Right Visual */}
                        <div className="bg-gradient-to-br from-[#173C82] to-[#0f2a5c] flex items-center justify-center relative overflow-hidden min-h-[400px]">
                            {/* Background Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

                            <div className="relative z-10 w-full h-full p-8 flex items-center justify-center">
                                <div className="relative w-full max-w-[400px] aspect-square transition-transform duration-500 hover:scale-105">
                                    <Image
                                        key={activeMode} // Triggers animation on change
                                        src={
                                            activeMode === 'dineIn' ? "/images/landing/dine_in_illustration.png" :
                                                activeMode === 'pickup' ? "/images/landing/pickup_illustration.png" :
                                                    "/images/landing/delivery_illustration.png"
                                        }
                                        alt={t(`landing.onlineOrder.orderModes.${activeMode}`)}
                                        fill
                                        className="object-contain drop-shadow-2xl animate-fade-in" // Add a simple fade-in or similar class if defined, or just rely on React diffing
                                        priority
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-0 right-0 px-8 text-center text-white/50 text-xs z-20">
                                {/* Key Features List Overlay - Optional or removed for cleaner look if image is detailed */}
                                <div className="flex justify-center gap-4 mt-4">
                                    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                                        <FaBolt className="w-3 h-3 text-emerald-400" />
                                        <span className="text-sm font-medium text-white/90">
                                            {activeMode === 'dineIn' && t('landing.onlineOrder.keyPoints.noInstall')}
                                            {activeMode === 'pickup' && "Skip the Line"}
                                            {activeMode === 'delivery' && "Real-time Tracking"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-16 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('landing.onlineOrder.bottomCta')}
                    </p>
                    <Link
                        href="/merchant/register"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F07600] hover:bg-[#D96A00] text-white font-bold rounded-xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                    >
                        {t('landing.onlineOrder.ctaFinal')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}
