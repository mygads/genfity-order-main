import MarketingNavbar from '@/components/landing/MarketingNavbar';
import MarketingFooter from '@/components/landing/MarketingFooter';
import LandingLightMode from '@/components/landing/LandingLightMode';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LandingLightMode>
      <div className="min-h-screen bg-white selection:bg-brand-500 selection:text-white flex flex-col">
        <MarketingNavbar />
        <main className="flex-grow pt-20">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </LandingLightMode>
  );
}
