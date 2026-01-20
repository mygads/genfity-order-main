'use client';

import { Suspense } from 'react';
import { FaArrowLeft, FaEnvelope, FaPhone, FaBuilding } from "react-icons/fa";
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';

/**
 * Privacy Policy Page - Genfity
 * 
 * Full Privacy Policy in English
 */

function PrivacyPolicyContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const merchantCode = params.merchantCode as string;
    const mode = searchParams.get('mode') || 'dinein';
    const ref = searchParams.get('ref') || `/${merchantCode}/profile?mode=${mode}`;

    const handleBack = () => {
        if (ref) {
            router.push(decodeURIComponent(ref));
        } else {
            router.back();
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
                <div className="flex items-center px-4 py-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center -ml-2"
                        aria-label="Back"
                    >
                        <FaArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
                        Privacy Policy
                    </h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="max-w-none">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Our Privacy Policy
                    </h2>

                    <p className="text-sm text-gray-500 mb-6">
                        Effective as of December 2024
                    </p>

                    {/* Table of Contents */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Contents</h3>
                        <ol className="list-decimal list-inside text-sm text-orange-500 space-y-1">
                            <li><a href="#introduction" className="hover:underline">Introduction</a></li>
                            <li><a href="#collection" className="hover:underline">Collection and Storage of Personal Data</a></li>
                            <li><a href="#usage" className="hover:underline">Use and Management of Personal Data</a></li>
                            <li><a href="#security" className="hover:underline">Storage and Security of Personal Data</a></li>
                            <li><a href="#rights" className="hover:underline">Your Rights over Personal Data</a></li>
                            <li><a href="#changes" className="hover:underline">Changes and Updates to Privacy Policy</a></li>
                            <li><a href="#transfer" className="hover:underline">Cross-Border Transfer</a></li>
                            <li><a href="#disclosure" className="hover:underline">Consent for Limited Disclosure to Partners</a></li>
                            <li><a href="#acknowledgment" className="hover:underline">Acknowledgment of Data Processing</a></li>
                            <li><a href="#law" className="hover:underline">Governing Law and Severability</a></li>
                            <li><a href="#contact" className="hover:underline">Contact</a></li>
                        </ol>
                    </div>

                    {/* 1. Introduction */}
                    <section id="introduction" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            1. Introduction
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                In this Privacy Policy, the following terms are defined as: &quot;Genfity&quot; or &quot;We&quot; refers to PT Generation Infinity Indonesia (in Indonesia) and Genfity Digital Solutions (in Australia), along with their affiliates who are the owners, managers, and operators of Genfity Sites and Genfity Applications; &quot;Genfity Application&quot; or collectively &quot;Genfity Applications&quot; refers to applications owned, managed, and under the control of Genfity and related to Genfity Sites; &quot;Genfity Platform&quot; refers to platforms owned, managed, under the control of, or used by Genfity; and &quot;Genfity Service&quot; or collectively &quot;Genfity Services&quot; refers to services provided and managed by, and under the control of Genfity in Genfity Applications, Genfity Sites, or Genfity Platform.
                            </p>
                            <p>
                                &quot;Genfity Site&quot; or collectively &quot;Genfity Sites&quot; refers to related sites and microsites owned, managed, and under the control of Genfity; &quot;Personal Data&quot; is as described in Section 2; &quot;Privacy Policy&quot; refers to the terms and conditions on this page, as well as agreements, regarding Personal Data that apply to each and all Genfity Sites, Genfity Applications, Genfity Services, and Genfity Platform.
                            </p>
                            <p>
                                &quot;Merchant&quot; means an individual or business entity, including their authorized representatives, who have registered and/or entered into an agreement with Genfity to use Genfity Services in their business activities; &quot;User&quot; or &quot;You&quot; refers to any person, business entity, or authorized business representative who visits, accesses, and/or uses Genfity Application, Genfity Site, Genfity Service, or Genfity Platform, or who owns or registers an account in Genfity Application, Genfity Site, Genfity Service, or Genfity Platform as a Merchant, Merchant employee, End User, Genfity site/application visitor, or our business partner.
                            </p>
                            <p>
                                &quot;End User&quot; refers to an individual who uses or accesses Genfity Application, Genfity Site, Genfity Service, or Genfity Platform developed and/or operated by Genfity, or an individual who uses services from a Merchant and whose data is processed by Genfity in the provision of Genfity Services to that Merchant.
                            </p>
                            <p>
                                This Privacy Policy is created as a form of our compliance with laws and regulations related to the protection of data and personal information, as well as our genuine commitment to protecting every User&apos;s Personal Data.
                            </p>
                            <p>
                                We acknowledge the importance of the Personal Data entrusted to us, and it is our responsibility to collect, store, protect, process, analyze, and manage such Personal Data to the best of our ability, in accordance with applicable laws and regulations and in the interest of the Personal Data owner.
                            </p>
                            <p className="font-medium text-gray-800">
                                By visiting, accessing, and/or using any of Genfity Sites, Genfity Applications, Genfity Services, or Genfity Platform; or by visiting, registering, and/or creating an account in any of Genfity Sites, Genfity Applications, Genfity Services, or Genfity Platform, you acknowledge, declare, and agree that you are required to and have fully read and understood, accepted, agreed to, and are legally bound by each and all terms and conditions in this Privacy Policy.
                            </p>
                        </div>
                    </section>

                    {/* 2. Collection of Data */}
                    <section id="collection" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            2. Collection and Storage of Personal Data
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                We may obtain and collect your Personal Data when you register or use Genfity Services, including but not limited to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Full name</li>
                                <li>Email address</li>
                                <li>Phone/WhatsApp number</li>
                                <li>Location and address information</li>
                                <li>Order and transaction history</li>
                                <li>Device and browser information</li>
                                <li>Application/site usage data</li>
                            </ul>
                            <p>
                                We may also collect non-personal data such as cookies, access logs, and other technical information to improve service quality.
                            </p>
                        </div>
                    </section>

                    {/* 3. Use of Data */}
                    <section id="usage" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            3. Use and Management of Personal Data
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                We use your Personal Data to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Process and fulfill your orders</li>
                                <li>Send order confirmations and updates</li>
                                <li>Provide customer service</li>
                                <li>Improve services and user experience</li>
                                <li>Send promotional communications (with your consent)</li>
                                <li>Fulfill legal and regulatory obligations</li>
                                <li>Prevent fraud and illegal activities</li>
                            </ul>
                        </div>
                    </section>

                    {/* 4. Storage and Security */}
                    <section id="security" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            4. Storage and Security of Personal Data
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                We implement reasonable security measures to protect your Personal Data from unauthorized access, alteration, disclosure, or destruction. These measures include:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Data encryption during transmission and storage</li>
                                <li>Strict access control to systems and data</li>
                                <li>Regular security monitoring</li>
                                <li>Security training for employees</li>
                            </ul>
                            <p>
                                Your Personal Data will be stored for as long as necessary to fulfill the purposes for which it was collected or as required by applicable law.
                            </p>
                        </div>
                    </section>

                    {/* 5. Your Rights */}
                    <section id="rights" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            5. Your Rights over Personal Data
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                You have the following rights regarding your Personal Data:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>The right to access your Personal Data</li>
                                <li>The right to update or correct your Personal Data</li>
                                <li>The right to delete your Personal Data (with certain limitations)</li>
                                <li>The right to withdraw your consent</li>
                                <li>The right to object to the processing of Personal Data</li>
                            </ul>
                            <p>
                                To exercise these rights, please contact us using the contact information provided at the end of this Privacy Policy.
                            </p>
                        </div>
                    </section>

                    {/* 6. Policy Changes */}
                    <section id="changes" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            6. Changes and Updates to Privacy Policy
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                We may change this Privacy Policy from time to time. Changes will take effect upon publication on this page with an updated revision date. We will notify you of material changes via email or notification in the application.
                            </p>
                            <p>
                                Your continued use of Genfity Services after such changes indicates your agreement to the updated Privacy Policy.
                            </p>
                        </div>
                    </section>

                    {/* 7. Cross-Border Transfer */}
                    <section id="transfer" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            7. Cross-Border Transfer
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                In the event Genfity needs to transfer Personal Data to third parties or service providers outside the Republic of Indonesia or Australia, Genfity will ensure that such transfer is carried out in accordance with data protection standards that are equivalent to or higher than those required by applicable laws and regulations.
                            </p>
                        </div>
                    </section>

                    {/* 8. Consent for Disclosure */}
                    <section id="disclosure" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            8. Consent for Limited Disclosure to Partners
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                By using Genfity Services, you agree that we may disclose your Personal Data to Merchants and our business partners as necessary to process orders and provide services to you.
                            </p>
                        </div>
                    </section>

                    {/* 9. Acknowledgment */}
                    <section id="acknowledgment" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            9. Acknowledgment of Data Processing
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                You understand that this Privacy Policy applies prospectively from its effective date and does not apply retroactively to Personal Data processed before that date, unless permitted by applicable law. To the extent that your prior Personal Data processing was carried out based on a valid legal basis in accordance with the laws and regulations in effect at that time, such processing remains valid.
                            </p>
                        </div>
                    </section>

                    {/* 10. Governing Law */}
                    <section id="law" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            10. Governing Law and Severability
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                This Privacy Policy is governed by and interpreted in accordance with the laws of the Republic of Indonesia and Australia, as applicable to the respective entities. If any provision in this Policy is deemed invalid or unenforceable under applicable law, such provision does not affect the validity of other provisions that remain fully effective in accordance with applicable regulations.
                            </p>
                        </div>
                    </section>

                    {/* 11. Contact */}
                    <section id="contact" className="mb-8">
                        <h3 className="text-base font-bold text-gray-900 mb-3">
                            11. Contact
                        </h3>
                        <div className="text-sm text-gray-600 space-y-4">
                            <p>
                                If you wish to submit questions regarding the processing of your Data or other questions regarding this Policy, please contact us through:
                            </p>
                            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                                <div>
                                    <p className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <FaEnvelope className="text-orange-500" />
                                        Email
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        <a href="mailto:support@genfity.com" className="text-orange-500 hover:text-orange-600 font-medium">
                                            support@genfity.com
                                        </a>
                                        <a href="mailto:genfity@gmail.com" className="text-orange-500 hover:text-orange-600 font-medium">
                                            genfity@gmail.com
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <FaPhone className="text-orange-500" />
                                        Phone / WhatsApp
                                    </p>
                                    <a href="tel:+6285174314023" className="text-orange-500 hover:text-orange-600 font-medium">
                                        +62 851 7431 4023
                                    </a>
                                </div>
                                <div className="pt-3 border-t border-gray-200">
                                    <p className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <FaBuilding className="text-orange-500" />
                                        Our Offices
                                    </p>
                                    <div className="space-y-3">
                                        <div className="pl-1">
                                            <p className="font-medium text-gray-800">🇮🇩 Indonesia</p>
                                            <p className="text-gray-700 font-medium">PT Generation Infinity Indonesia</p>
                                            <p className="text-gray-600">Bandung, Jawa Barat, Indonesia</p>
                                        </div>
                                        <div className="pl-1">
                                            <p className="font-medium text-gray-800">🇦🇺 Australia</p>
                                            <p className="text-gray-700 font-medium">Genfity Digital Solutions</p>
                                            <p className="text-gray-600">157 Braidwood DR, Australind WA 6233, Australia</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4">
                                We aim to respond to all inquiries within 2-3 business days.
                            </p>
                        </div>
                    </section>

                </div>
            </div>

            {/* Powered By Footer */}
            <div className="py-4 border-t border-gray-200">
                <PoweredByFooter />
            </div>
        </div>
    );
}

/**
 * Privacy Policy Page with Suspense wrapper
 */
export default function PrivacyPolicyPage() {
    return (
        <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
            <PrivacyPolicyContent />
        </Suspense>
    );
}
