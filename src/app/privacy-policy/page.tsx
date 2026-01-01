import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <LandingNavbar />
            <main className="flex-grow pt-32 px-4 max-w-3xl mx-auto w-full">
                <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Last updated: January 1, 2026
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                    This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
                </p>
            </main>
            <FooterSection />
        </div>
    );
}
