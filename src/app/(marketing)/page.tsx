import HeroSection from '@/components/landing/HeroSection';
import LandingBodyBackground from '@/components/landing/LandingBodyBackground';
import TrustedBySection from '@/components/landing/TrustedBySection';
import StatsSection from '@/components/landing/StatsSection';
import OnlineOrderingSection from '@/components/landing/OnlineOrderingSection';
import FeatureHighlightSection from '@/components/landing/FeatureHighlightSection';
import BusinessTypeSection from '@/components/landing/BusinessTypeSection';
import BentoGridSection from '@/components/landing/BentoGridSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import ReferralSection from '@/components/landing/ReferralSection';
import DashboardMarqueeSection from '@/components/landing/DashboardMarqueeSection';
import MacbookScrollSection from '@/components/landing/MacbookScrollSection';

export default function MarketingHomePage() {
  return (
    <>
      <div className="relative">
        <LandingBodyBackground />
        <div className="relative z-10">
          <HeroSection />
          <TrustedBySection />
          <StatsSection />
          <DashboardMarqueeSection />
          <MacbookScrollSection />
          <FeatureHighlightSection />
          <OnlineOrderingSection />
          <BusinessTypeSection />
          <BentoGridSection />
          <FeaturesSection />
          <HowItWorksSection />
          <PricingSection />
          <ReferralSection />
          <TestimonialsSection />
          <FAQSection />
          <CTASection />
        </div>
      </div>
    </>
  );
}
