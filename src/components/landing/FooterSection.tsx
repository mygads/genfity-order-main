'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';
import Image from 'next/image';

export default function FooterSection() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-12 pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1 space-y-3">
                        <Link href="https://genfity.com" target="_blank" className="inline-flex items-center gap-2">
                            <div className="relative h-8 w-24">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px]">
                            Empowering F&B businesses with modern ordering solutions.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{t('landing.footer.links')}</h4>
                        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <li><Link href="#features" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.nav.features')}</Link></li>
                            <li><Link href="#pricing" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.nav.pricing')}</Link></li>
                            <li><Link href="#how-it-works" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.nav.howItWorks')}</Link></li>
                            <li><Link href="https://genfity.com" target="_blank" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.nav.about')}</Link></li>
                            <li><Link href="/influencer/register" className="hover:text-brand-500 transition-colors">{t('landing.nav.referral')}</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{t('landing.footer.legal')}</h4>
                        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <li><Link href="/privacy-policy" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.footer.privacy')}</Link></li>
                            <li><Link href="/terms-of-service" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">{t('landing.footer.terms')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{t('landing.footer.contact')}</h4>
                        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <li className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <a href="mailto:genfity@gmail.com" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">genfity@gmail.com</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                <a href="https://wa.me/6285174314023" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors">085174314023</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>Bandung, Jawa Barat, Indonesia</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>157 Braidwood DR, Australind WA 6233, Australia</span>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        © {currentYear} <a href="https://genfity.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#173C82] dark:hover:text-blue-400 transition-colors">GENFITY DIGITAL SOLUTION</a>. {t('landing.footer.rights')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
