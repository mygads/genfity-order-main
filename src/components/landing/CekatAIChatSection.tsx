'use client';

import { FaRobot } from 'react-icons/fa';

export default function CekatAIChatSection() {
    return (
        <section
            className="py-24 relative overflow-hidden bg-white"
        >
            <div className="max-w-6xl mx-auto px-6">

                {/* Section Header */}
                {/* Section Header */}
                <div className="text-center mb-16">
                    {/* Pill Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-md font-semibold mb-6">
                        <FaRobot className="w-4 h-4" />
                        <span>How Genfity Sales AI Works</span>
                    </div>

                    <h2 className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[36px] md:text-[52px] font-semibold text-[#1A1615] tracking-tight mb-6 leading-[1.2]">
                        AI That Doesn't Just Talk<br />
                        It Executes Orders
                    </h2>
                    <p className="text-[20px] text-black max-w-3xl mx-auto leading-relaxed">
                        From customer message to completed order <br /> 
                        Genfity Sales AI handles the entire flow.
                        Stock-aware answers, automated follow-ups, and orders pushed directly to your POS.
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="space-y-8">

                    {/* Card 1: Sales & Customer Service AI Agent */}
                    <div
                        className="grid md:grid-cols-2 gap-8 items-center min-h-[420px]"
                        style={{
                            backgroundColor: 'rgba(245, 245, 245, 0.5)',
                            borderRadius: '28px',
                            padding: '28px'
                        }}
                    >
                        {/* Left: Chat Mockup Image with Gradient Background */}
                        <div className="relative h-[450px] rounded-2xl overflow-hidden bg-gradient-to-t from-blue-300 via-cyan-300 to-sky-100 flex items-center justify-center">

                            {/* Simplified Chat Mockup */}
                            <div className="relative w-full max-w-[320px]">
                                {/* Chat Window */}
                                <div className="relative bg-white rounded-2xl shadow-lg p-4">
                                    <div className="space-y-3">
                                        {/* Message Row */}
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0"></div>
                                            <div className="bg-gray-100 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-700">
                                                Halo, saya mau tanya produk
                                            </div>
                                        </div>
                                        {/* Reply */}
                                        <div className="flex justify-end">
                                            <div className="bg-blue-500 rounded-xl rounded-tr-none px-3 py-2 text-sm text-white">
                                                Halo! Ada yang bisa saya bantu?
                                            </div>
                                        </div>
                                        {/* Another message */}
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0"></div>
                                            <div className="bg-gray-100 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-700">
                                                Berapa harganya?
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Social Icons */}
                                <div className="absolute -top-2 -left-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </div>
                                <div className="absolute top-4 -right-4 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                </div>
                                <div className="absolute -bottom-2 left-8 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.548 3.714 7.252V22l3.418-1.876c.912.252 1.878.388 2.868.388 5.523 0 10-4.145 10-9.243S17.523 2 12 2z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Right: Content */}
                        <div className="py-4">
                            <p
                                className="uppercase tracking-wider mb-4"
                                style={{
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    lineHeight: '18.75px',
                                    color: 'rgb(97, 74, 68)'
                                }}
                            >
                                Customer to AI
                            </p>
                            <h3
                                className="mb-4"
                                style={{
                                    fontSize: '40px',
                                    fontWeight: 600,
                                    lineHeight: '48px',
                                    letterSpacing: '-1.2px',
                                    color: 'rgb(26, 22, 21)'
                                }}
                            >
                                Customer Messages → AI Answers & Creates Order
                            </h3>
                            <p
                                style={{
                                    fontSize: '18px',
                                    fontWeight: 400,
                                    lineHeight: '27px',
                                    color: 'rgb(69, 63, 61)'
                                }}
                            >
                                Customer messages via WhatsApp or web. AI answers product/menu questions, checks real-time stock,
                                proposes options and creates the order — all automatically without human intervention.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Omnichannel Dashboard */}
                    <div
                        className="grid md:grid-cols-2 gap-8 items-center min-h-[420px]"
                        style={{
                            backgroundColor: 'rgba(245, 245, 245, 0.5)',
                            borderRadius: '28px',
                            padding: '28px'
                        }}
                    >
                        {/* Left: Content */}
                        <div className="py-4 order-2 md:order-1">
                            <p
                                className="uppercase tracking-wider mb-4"
                                style={{
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    lineHeight: '18.75px',
                                    color: 'rgb(97, 74, 68)'
                                }}
                            >
                                Order to POS & Follow-up
                            </p>
                            <h3
                                className="mb-4"
                                style={{
                                    fontSize: '40px',
                                    fontWeight: 600,
                                    lineHeight: '48px',
                                    letterSpacing: '-1.2px',
                                    color: 'rgb(26, 22, 21)'
                                }}
                            >
                                Order Flows to POS → Automated Follow-ups
                            </h3>
                            <p
                                style={{
                                    fontSize: '18px',
                                    fontWeight: 400,
                                    lineHeight: '27px',
                                    color: 'rgb(69, 63, 61)'
                                }}
                            >
                                Order flows into Genfity POS Core, kitchen and inventory update in real-time.
                                AI then handles automated follow-up, voucher reminders, and repeat order nudges.
                            </p>
                        </div>

                        {/* Right: Dashboard Mockup with Gradient Background */}
                        <div className="relative h-[450px] rounded-2xl overflow-hidden bg-gradient-to-t from-blue-300 via-cyan-300 to-sky-100 flex items-center justify-center order-1 md:order-2">

                            {/* Dashboard Window */}
                            <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-[400px]">
                                {/* Header Bar */}
                                <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="p-4 flex gap-4">
                                    {/* Sidebar */}
                                    <div className="w-12 space-y-3">
                                        <div className="h-8 w-8 bg-blue-500 rounded-lg"></div>
                                        <div className="h-8 w-8 bg-gray-100 rounded-lg"></div>
                                        <div className="h-8 w-8 bg-gray-100 rounded-lg"></div>
                                        <div className="h-8 w-8 bg-gray-100 rounded-lg"></div>
                                    </div>
                                    {/* Chat List */}
                                    <div className="flex-1 space-y-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-xl flex items-center gap-3 ${i === 1 ? 'bg-blue-50 border-l-3 border-blue-500' : 'bg-gray-50'}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                                <div className="flex-1">
                                                    <div className="h-2.5 w-20 bg-gray-300 rounded mb-1.5"></div>
                                                    <div className="h-2 w-28 bg-gray-200 rounded"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Floating Chart Badge */}
                            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center z-10">
                                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
