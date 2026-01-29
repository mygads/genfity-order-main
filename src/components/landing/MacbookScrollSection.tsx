'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

export default function MacbookScrollSection() {
  const { t } = useTranslation();

  return (
    <section className={cn(LANDING_SECTION, 'border-b border-gray-100')}>
      <div className={LANDING_CONTAINER}>
        <div className="mx-auto max-w-3xl text-center space-y-3 mb-12">
          <h2 className={LANDING_H2}>{t('landing.macbook.title')}</h2>
          <p className={LANDING_P}>{t('landing.macbook.subtitle')}</p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="relative mx-auto [transform-style:preserve-3d]">
            {/* Top (screen) */}
            <div className="relative mx-auto w-full rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-xl overflow-hidden">
              <div className="h-8 border-b border-gray-200 bg-white/70 flex items-center px-3 gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <div className="ml-3 h-3 w-1/3 rounded bg-gray-100" />
              </div>

              <div className="relative aspect-[16/10] bg-white overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto overscroll-contain">
                  <div className="w-full">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="w-full">
                        <Image
                          src="/images/landing/dashboard_mockup.png"
                          alt={t('landing.macbook.title')}
                          width={1600}
                          height={1000}
                          className="w-full h-auto object-cover"
                          sizes="(max-width: 1024px) 100vw, 1024px"
                          priority={false}
                        />
                        {idx < 2 ? <div className="h-px bg-gray-200" /> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white" />
              </div>
            </div>

            {/* Bottom (keyboard base) */}
            <div className="mx-auto mt-3 h-6 w-[86%] rounded-b-2xl bg-gray-200/80 shadow-inner border border-gray-200" />
          </div>
        </div>
      </div>
    </section>
  );
}
