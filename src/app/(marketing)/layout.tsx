import CekatLightNavbar from '@/components/landing/CekatLightNavbar';
import MarketingFooter from '@/components/landing/MarketingFooter';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-[#1A66D9] selection:text-white flex flex-col">
      <CekatLightNavbar />
      <main className="grow">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

