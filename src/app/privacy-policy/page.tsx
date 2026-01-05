import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';
import { FaEnvelope, FaPhone, FaBuilding, FaShieldAlt, FaUserLock, FaGlobe, FaFileAlt } from 'react-icons/fa';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <LandingNavbar />
            <main className="flex-grow pt-32 pb-16 px-4 max-w-4xl mx-auto w-full">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                        <FaShieldAlt className="w-8 h-8 text-orange-500" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                        Your privacy is important to us. Learn how we protect your data.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Last updated: January 1, 2026
                    </p>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <a href="#collection" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow">
                        <FaFileAlt className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-center">Data Collection</span>
                    </a>
                    <a href="#security" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow">
                        <FaUserLock className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-center">Data Security</span>
                    </a>
                    <a href="#rights" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow">
                        <FaShieldAlt className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-center">Your Rights</span>
                    </a>
                    <a href="#contact" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow">
                        <FaEnvelope className="w-6 h-6 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-center">Contact Us</span>
                    </a>
                </div>

                {/* Introduction */}
                <section className="mb-10">
                    <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            &quot;Genfity&quot; refers to PT Generation Infinity Indonesia (in Indonesia) and Genfity Digital Solutions (in Australia), along with their affiliates who are the owners, managers, and operators of Genfity Sites and Genfity Applications.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                            By using our services, you agree to the collection and use of information in accordance with this Privacy Policy.
                        </p>
                    </div>
                </section>

                {/* Data Collection */}
                <section id="collection" className="mb-10 scroll-mt-24">
                    <h2 className="text-2xl font-bold mb-4">Data Collection</h2>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            We collect information to provide better services to our users. The types of information we collect include:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Personal Information:</strong> Name, email address, phone number</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Order Information:</strong> Transaction history, delivery addresses</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Technical Data:</strong> Device information, browser type, IP address</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Usage Data:</strong> How you interact with our platform</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Data Security */}
                <section id="security" className="mb-10 scroll-mt-24">
                    <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            We implement industry-standard security measures to protect your data:
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <FaUserLock className="w-5 h-5 text-green-600" />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Encrypted data transmission (SSL/TLS)</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <FaShieldAlt className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Secure password hashing (bcrypt)</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                    <FaGlobe className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Regular security audits</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <FaFileAlt className="w-5 h-5 text-orange-600" />
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Access control & monitoring</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Your Rights */}
                <section id="rights" className="mb-10 scroll-mt-24">
                    <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            You have the following rights regarding your personal data:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">✓</span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Access:</strong> Request a copy of your personal data</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">✓</span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Correction:</strong> Update or correct inaccurate data</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">✓</span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Deletion:</strong> Request deletion of your data (with certain limitations)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">✓</span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Portability:</strong> Receive your data in a portable format</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">✓</span>
                                <span className="text-gray-600 dark:text-gray-300"><strong>Withdraw Consent:</strong> Opt out of marketing communications</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="mb-10 scroll-mt-24">
                    <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                                        <FaEnvelope className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                        <a href="mailto:genfity@gmail.com" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                                            genfity@gmail.com
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                                        <FaPhone className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone / WhatsApp</p>
                                        <a href="tel:+6285174314023" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                                            +62 851 7431 4023
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                                        <FaBuilding className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Our Offices</p>
                                        <div className="mt-1 space-y-2">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-200">🇮🇩 Indonesia</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Bandung, Jawa Barat</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-200">🇦🇺 Australia</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">157 Braidwood DR, Australind WA 6233</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                            We aim to respond to all inquiries within 2-3 business days.
                        </p>
                    </div>
                </section>
            </main>
            <FooterSection />
        </div>
    );
}
