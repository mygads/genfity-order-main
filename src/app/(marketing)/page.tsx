import CekatLightHeroSection from '@/components/landing/CekatLightHeroSection';
import CekatInnovasiSection from '@/components/landing/CekatInnovasiSection';
import CekatTrustedBySection from '@/components/landing/CekatTrustedBySection';
import CekatComparisonSection from '@/components/landing/CekatComparisonSection';
import CekatAIAgentSection from '@/components/landing/CekatAIAgentSection';
import CekatDashboardSection from '@/components/landing/CekatDashboardSection';
import CekatSuperHubSection from '@/components/landing/CekatSuperHubSection';
import CekatPricingSection from '@/components/landing/CekatPricingSection';
import CekatEfisiensiSection from '@/components/landing/CekatEfisiensiSection';
import CekatAIChatSection from '@/components/landing/CekatAIChatSection';
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
      {/* Hero Section with Cekat.ai Light Theme inspired design */}
      <CekatLightHeroSection />

      {/* Innovasi & Trusted By are conceptually connected */}
      <CekatInnovasiSection />
      <CekatTrustedBySection />

      {/* Rest of the sections with light background */}
      <div className="bg-slate-50 text-slate-900">
        <CekatComparisonSection />
        <CekatAIAgentSection />
        <CekatDashboardSection />
        <CekatSuperHubSection />
        <CekatPricingSection />
        <CekatEfisiensiSection />
        <CekatAIChatSection />
        {/* <OnlineOrderingSection /> */}
        {/* <BusinessTypeSection /> */}
        {/* <ReferralSection /> */}
        {/* <FAQSection /> */}
        <CTASection />
      </div>
    </>
  );
}

