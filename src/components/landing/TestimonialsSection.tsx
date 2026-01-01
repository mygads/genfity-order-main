'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function TestimonialsSection() {
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);

    const testimonials = [1, 2, 3, 4, 5];

    // Auto-advance
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((current) => (current + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    return (
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('landing.testimonials.title')}
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        {t('landing.testimonials.subtitle')}
                    </p>
                </div>

                <div className="max-w-2xl mx-auto relative">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[180px] flex items-center">
                        <div
                            className="flex transition-transform duration-500 ease-out w-full"
                            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                        >
                            {testimonials.map((item) => (
                                <div key={item} className="w-full flex-shrink-0 p-6 flex flex-col sm:flex-row items-center gap-5">
                                    <div className="flex-shrink-0 relative">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="text-center sm:text-left flex-1 space-y-2">
                                        <div className="flex gap-0.5 justify-center sm:justify-start">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} className="w-3.5 h-3.5 text-orange-400 fill-current" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>

                                        <blockquote className="text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed">
                                            &ldquo;{t(`landing.testimonials.${item}.quote`)}&rdquo;
                                        </blockquote>

                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {t(`landing.testimonials.${item}.author`)}
                                            </div>
                                            <div className="text-xs text-[#173C82] dark:text-blue-400 font-medium">
                                                {t(`landing.testimonials.${item}.role`)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Dots */}
                    <div className="flex justify-center gap-1.5 mt-5">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeIndex
                                    ? 'bg-[#173C82] dark:bg-blue-400 w-5'
                                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
