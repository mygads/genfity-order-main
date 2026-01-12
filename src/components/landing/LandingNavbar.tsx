'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useRouter } from 'next/navigation';

export default function LandingNavbar() {
    const { t, locale: language, setLocale: setLanguage } = useTranslation();
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [merchantCode, setMerchantCode] = useState('');

    useEffect(() => {
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

    const _handleMerchantCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (merchantCode.trim()) {
            router.push(`/${merchantCode.toUpperCase()}`);
        }
    };

    // Used in JSX for merchant code input
    const _setMerchantCode = setMerchantCode;

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled
                    ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-gray-200 dark:border-gray-800'
                    : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-transparent lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none py-2 lg:py-4'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-20">

                    <Link href="/" className="shrink-0 flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="relative h-10 w-32 md:w-36">
                            {/* Light Mode Logo */}
                            <Image
                                src="/images/logo/logo.png"
                                alt="Genfity"
                                fill
                                className="object-contain block dark:hidden"
                                priority
                            />
                            {/* Dark Mode Logo */}
                            <Image
                                src="/images/logo/logo-dark-mode.png"
                                alt="Genfity"
                                fill
                                className="object-contain hidden dark:block"
                                priority
                            />
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-8">
                        <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-600 hover:text-[#173C82] dark:text-gray-300 dark:hover:text-blue-400 transition-colors">
                            {t('landing.nav.features')}
                        </button>
                        <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-gray-600 hover:text-[#173C82] dark:text-gray-300 dark:hover:text-blue-400 transition-colors">
                            {t('landing.nav.pricing')}
                        </button>
                        <button onClick={() => scrollToSection('howItWorks')} className="text-sm font-medium text-gray-600 hover:text-[#173C82] dark:text-gray-300 dark:hover:text-blue-400 transition-colors">
                            {t('landing.nav.howItWorks')}
                        </button>
                        <a href="https://genfity.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-600 hover:text-[#173C82] dark:text-gray-300 dark:hover:text-blue-400 transition-colors">
                            {t('landing.nav.about')}
                        </a>
                        <Link href="/influencer/register" className="text-sm font-medium text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors">
                            {t('landing.nav.referral')}
                        </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="hidden lg:flex items-center space-x-4">
                        {/* Language Toggle */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex items-center">
                            <button
                                onClick={() => setLanguage('id')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${language === 'id' ? 'bg-white dark:bg-gray-700 text-[#173C82] dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                ID
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-gray-700 text-[#173C82] dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                EN
                            </button>
                        </div>

                        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700"></div>

                        <Link href="/admin/login" className="text-sm font-medium text-gray-700 hover:text-[#173C82] dark:text-white dark:hover:text-blue-400 transition-colors">
                            {t('landing.nav.login')}
                        </Link>

                        <Link
                            href="/merchant/register"
                            className="px-5 py-2 bg-[#173C82] text-white text-sm font-semibold rounded-lg hover:bg-[#122c60] transition-all shadow-md"
                        >
                            {t('landing.nav.register')}
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex lg:hidden items-center gap-4">
                        {/* Mobile Language Toggle (Simplified) */}
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                            className="text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md"
                        >
                            {language.toUpperCase()}
                        </button>

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
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
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            <div
                className={`lg:hidden fixed inset-0 z-1000 transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                role="dialog"
                aria-modal="true"
                aria-hidden={!isMobileMenuOpen}
            >
                <div
                    className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />

                <div
                    className={`absolute right-0 top-0 h-dvh w-[80%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col gap-6 overflow-y-auto transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
                >
                    <div className="flex justify-end px-6">
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500" aria-label="Close menu">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-4 px-6">
                        <button onClick={() => scrollToSection('features')} className="block text-lg font-medium text-gray-900 dark:text-white">{t('landing.nav.features')}</button>
                        <button onClick={() => scrollToSection('pricing')} className="block text-lg font-medium text-gray-900 dark:text-white">{t('landing.nav.pricing')}</button>
                        <button onClick={() => scrollToSection('howItWorks')} className="block text-lg font-medium text-gray-900 dark:text-white">{t('landing.nav.howItWorks')}</button>
                        <a href="https://genfity.com" target="_blank" rel="noopener noreferrer" className="block text-lg font-medium text-gray-900 dark:text-white">{t('landing.nav.about')}</a>
                        <Link href="/influencer/register" className="block text-lg font-medium text-orange-500">{t('landing.nav.referral')}</Link>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-800" />

                    <div className="space-y-4 px-6">
                        <Link href="/admin/login" className="block w-full py-2.5 text-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold text-sm">
                            {t('landing.nav.login')}
                        </Link>
                        <Link href="/merchant/register" className="block w-full py-2.5 text-center rounded-lg bg-[#173C82] text-white font-semibold text-sm shadow-md">
                            {t('landing.nav.register')}
                        </Link>
                    </div>

                    <div className="mt-auto px-6">
                        <p className="text-xs text-center text-gray-400">© 2026 <a href="https://genfity.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#173C82]">GENFITY DIGITAL SOLUTION</a></p>
                    </div>
                </div>
            </div>
        </>
    );
}
