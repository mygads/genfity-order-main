import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import OnlineOrderingSection from '@/components/landing/OnlineOrderingSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import ReferralSection from '@/components/landing/ReferralSection';
import FooterSection from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 selection:bg-brand-500 selection:text-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsSection />
        <OnlineOrderingSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ReferralSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
        <FAQSection />
      </main>
      <FooterSection />
    </div>
  );
}
