import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <LandingNavbar />
            <main className="flex-grow pt-32 px-4 max-w-3xl mx-auto w-full text-center">
                <h1 className="text-4xl font-bold mb-6">About Genfity</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Genfity is a leading F&B technology provider helping restaurants and cafes streamline their operations with modern, digital solutions.
                </p>
            </main>
            <FooterSection />
        </div>
    );
}
