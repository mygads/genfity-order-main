"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeCloseIcon } from "@/icons";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { TranslationKeys } from "@/lib/i18n";

interface FormData {
    merchantName: string;
    merchantCode: string;
    address: string;
    phone: string;
    currency: "IDR" | "AUD";
    country: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    password: string;
    confirmPassword: string;
    referralCode: string;
}

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
    const router = useRouter();
    const { t } = useTranslation();
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        merchantName: "",
        merchantCode: "",
        address: "",
        phone: "",
        currency: "IDR",
        country: "Indonesia",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        password: "",
        confirmPassword: "",
        referralCode: "",
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    // Auto-rotate carousel every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
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
        <div
            className="min-h-screen flex items-center justify-center p-4 md:p-10 lg:p-20"
            style={{
                background: "linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)",
            }}
        >
            <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

                {/* Left Side - Carousel (Hidden on mobile) */}
                <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-[500px]">
                    {/* Carousel Image */}
                    <div className="relative w-full h-[300px] mb-6">
                        {carouselSlides.map((slide, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${currentSlide === index ? "opacity-100" : "opacity-0"
                                    }`}
                            >
                                <Image
                                    src={slide.image}
                                    alt={t(slide.titleKey)}
                                    width={400}
                                    height={300}
                                    className="object-contain"
                                    priority={index === 0}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Carousel Text */}
                    <div className="text-center mb-4">
                        <h2
                            className="mb-2 transition-all duration-500"
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                                fontSize: "18px",
                                lineHeight: "36px",
                                color: "#373A49",
                            }}
                        >
                            {t(carouselSlides[currentSlide].titleKey)}
                        </h2>
                        <p
                            className="transition-all duration-500"
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 400,
                                fontSize: "16px",
                                lineHeight: "22.4px",
                                color: "#373A49",
                            }}
                        >
                            {t(carouselSlides[currentSlide].descriptionKey)}
                        </p>
                    </div>

                    {/* Carousel Dots */}
                    <div className="flex items-center gap-2">
                        {carouselSlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className="transition-all duration-300"
                                style={{
                                    width: currentSlide === index ? "16px" : "8px",
                                    height: "8px",
                                    borderRadius: "8px",
                                    backgroundColor: currentSlide === index ? "#F07600" : "#D9D9D9",
                                }}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Side - Registration Card */}
                <div
                    className="w-full max-w-[450px]"
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        boxShadow: "4px 4px 9px 0px rgba(135, 159, 190, 0.15)",
                        padding: "40px 30px",
                    }}
                >
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <Link href="/">
                            <Image
                                src="/images/logo/logo.png"
                                alt="Genfity"
                                width={180}
                                height={50}
                                className="dark:hidden"
                                priority
                            />
                            <Image
                                src="/images/logo/logo-dark-mode.png"
                                alt="Genfity"
                                width={180}
                                height={50}
                                className="hidden dark:block"
                                priority
                            />
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                                fontSize: "24px",
                                color: "#373A49",
                                marginBottom: "8px",
                            }}
                        >
                            {t("register.title")}
                        </h1>
                        <p
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 400,
                                fontSize: "14px",
                                color: "#6B7280",
                            }}
                        >
                            {t("register.subtitle")}
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-6">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${step >= 1 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                            1
                        </div>
                        <div className={`w-16 h-1 mx-2 ${step >= 2 ? "bg-orange-500" : "bg-gray-200"}`} />
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${step >= 2 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                            2
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div
                            className="mb-4 p-3 rounded-lg flex items-start gap-3"
                            style={{ backgroundColor: "#FEF2F2" }}
                        >
                            <span className="text-red-500 text-lg">⚠</span>
                            <p
                                style={{
                                    fontFamily: "Inter, sans-serif",
                                    fontWeight: 400,
                                    fontSize: "13px",
                                    color: "#DC2626",
                                }}
                            >
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">{t("register.step1")}</p>

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

                                {/* Currency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("register.currency")}</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    >
                                        <option value="IDR">IDR (Rupiah)</option>
                                        <option value="AUD">AUD (Dollar Australia)</option>
                                    </select>
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
                    <div className="mt-6 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">{t("register.trialBadge")}</p>
                                <p className="text-xs text-amber-700">{t("register.fullAccess")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-gray-600 mt-4 text-sm">
                        {t("register.alreadyHaveAccount")}{" "}
                        <Link href="/admin/login" className="text-orange-500 hover:text-orange-600 font-medium">
                            {t("register.loginHere")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
