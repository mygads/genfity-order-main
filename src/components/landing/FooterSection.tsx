'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';
import Image from 'next/image';

export default function FooterSection() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="https://genfity.com" target="_blank" className="flex items-center gap-2">
                            <div className="relative h-10 w-32">
                                <Image
                                    src="/images/logo/logo.png"
                                    alt="GENFITY"
                                    fill
                                    className="object-contain block dark:hidden"
                                />
                                <Image
                                    src="/images/logo/logo-dark-mode.png"
                                    alt="GENFITY"
                                    fill
                                    className="object-contain hidden dark:block"
                                />
                            </div>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                            Empowering F&B businesses with modern, efficient, and scalable ordering solutions.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">{t('landing.footer.links')}</h4>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <li><Link href="#features" className="hover:text-orange-500 transition-colors">{t('landing.nav.features')}</Link></li>
                            <li><Link href="#pricing" className="hover:text-orange-500 transition-colors">{t('landing.nav.pricing')}</Link></li>
                            <li><Link href="#how-it-works" className="hover:text-orange-500 transition-colors">{t('landing.nav.howItWorks')}</Link></li>
                            <li><Link href="https://genfity.com" target="_blank" className="hover:text-orange-500 transition-colors">{t('landing.nav.about')}</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">{t('landing.footer.legal')}</h4>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <li><Link href="/privacy-policy" className="hover:text-orange-500 transition-colors">{t('landing.footer.privacy')}</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-orange-500 transition-colors">{t('landing.footer.terms')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">{t('landing.footer.contact')}</h4>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span>support@genfity.com</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>Medan, Indonesia</span>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        © {currentYear} GENFITY. {t('landing.footer.rights')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
