import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import FeatureHighlightSection from '@/components/landing/FeatureHighlightSection';
import BentoGridSection from '@/components/landing/BentoGridSection';
import PricingSection from '@/components/landing/PricingSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ReferralSection from '@/components/landing/ReferralSection';
import FooterSection from '@/components/landing/FooterSection';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GENFITY - Sistem Pemesanan Online Restoran & Cafe Terbaik',
  description: 'Solusi kasir dan pemesanan online tanpa download aplikasi. Terima pesanan QR, website, dan take away. Trial gratis 30 hari.',
  keywords: ['sistem kasir restoran', 'aplikasi kasir online', 'qr code ordering', 'self order menu', 'sistem pos cafe', 'website restoran gratis', 'menu digital'],
  openGraph: {
    title: 'GENFITY - Smart Online Ordering System',
    description: 'Transformasi bisnis F&B Anda dengan sistem pemesanan modern. Hemat biaya operasional dan tingkatkan penjualan.',
    type: 'website',
  }
};

export default function LandingPage() {
  return (
    <div className="font-sans antialiased text-gray-900 dark:text-white bg-white dark:bg-gray-900 overflow-x-hidden w-full">
      <LandingNavbar />

      <main className="w-full">
        <HeroSection />

        <div id="features">
          <FeatureHighlightSection />
          <BentoGridSection />
        </div>

        <div id="howItWorks">
          <HowItWorksSection />
        </div>

        <TestimonialsSection />

        <div id="pricing">
          <PricingSection />
        </div>

        <CTASection />
        <ReferralSection />
        <FAQSection />
      </main>

      <FooterSection />
    </div>
  );
}
