'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaChevronDown, FaCashRegister, FaMobileAlt, FaQrcode, FaCreditCard, FaGift, FaRobot } from 'react-icons/fa';

// Mega menu content for Products
const productMenuItems = {
    coreSystem: [
        { name: 'Genfity POS Core', desc: 'ERP & operations backbone', href: '/products/pos-core', icon: FaCashRegister },
        { name: 'Genfity POS Mobile', desc: 'Mobile companion', href: '/products/pos-mobile', icon: FaMobileAlt },
    ],
    ordering: [
        { name: 'Genfity Consumer', desc: 'QR & web ordering', href: '/products/consumer', icon: FaQrcode },
    ],
    paymentsLoyalty: [
        { name: 'Genfity Pay', desc: 'QRIS & payment gateway', href: '/products/pay', icon: FaCreditCard },
        { name: 'Genfity Loyalty', desc: 'Points & vouchers (Coming Soon)', href: '/products/loyalty', icon: FaGift, comingSoon: true },
    ],
    intelligence: [
        { name: 'Genfity Sales AI', desc: 'Conversational sales & WhatsApp', href: '/products/sales-ai', icon: FaRobot, highlight: true },
    ],
};

const solutionMenuItems = [
    { name: 'Restaurants (F&B)', href: '/solutions/fnb' },
    { name: 'Retail & Product Stores', href: '/solutions/retail' },
    { name: 'Services & Appointments', href: '/solutions/services' },
    { name: 'Multi-Branch & Franchise', href: '/solutions/multi-branch' },
];

export default function CekatLightNavbar() {
    const { t, locale: language, setLocale: setLanguage } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            document.body.classList.remove('overflow-hidden');
            return;
        }
        document.body.classList.add('overflow-hidden');
        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isMobileMenuOpen]);

    const scrollToSection = (id: string) => {
        setIsMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleDropdownEnter = (dropdown: string) => {
        if (dropdownTimeoutRef.current) {
            clearTimeout(dropdownTimeoutRef.current);
        }
        setActiveDropdown(dropdown);
    };

    const handleDropdownLeave = () => {
        dropdownTimeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
        }, 150);
    };

    return (
        <nav
            className={`fixed left-0 right-0 z-100 flex justify-center transition-all duration-500 ease-out will-change-transform ${isScrolled ? 'top-3' : 'top-0 pt-4'
                }`}
        >
            <div
                className={`flex items-center justify-between gap-8 transition-all duration-500 ease-out will-change-[width,height,border-radius,background-color,box-shadow,padding] ${isScrolled
                    ? 'w-[90%] max-w-6xl h-[52px] px-5 rounded-full bg-white/10 backdrop-blur-xl border border-gray-200/50 shadow-lg shadow-gray-200/30'
                    : 'w-full max-w-7xl h-[72px] px-8 rounded-none bg-transparent backdrop-blur-none border border-transparent shadow-none'
                    }`}
                style={{
                    transform: 'translateZ(0)', // Force GPU layer
                }}
            >
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="relative h-8 w-28">
                        <Image
                            src="/images/logo/logo.png"
                            alt="Genfity"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>

                {/* Desktop Navigation - Center */}
                <div className="hidden lg:flex items-center gap-6">
                    {/* Products Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => handleDropdownEnter('products')}
                        onMouseLeave={handleDropdownLeave}
                    >
                        <button className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[16px] font-semibold text-gray-700 hover:text-black transition-colors duration-200 flex items-center gap-1 pb-1">
                            Product
                            <FaChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Mega Menu */}
                        {activeDropdown === 'products' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50">
                                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 min-w-[600px]">
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Core System */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Core System</h4>
                                            <div className="space-y-2">
                                                {productMenuItems.coreSystem.map((item) => (
                                                    <Link key={item.href} href={item.href} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <item.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Ordering */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ordering</h4>
                                            <div className="space-y-2">
                                                {productMenuItems.ordering.map((item) => (
                                                    <Link key={item.href} href={item.href} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <item.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Payments & Loyalty */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payments & Loyalty</h4>
                                            <div className="space-y-2">
                                                {productMenuItems.paymentsLoyalty.map((item) => (
                                                    <Link key={item.href} href={item.href} className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${item.comingSoon ? 'opacity-60' : ''}`}>
                                                        <item.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                                                {item.name}
                                                                {item.comingSoon && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Soon</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Intelligence */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Intelligence</h4>
                                            <div className="space-y-2">
                                                {productMenuItems.intelligence.map((item) => (
                                                    <Link key={item.href} href={item.href} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${item.highlight ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                                                        <item.icon className={`w-5 h-5 mt-0.5 ${item.highlight ? 'text-blue-600' : 'text-blue-600'}`} />
                                                        <div>
                                                            <div className={`font-semibold text-sm ${item.highlight ? 'text-blue-700' : 'text-gray-900'}`}>{item.name}</div>
                                                            <div className="text-xs text-gray-500">{item.desc}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Solutions Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => handleDropdownEnter('solutions')}
                        onMouseLeave={handleDropdownLeave}
                    >
                        <button className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[16px] font-semibold text-gray-700 hover:text-black transition-colors duration-200 flex items-center gap-1 pb-1">
                            Solutions
                            <FaChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeDropdown === 'solutions' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50">
                                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 min-w-[220px]">
                                    <div className="space-y-1">
                                        {solutionMenuItems.map((item) => (
                                            <Link key={item.href} href={item.href} className="block px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/pricing"
                        className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[16px] font-semibold text-gray-700 hover:text-black transition-colors duration-200 pb-1"
                    >
                        Pricing
                    </Link>
                    <Link
                        href="/demo"
                        className="font-['Open_Runde','Inter',system-ui,sans-serif] text-[16px] font-semibold text-gray-700 hover:text-black transition-colors duration-200 pb-1"
                    >
                        Demo
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Language Toggle */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100">
                        <button
                            onClick={() => setLanguage('id')}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-all ${language === 'id'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            ID
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-all ${language === 'en'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            EN
                        </button>
                    </div>

                    <Link
                        href="/admin/login"
                        className="font-['Open_Runde','Inter',system-ui,sans-serif] text-sm font-semibold text-gray-700 hover:text-black transition-colors px-6 py-2 rounded-[100px] bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:scale-105 hover:shadow-lg"
                    >
                        Login
                    </Link>

                    <Link
                        href="/admin/register"
                        className="font-['Open_Runde','Inter',system-ui,sans-serif] font-semibold text-sm px-6 py-2 rounded-[100px] bg-[#2563eb] text-white border-none shadow-[0_4px_14px_0_rgba(26,102,217,0.39)] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:scale-105 hover:shadow-lg cursor-pointer"
                    >
                        Register
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex lg:hidden items-center gap-3">
                    {/* Mobile Language Toggle */}
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                        className="text-sm font-bold text-gray-500 border border-gray-200 px-2 py-1 rounded-full"
                    >
                        {language.toUpperCase()}
                    </button>

                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-gray-600 hover:text-gray-900 focus:outline-none p-2"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>


            {/* Mobile Menu Drawer */}
            {
                mounted && (
                    <div
                        className={`lg:hidden fixed inset-0 z-[1000] transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        role="dialog"
                        aria-modal="true"
                        aria-hidden={!isMobileMenuOpen}
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />

                        <div
                            className={`absolute right-0 top-0 h-dvh w-[80%] max-w-sm bg-white flex flex-col gap-6 overflow-y-auto transform transition-transform duration-300 ease-in-out shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                                }`}
                            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
                        >
                            <div className="flex justify-end px-6">
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close menu">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4 px-6">
                                <Link href="/products/pos-core" className="block text-lg font-medium text-grey-800 hover:text-black transition-colors">
                                    Products
                                </Link>
                                <Link href="/solutions/fnb" className="block text-lg font-medium text-grey-800 hover:text-black transition-colors">
                                    Solutions
                                </Link>
                                <Link href="/pricing" className="block text-lg font-medium text-grey-800 hover:text-black transition-colors">
                                    Pricing
                                </Link>
                                <Link href="/demo" className="block text-lg font-medium text-grey-800 hover:text-black transition-colors">
                                    Demo
                                </Link>
                            </div>

                            <hr className="border-gray-200 mx-6" />

                            <div className="space-y-3 px-6">
                                <Link href="/admin/login" className="block w-full py-2 text-center rounded-full bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                                    Login
                                </Link>
                                <Link href="/demo?utm_source=mobile_menu&utm_medium=cta" className="block w-full py-2 text-center rounded-full font-semibold text-sm bg-[#2563eb] text-white shadow-[0_4px_14px_0_rgba(26,102,217,0.39)] transition-all duration-200">
                                    Get a Demo
                                </Link>
                            </div>

                            <div className="mt-auto px-6">
                                <p className="text-xs text-center text-gray-400">
                                    © 2026 <a href="https://genfity.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">GENFITY DIGITAL SOLUTION</a>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
        </nav>
    );
}
