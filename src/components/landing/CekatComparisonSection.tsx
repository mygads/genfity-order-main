'use client';

import { FaTimes, FaCheck } from 'react-icons/fa';

export default function CekatComparisonSection() {
    return (
        <section className="py-20 bg-white relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 relative z-10">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                    {/* Disconnected Business Tools Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                        {/* Pill Label */}
                        <div className="flex justify-center pt-6">
                            <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-600 text-md font-semibold">
                                Disconnected Business Tools
                            </span>
                        </div>

                        {/* Illustration Area */}
                        <div className="relative mx-6 mt-6 mb-4 p-6 border-2 border-dashed border-red-200 rounded-2xl bg-red-50/30 h-[260px] w-auto">
                            {/* Placeholder illustration - scattered systems */}
                            <div className="flex flex-wrap gap-3 justify-center items-center h-full content-center opacity-60">
                                <div className="bg-red-100 rounded-xl px-4 py-2 text-red-400 text-sm">📊 Separate POS</div>
                                <div className="bg-red-100 rounded-xl px-4 py-2 text-red-400 text-sm">🛒 Different Orders</div>
                                <div className="bg-gray-100 rounded-xl px-4 py-2 text-gray-400 text-sm">💳 Another Payment</div>
                                <div className="bg-red-100 rounded-xl px-4 py-2 text-red-400 text-sm">📦 Manual Inventory</div>
                                <div className="bg-gray-100 rounded-xl px-4 py-2 text-gray-400 text-sm">🔄 Manual Sync</div>
                            </div>

                            {/* Cost Bubble */}
                            <div className="absolute -bottom-3 -right-3 bg-red-700 text-white rounded-full px-8 py-2 shadow-lg">
                                <div className="text-[14px] text-white">Operational overhead</div>
                                <div className="text-lg font-bold">High <span className="text-white text-sm font-normal">↑ 35%+</span></div>
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="px-6 pb-6 space-y-4">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaTimes className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Separate POS, ordering and payment systems</p>
                                    <p className="text-black text-sm font-medium">Data doesn't flow, errors multiply.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaTimes className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Manual inventory & reconciliation</p>
                                    <p className="text-black text-sm font-medium">Hours lost on spreadsheets and stock counts.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaTimes className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">No automated customer follow-up</p>
                                    <p className="text-black text-sm font-medium">Customers slip away, revenue lost.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaTimes className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Hard to scale across outlets</p>
                                    <p className="text-black text-sm font-medium">Each branch runs differently.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* One Unified Commerce Platform Card */}
                    <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden ring-1 ring-blue-100 flex flex-col h-full">
                        {/* Pill Label */}
                        <div className="flex justify-center pt-6">
                            <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-md font-semibold">
                                One Unified Commerce Platform
                            </span>
                        </div>

                        {/* Illustration Area */}
                        <div className="relative mx-6 mt-6 mb-4 p-6 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 h-[260px] w-auto">
                            {/* Placeholder illustration - unified system */}
                            <div className="flex flex-col gap-2 justify-center items-center h-full content-center">
                                <div className="flex gap-2">
                                    <div className="bg-blue-100 rounded-lg px-3 py-2 text-blue-600 text-sm font-medium">🏪 POS</div>
                                    <div className="bg-blue-100 rounded-lg px-3 py-2 text-blue-600 text-sm font-medium">📱 Orders</div>
                                    <div className="bg-blue-100 rounded-lg px-3 py-2 text-blue-600 text-sm font-medium">💳 Pay</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="bg-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">🤖 AI Sales</div>
                                    <div className="bg-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">📊 Reports</div>
                                </div>
                                <div className="text-blue-400 text-xs mt-2 text-center">All Connected in Real-Time</div>
                            </div>

                            {/* Cost Bubble */}
                            <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white rounded-full px-8 py-2 shadow-lg">
                                <div className="text-[14px] text-white">Operational efficiency</div>
                                <div className="text-lg font-bold">High <span className="text-green-300 text-sm font-medium">↑ 50%+</span></div>
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="px-6 pb-6 space-y-4">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaCheck className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">POS, online ordering, payments and AI in one system</p>
                                    <p className="text-black text-sm font-medium">Single source of truth for everything.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaCheck className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Automated inventory and real-time reporting</p>
                                    <p className="text-black text-sm font-medium">Stock deducts automatically, reports update instantly.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaCheck className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Built-in customer intelligence & retention tools</p>
                                    <p className="text-black text-sm font-medium">AI follow-ups, vouchers, and loyalty automation.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FaCheck className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-[16px]">Designed for multi-branch scaling</p>
                                    <p className="text-black text-sm font-medium">Centralized control, consistent operations.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

