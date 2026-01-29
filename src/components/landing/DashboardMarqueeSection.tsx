'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import BlurFade from '@/components/magicui/blur-fade';
import { ThreeDMarquee } from '@/components/ui/3d-marquee';
import { cn } from '@/lib/utils';
import { LANDING_CONTAINER, LANDING_H2, LANDING_P, LANDING_SECTION } from './landingStyles';

const defaultImages = [
  '/images/landing/dashboard_mockup.png',
  '/images/landing/desktop_mockup_macbook.png',
  '/images/landing/tablet_mockup_ipad.png',
  '/images/landing/mobile_mockup_iphone.png',
  '/images/landing/hero/hero-genfity.png',
  '/images/landing/hero/merchant-success.png',
  '/images/landing/features/analytics.png',
  '/images/landing/features/inventory.png',
  '/images/landing/features/kitchen.png',
  '/images/landing/features/multidevice.png',
  '/images/landing/features/payments.png',
  '/images/landing/features/qrcode.png',
];

export default function DashboardMarqueeSection() {
  const { t } = useTranslation();
  const images = Array.from({ length: 20 }, (_, idx) => defaultImages[idx % defaultImages.length]);

  return (
    <section className={cn(LANDING_SECTION, 'border-b border-gray-100')}>
      <div className={LANDING_CONTAINER}>
        <BlurFade delay={0.1} inView>
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <h2 className={LANDING_H2}>{t('landing.showcase.title')}</h2>
            <p className={LANDING_P}>{t('landing.showcase.subtitle')}</p>
          </div>
        </BlurFade>

        <div className="mt-10">
          <ThreeDMarquee images={images} />
        </div>
      </div>
    </section>
  );
}
