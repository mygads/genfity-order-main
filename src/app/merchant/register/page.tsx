"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeCloseIcon } from "@/icons";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { TranslationKeys } from "@/lib/i18n";
import { useGeolocation } from "@/hooks/useGeolocation";

interface FormData {
    merchantName: string;
    merchantCode: string;
    address: string;
    phone: string;
    currency: "IDR" | "AUD" | "USD" | "SGD" | "MYR";
    country: string;
    timezone: string;
    latitude: number | null;
    longitude: number | null;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    password: string;
    confirmPassword: string;
    referralCode: string;
    influencerCode: string;
}

// Supported countries and their configurations
const COUNTRY_OPTIONS = [
    { code: "ID", name: "Indonesia", currency: "IDR" as const, timezone: "Asia/Jakarta" },
    { code: "AU", name: "Australia", currency: "AUD" as const, timezone: "Australia/Sydney" },
    { code: "SG", name: "Singapore", currency: "SGD" as const, timezone: "Asia/Singapore" },
    { code: "MY", name: "Malaysia", currency: "MYR" as const, timezone: "Asia/Kuala_Lumpur" },
    { code: "US", name: "United States", currency: "USD" as const, timezone: "America/New_York" },
];

// Country bounding boxes for location validation (approximate)
// Format: { minLat, maxLat, minLng, maxLng }
const COUNTRY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    "Indonesia": { minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 },
    "Australia": { minLat: -44, maxLat: -10, minLng: 113, maxLng: 154 },
    "Singapore": { minLat: 1.15, maxLat: 1.47, minLng: 103.6, maxLng: 104.1 },
    "Malaysia": { minLat: 0.8, maxLat: 7.5, minLng: 99.5, maxLng: 119.5 },
    "United States": { minLat: 24, maxLat: 50, minLng: -125, maxLng: -66 },
};

/**
 * Detect which country the coordinates belong to
 */
function detectCountryFromCoordinates(lat: number, lng: number): string | null {
    for (const [country, bounds] of Object.entries(COUNTRY_BOUNDS)) {
        if (
            lat >= bounds.minLat &&
            lat <= bounds.maxLat &&
            lng >= bounds.minLng &&
            lng <= bounds.maxLng
        ) {
            return country;
        }
    }
    return null;
}

// Timezone options grouped by region
const TIMEZONE_OPTIONS = [
    // Indonesia
    { value: "Asia/Jakarta", label: "Jakarta (WIB, UTC+7)", country: "ID" },
    { value: "Asia/Makassar", label: "Makassar (WITA, UTC+8)", country: "ID" },
    { value: "Asia/Jayapura", label: "Jayapura (WIT, UTC+9)", country: "ID" },
    // Australia
    { value: "Australia/Sydney", label: "Sydney (AEDT, UTC+11)", country: "AU" },
    { value: "Australia/Melbourne", label: "Melbourne (AEDT, UTC+11)", country: "AU" },
    { value: "Australia/Brisbane", label: "Brisbane (AEST, UTC+10)", country: "AU" },
    { value: "Australia/Perth", label: "Perth (AWST, UTC+8)", country: "AU" },
    { value: "Australia/Adelaide", label: "Adelaide (ACDT, UTC+10:30)", country: "AU" },
    // Singapore
    { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)", country: "SG" },
    // Malaysia
    { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT, UTC+8)", country: "MY" },
    // US
    { value: "America/New_York", label: "New York (EST, UTC-5)", country: "US" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST, UTC-8)", country: "US" },
    { value: "America/Chicago", label: "Chicago (CST, UTC-6)", country: "US" },
];

interface FormErrors {
    [key: string]: string;
}

// Carousel data with translation keys
const carouselSlides: Array<{
    image: string;
    titleKey: TranslationKeys;
    descriptionKey: TranslationKeys;
}> = [
        {
            image: "/images/carousel/il-talent-1.png",
            titleKey: "register.carousel.title1",
            descriptionKey: "register.carousel.desc1",
        },
        {
            image: "/images/carousel/il-talent-2.png",
            titleKey: "register.carousel.title2",
            descriptionKey: "register.carousel.desc2",
        },
        {
            image: "/images/carousel/il-talent-3.png",
            titleKey: "register.carousel.title3",
            descriptionKey: "register.carousel.desc3",
        },
    ];

export default function MerchantRegisterPage() {
    return (
        <Suspense fallback={<RegisterPageLoading />}>
            <MerchantRegisterContent />
        </Suspense>
    );
}

function RegisterPageLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-300 rounded-full mb-4" />
                <div className="w-32 h-4 bg-gray-300 rounded" />
            </div>
        </div>
    );
}

function MerchantRegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const geolocation = useGeolocation();
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [locationDetected, setLocationDetected] = useState(false);
    const [detectedCountryFromGPS, setDetectedCountryFromGPS] = useState<string | null>(null);
    
    // Get influencer referral code from URL parameter
    const influencerCodeFromUrl = searchParams.get('ref') || '';
    
    const [formData, setFormData] = useState<FormData>({
        merchantName: "",
        merchantCode: "",
        address: "",
        phone: "",
        currency: "IDR",
        country: "Indonesia",
        timezone: "Asia/Jakarta",
        latitude: null,
        longitude: null,
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        password: "",
        confirmPassword: "",
        referralCode: "",
        influencerCode: influencerCodeFromUrl,
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    // Check if there's a location mismatch (GPS shows different country than selected)
    const locationMismatch = detectedCountryFromGPS && 
        formData.latitude !== null && 
        formData.longitude !== null && 
        detectedCountryFromGPS !== formData.country;

    // Auto-rotate carousel every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Sync influencer code from URL parameter
    useEffect(() => {
        if (influencerCodeFromUrl && influencerCodeFromUrl !== formData.influencerCode) {
            setFormData(prev => ({
                ...prev,
                influencerCode: influencerCodeFromUrl,
            }));
        }
    }, [influencerCodeFromUrl, formData.influencerCode]);

    // Auto-detect location from timezone on mount (no permission needed)
    useEffect(() => {
        const initialLocation = geolocation.detectFromTimezone();
        if (initialLocation.country && initialLocation.currency && initialLocation.timezone) {
            setFormData(prev => ({
                ...prev,
                country: initialLocation.country || prev.country,
                currency: initialLocation.currency || prev.currency,
                timezone: initialLocation.timezone || prev.timezone,
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle GPS location detection button click
    const handleDetectLocation = useCallback(async () => {
        const locationData = await geolocation.detectLocation();
        if (locationData) {
            // Store the country detected from GPS coordinates
            const gpsCountry = detectCountryFromCoordinates(locationData.latitude, locationData.longitude);
            setDetectedCountryFromGPS(gpsCountry || locationData.country);
            
            setFormData(prev => ({
                ...prev,
                country: locationData.country,
                currency: locationData.currency,
                timezone: locationData.timezone,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
            }));
            setLocationDetected(true);
        }
    }, [geolocation]);

    // Handle country change - auto-update currency and timezone
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const countryName = e.target.value;
        const countryConfig = COUNTRY_OPTIONS.find(c => c.name === countryName);
        if (countryConfig) {
            setFormData(prev => ({
                ...prev,
                country: countryName,
                currency: countryConfig.currency,
                timezone: countryConfig.timezone,
            }));
        } else {
            setFormData(prev => ({ ...prev, country: countryName }));
        }
        setLocationDetected(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
        // If manually changing location fields, clear auto-detected flag
        if (['country', 'currency', 'timezone'].includes(name)) {
            setLocationDetected(false);
        }
    };

    // Auto-generate slug from merchant name
    const handleMerchantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            merchantName: name,
            merchantCode: prev.merchantCode || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20),
        }));
        if (formErrors.merchantName) {
            setFormErrors(prev => ({ ...prev, merchantName: "" }));
        }
    };

    const validateStep1 = (): boolean => {
        const errors: FormErrors = {};
        if (!formData.merchantName || formData.merchantName.length < 2) {
            errors.merchantName = t("validation.merchantNameMin");
        }
        if (!formData.merchantCode || formData.merchantCode.length < 3) {
            errors.merchantCode = t("validation.merchantCodeMin");
        } else if (!/^[a-zA-Z0-9-]+$/.test(formData.merchantCode)) {
            errors.merchantCode = t("validation.merchantCodeFormat");
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errors: FormErrors = {};
        if (!formData.ownerName || formData.ownerName.length < 2) {
            errors.ownerName = t("validation.ownerNameMin");
        }
        if (!formData.ownerEmail || !/\S+@\S+\.\S+/.test(formData.ownerEmail)) {
            errors.ownerEmail = t("validation.emailInvalid");
        }
        if (!formData.password || formData.password.length < 8) {
            errors.password = t("validation.passwordMin");
        }
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = t("validation.passwordMismatch");
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep2()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/public/merchant/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed");
            }

            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/admin/login?registered=true");
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{
                    background: "linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)",
                }}
            >
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("register.success")} 🎉</h1>
                    <p className="text-gray-600 mb-4">
                        {t("register.successMessage")}
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                        {t("register.redirecting")}
                    </p>
                    <Link
                        href="/admin/login"
                        className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                        {t("register.loginNow")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Background Pattern */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#173C82]/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
                <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">

                    {/* Left Side - Info Panel (Hidden on mobile) */}
                    <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-[#173C82] to-[#0f2a5c] rounded-l-2xl p-10 text-white relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        
                        {/* Logo */}
                        <div className="relative z-10">
                            <Link href="/" className="inline-block">
                                <Image
                                    src="/images/logo/logo-dark-mode.png"
                                    alt="GENFITY"
                                    width={160}
                                    height={45}
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Carousel Content */}
                        <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
                            {/* Carousel Image */}
                            <div className="relative w-full h-[220px] mb-8">
                                {carouselSlides.map((slide, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 transition-all duration-700 flex items-center justify-center ${
                                            currentSlide === index ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                        }`}
                                    >
                                        <Image
                                            src={slide.image}
                                            alt={t(slide.titleKey)}
                                            width={320}
                                            height={220}
                                            className="object-contain drop-shadow-2xl"
                                            priority={index === 0}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Carousel Text */}
                            <div className="text-center space-y-3">
                                <h2 className="text-xl font-bold transition-all duration-500">
                                    {t(carouselSlides[currentSlide].titleKey)}
                                </h2>
                                <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto transition-all duration-500">
                                    {t(carouselSlides[currentSlide].descriptionKey)}
                                </p>
                            </div>

                            {/* Carousel Dots */}
                            <div className="flex items-center justify-center gap-2 mt-6">
                                {carouselSlides.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`transition-all duration-300 rounded-full ${
                                            currentSlide === index 
                                                ? "w-6 h-2 bg-orange-400" 
                                                : "w-2 h-2 bg-white/30 hover:bg-white/50"
                                        }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="relative z-10 flex items-center justify-center gap-6 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-sm text-blue-100">
                                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Free 30-day trial</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-100">
                                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>No credit card</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Registration Form */}
                    <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
                        <div className="p-6 sm:p-8 lg:p-10">
                            {/* Mobile Logo */}
                            <div className="flex justify-center mb-6 lg:hidden">
                                <Link href="/">
                                    <Image
                                        src="/images/logo/logo.png"
                                        alt="GENFITY"
                                        width={150}
                                        height={42}
                                        className="dark:hidden"
                                        priority
                                    />
                                    <Image
                                        src="/images/logo/logo-dark-mode.png"
                                        alt="GENFITY"
                                        width={150}
                                        height={42}
                                        className="hidden dark:block"
                                        priority
                                    />
                                </Link>
                            </div>

                            {/* Header */}
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t("register.title")}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    {t("register.subtitle")}
                                </p>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center justify-center gap-3 mb-8">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    step === 1 
                                        ? "bg-[#173C82] text-white" 
                                        : "bg-[#173C82]/10 text-[#173C82]"
                                }`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                        step === 1 ? "bg-white/20" : "bg-[#173C82] text-white"
                                    }`}>
                                        {step > 1 ? "✓" : "1"}
                                    </span>
                                    {t("register.step1Label")}
                                </div>
                                <div className={`w-8 h-0.5 ${step >= 2 ? "bg-[#173C82]" : "bg-gray-200 dark:bg-gray-700"}`} />
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    step === 2 
                                        ? "bg-[#173C82] text-white" 
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                        step === 2 ? "bg-white/20" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                                    }`}>2</span>
                                    {t("register.step2Label")}
                                </div>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                {step === 1 && (
                                    <div className="space-y-5">

                                {/* Merchant Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.merchantName")} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="merchantName"
                                        value={formData.merchantName}
                                        onChange={handleMerchantNameChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.merchantName ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                        placeholder={t("register.merchantNamePlaceholder")}
                                    />
                                    {formErrors.merchantName && <p className="text-red-500 text-xs mt-1">{formErrors.merchantName}</p>}
                                </div>

                                {/* Merchant Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.merchantCode")} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center">
                                        <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-xs">
                                            /order/
                                        </span>
                                        <input
                                            type="text"
                                            name="merchantCode"
                                            value={formData.merchantCode}
                                            onChange={handleChange}
                                            className={`flex-1 px-4 py-2.5 rounded-r-lg border ${formErrors.merchantCode ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                            placeholder="warung-barokah"
                                        />
                                    </div>
                                    {formErrors.merchantCode && <p className="text-red-500 text-xs mt-1">{formErrors.merchantCode}</p>}
                                    <p className="text-gray-500 text-xs mt-1">{t("register.merchantCodeHint")}</p>
                                </div>

                                {/* Location Detection Section */}
                                <div className="space-y-4">
                                    {/* Country with Detect Button */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t("register.country")} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                name="country"
                                                value={formData.country}
                                                onChange={handleCountryChange}
                                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white"
                                            >
                                                {COUNTRY_OPTIONS.map(country => (
                                                    <option key={country.code} value={country.name}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleDetectLocation}
                                                disabled={geolocation.isDetecting}
                                                className="px-3 py-2.5 rounded-lg bg-[#173C82] hover:bg-[#122c60] text-white text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {geolocation.isDetecting ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                                <span className="hidden sm:inline">{geolocation.isDetecting ? t("register.detectingLocation") : t("register.detectLocation")}</span>
                                            </button>
                                        </div>
                                        
                                        {/* Status messages */}
                                        {geolocation.error && (
                                            <p className="text-amber-600 dark:text-amber-400 text-xs mt-1.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                {geolocation.error}
                                            </p>
                                        )}
                                        {locationDetected && !geolocation.error && !locationMismatch && (
                                            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {t("register.locationDetected")}
                                            </p>
                                        )}
                                        {locationMismatch && detectedCountryFromGPS && (
                                            <p className="text-amber-600 dark:text-amber-400 text-xs mt-1.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>{t("register.locationMismatchWarning").replace("{detectedCountry}", detectedCountryFromGPS).replace("{selectedCountry}", formData.country).replace("{selectedCurrency}", formData.currency)}</span>
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Currency & Timezone in 2 columns */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("register.currency")}</label>
                                            <select
                                                name="currency"
                                                value={formData.currency}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="IDR">IDR (Rupiah)</option>
                                                <option value="AUD">AUD (Dollar)</option>
                                                <option value="USD">USD (Dollar)</option>
                                                <option value="SGD">SGD (Dollar)</option>
                                                <option value="MYR">MYR (Ringgit)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("register.timezone")}</label>
                                            <select
                                                name="timezone"
                                                value={formData.timezone}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white"
                                            >
                                                {TIMEZONE_OPTIONS.map(tz => (
                                                    <option key={tz.value} value={tz.value}>
                                                        {tz.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Referral Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.referralCode")}
                                    </label>
                                    <input
                                        type="text"
                                        name="referralCode"
                                        value={formData.referralCode}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                        placeholder={t("register.referralCodePlaceholder")}
                                    />
                                    <p className="text-gray-500 text-xs mt-1">{t("register.referralCodeHint")}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    style={{
                                        width: "100%",
                                        height: "40px",
                                        borderRadius: "5px",
                                        fontFamily: "Inter, sans-serif",
                                        fontWeight: 700,
                                        fontSize: "14px",
                                        border: "none",
                                        cursor: "pointer",
                                        backgroundColor: "#F07600",
                                        color: "#FFFFFF",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#D96A00";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#F07600";
                                    }}
                                >
                                    {t("register.continue")}
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">{t("register.step2")}</p>

                                {/* Owner Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.ownerName")} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="ownerName"
                                        value={formData.ownerName}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.ownerName ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                        placeholder={t("register.ownerNamePlaceholder")}
                                    />
                                    {formErrors.ownerName && <p className="text-red-500 text-xs mt-1">{formErrors.ownerName}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.email")} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="ownerEmail"
                                        value={formData.ownerEmail}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.ownerEmail ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                        placeholder={t("register.emailPlaceholder")}
                                    />
                                    {formErrors.ownerEmail && <p className="text-red-500 text-xs mt-1">{formErrors.ownerEmail}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.password")} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${formErrors.password ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                            placeholder={t("register.passwordPlaceholder")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeIcon className="w-5 h-5 fill-gray-400" />
                                            ) : (
                                                <EyeCloseIcon className="w-5 h-5 fill-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("register.confirmPassword")} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${formErrors.confirmPassword ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`}
                                            placeholder={t("register.confirmPasswordPlaceholder")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeIcon className="w-5 h-5 fill-gray-400" />
                                            ) : (
                                                <EyeCloseIcon className="w-5 h-5 fill-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                                    >
                                        {t("common.back")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            flex: 1,
                                            padding: "10px 16px",
                                            borderRadius: "8px",
                                            fontFamily: "Inter, sans-serif",
                                            fontWeight: 700,
                                            fontSize: "14px",
                                            border: "none",
                                            cursor: isSubmitting ? "not-allowed" : "pointer",
                                            backgroundColor: isSubmitting ? "#FED7AA" : "#F07600",
                                            color: "#FFFFFF",
                                            transition: "background-color 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                {t("register.registering")}
                                            </>
                                        ) : (
                                            t("register.registerNow")
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Trial Badge */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200 dark:shadow-none">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-emerald-800 dark:text-emerald-300">{t("register.trialBadge")}</p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("register.fullAccess")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
                        {t("register.alreadyHaveAccount")}{" "}
                        <Link href="/admin/login" className="text-[#173C82] hover:text-[#122c60] dark:text-blue-400 font-semibold">
                            {t("register.loginHere")}
                        </Link>
                    </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
