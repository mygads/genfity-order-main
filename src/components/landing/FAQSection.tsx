'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useState } from 'react';

export default function FAQSection() {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return (
        <section className="py-16 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.faq.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.faq.subtitle')}
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((item, index) => (
                        <div
                            key={index}
                            className={`border rounded-xl transition-all duration-300 ${openIndex === index
                                ? 'border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-900/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-100 dark:hover:border-orange-900/30'
                                }`}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                            >
                                <span className={`text-base font-semibold ${openIndex === index ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                                    {t(`landing.faq.q${item}` as any)}
                                </span>
                                <svg
                                    className={`w-5 h-5 transform transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-orange-500' : 'text-gray-400'}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-5 pt-0 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {t(`landing.faq.a${item}` as any)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
