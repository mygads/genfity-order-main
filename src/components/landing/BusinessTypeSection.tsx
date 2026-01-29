'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function BusinessTypeSection() {
    const { t } = useTranslation();

    const modes = [
        {
            key: 'customer',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
            ),
            color: 'bg-brand-50',
            iconColor: 'text-brand-600',
            borderColor: 'group-hover:border-brand-200'
        },
        {
            key: 'kitchen',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'bg-blue-50',
            iconColor: 'text-blue-600',
            borderColor: 'group-hover:border-blue-200'
        },
        {
            key: 'admin',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            borderColor: 'group-hover:border-emerald-200'
        }
    ];

    return (
        <section className={LANDING_SECTION}>
            <div className={LANDING_CONTAINER}>
                <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
                    <h2 className={LANDING_H2}>
                        {t('landing.system_modes.title')}
                    </h2>
                    <p className={cn(LANDING_P, 'max-w-2xl mx-auto')}>
                        {t('landing.system_modes.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modes.map((mode) => (
                        <div
                            key={mode.key}
                            className={`bg-white/80 backdrop-blur rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${mode.borderColor}`}
                        >
                            <div className={`flex items-center justify-center h-40 ${mode.color}`}>
                                <div className={`${mode.iconColor} transition-transform group-hover:scale-110 duration-300`}>
                                    {mode.icon}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {t(`landing.system_modes.${mode.key}.title`)}
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {t(`landing.system_modes.${mode.key}.desc`)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
