'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ReferralSection() {
    const { t } = useTranslation();

    return (
        <section className="py-12 bg-white dark:bg-gray-900">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-gray-50 to-orange-50/50 dark:from-gray-800 dark:to-orange-900/10 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                    {/* Subtle accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>

                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                        {/* Left: Content */}
                        <div className="flex-1 text-center lg:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                Partnership
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {t('landing.referral.title')}
                            </h2>

                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('landing.referral.desc')}
                            </p>
                        </div>

                        {/* Right: Stats & CTA */}
                        <div className="flex flex-col items-center lg:items-end gap-4">
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">{t('landing.referral.commission')}</div>
                                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Recurring</div>
                                </div>
                                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-[#173C82] dark:text-blue-400">Lifetime</div>
                                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Earning</div>
                                </div>
                            </div>

                            <a
                                href="https://wa.me/6285174314023?text=Halo%2C%20saya%20tertarik%20dengan%20program%20referral%20GENFITY"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                {t('landing.referral.cta')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
