'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, EyeCloseIcon } from '@/icons';
import { saveAdminAuth } from '@/lib/utils/adminAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import type { MerchantInfo } from '@/lib/types/auth';

// Carousel data with translation keys
const carouselSlides: Array<{
  image: string;
  titleKey: TranslationKeys;
  descriptionKey: TranslationKeys;
}> = [
    {
      image: '/images/carousel/il-talent-1.png',
      titleKey: 'admin.login.carousel.title1',
      descriptionKey: 'admin.login.carousel.desc1',
    },
    {
      image: '/images/carousel/il-talent-2.png',
      titleKey: 'admin.login.carousel.title2',
      descriptionKey: 'admin.login.carousel.desc2',
    },
    {
      image: '/images/carousel/il-talent-3.png',
      titleKey: 'admin.login.carousel.title3',
      descriptionKey: 'admin.login.carousel.desc3',
    },
  ];

/**
 * Merchant Selection Modal
 * Shown when user has access to multiple merchants
 */
function MerchantSelectionModal({
  merchants,
  onSelect,
  isLoading,
}: {
  merchants: MerchantInfo[];
  onSelect: (merchantId: string) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
            <svg className="h-8 w-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('admin.login.selectMerchant.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('admin.login.selectMerchant.description')}
          </p>
        </div>

        {/* Merchant List */}
        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {merchants.map((merchant) => (
            <button
              key={merchant.merchantId}
              onClick={() => onSelect(merchant.merchantId)}
              disabled={isLoading}
              className={`w-full rounded-lg border-2 p-4 text-left transition-all hover:border-brand-500 hover:bg-brand-50 ${isLoading ? 'cursor-not-allowed opacity-50' : ''
                } ${merchant.isOpen ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {merchant.merchantLogo ? (
                    <Image
                      src={merchant.merchantLogo}
                      alt={merchant.merchantName}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-lg font-bold text-brand-600">
                      {merchant.merchantName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {merchant.merchantName}
                    </h3>
                    {/* Status Badge */}
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${merchant.isOpen
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${merchant.isOpen ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                      {merchant.isOpen ? t('admin.login.selectMerchant.open') : t('admin.login.selectMerchant.closed')}
                    </span>
                  </div>

                  {/* Location */}
                  {(merchant.address || merchant.city) && (
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {[merchant.address, merchant.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Role Badge */}
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${merchant.role === 'OWNER'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {merchant.role === 'OWNER' ? t('admin.staff.owner') : t('admin.staff.staffRole')}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
            {t('admin.login.selectMerchant.loading')}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Admin Login Form Component
 * Styled to match POSLite ESB design
 */
function AdminLoginForm() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Merchant selection state
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [merchants, setMerchants] = useState<MerchantInfo[]>([]);
  const [loginData, setLoginData] = useState<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      profilePictureUrl?: string;
    };
    expiresIn: number;
  } | null>(null);

  // Get redirect path and error from query params
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';
  const errorParam = searchParams.get('error');

  // Error messages with translation
  const errorMessages: Record<string, string> = {
    expired: t('admin.login.error.sessionExpired'),
    forbidden: t('admin.login.error.accessDenied'),
    unauthorized: t('admin.login.error.mustLogin'),
  };

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user types
    if (error) setError('');
  };

  /**
   * Complete login process with selected merchant
   */
  const completeLogin = (
    data: typeof loginData,
    selectedMerchantId?: string,
    permissions?: string[],
    merchantRole?: string
  ) => {
    if (!data) return;

    // Calculate token expiration
    const expiresIn = data.expiresIn || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save auth to localStorage and cookies
    saveAdminAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id.toString(),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF',
        merchantId: selectedMerchantId,
      },
      expiresAt,
      permissions,
      merchantRole,
      merchants: merchants.length > 0 ? merchants : undefined,
    });

    // Save profile picture URL separately
    if (data.user.profilePictureUrl) {
      localStorage.setItem('profilePictureUrl', data.user.profilePictureUrl);
    }

    // Redirect
    window.location.href = redirectPath;
  };

  /**
   * Handle merchant selection
   */
  const handleMerchantSelect = async (merchantId: string) => {
    if (!loginData) return;

    setIsLoading(true);

    try {
      // Switch to selected merchant
      const response = await fetch('/api/auth/switch-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.accessToken}`,
        },
        body: JSON.stringify({ merchantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to switch merchant');
        setIsLoading(false);
        return;
      }

      // Complete login with new tokens
      completeLogin(
        {
          ...loginData,
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        },
        merchantId,
        data.data.permissions,
        data.data.merchantRole
      );
    } catch {
      setError(t('admin.login.error.networkError'));
      setIsLoading(false);
    }
  };

  /**
   * Handle login form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Input validation - use early return pattern
    if (!formData.email || !formData.password) {
      setError(t('admin.login.error.emailPasswordRequired'));
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t('auth.error.invalidEmail'));
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(t('admin.login.error.passwordMin8'));
      setIsLoading(false);
      return;
    }

    try {
      // Call admin login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          rememberMe: true,
        }),
      });

      const data = await response.json();

      // Handle API errors without throwing
      if (!response.ok) {
        setError(data.message || t('auth.error.invalidCredentials'));
        setIsLoading(false);
        return;
      }

      // Validate user role (must be admin/merchant)
      const allowedRoles = ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'];
      if (!allowedRoles.includes(data.data.user.role)) {
        setError(t('admin.login.error.adminOnly'));
        setIsLoading(false);
        return;
      }

      // Check if user needs to select merchant
      if (data.data.needsMerchantSelection && data.data.merchants && data.data.merchants.length > 1) {
        // Store login data and show merchant selection modal
        setLoginData({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
          expiresIn: data.data.expiresIn || 3600,
        });
        setMerchants(data.data.merchants);
        setShowMerchantModal(true);
        setIsLoading(false);
        return;
      }

      // Single merchant or no merchant - proceed with login
      completeLogin(
        {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
          expiresIn: data.data.expiresIn || 3600,
        },
        data.data.user.merchantId,
        data.data.permissions,
        data.data.merchantRole
      );
    } catch {
      setError(t('admin.login.error.networkError'));
    } finally {
      if (!showMerchantModal) {
        setIsLoading(false);
      }
    }
  };

  // Check if form is valid for button state
  const isFormValid = formData.email && formData.password && formData.password.length >= 8;

  return (
    <>
      {/* Merchant Selection Modal */}
      {showMerchantModal && (
        <MerchantSelectionModal
          merchants={merchants}
          onSelect={handleMerchantSelect}
          isLoading={isLoading}
        />
      )}

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
                        currentSlide === index ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
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
                          ? 'w-6 h-2 bg-orange-400' 
                          : 'w-2 h-2 bg-white/30 hover:bg-white/50'
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
                  <span>{t('admin.login.secureLogin')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
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
                    {t('admin.login.welcomeBack')}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t('admin.login.signInPrompt')}
                  </p>
                </div>

                {/* Error Alert */}
                {(error || errorParam) && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('admin.login.error.loginFailed')}</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                        {error || (errorParam ? errorMessages[errorParam] || 'An error occurred. Please try again.' : '')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.email')}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t('admin.login.placeholder.email')}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    />
                  </div>

                  {/* Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('admin.login.placeholder.password')}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeIcon className="w-5 h-5 fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="w-5 h-5 fill-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <Link
                      href="/admin/forgot-password"
                      className="text-sm font-medium text-[#173C82] hover:text-[#122c60] dark:text-blue-400"
                    >
                      {t('auth.forgotPassword')}?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isLoading || !isFormValid
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-[#F07600] hover:bg-[#D96A00] text-white shadow-lg shadow-orange-200 dark:shadow-none'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.signIn')
                    )}
                  </button>
                </form>

                {/* Register Link */}
                <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                  {t('auth.dontHaveAccount')}{' '}
                  <Link href="/merchant/register" className="text-[#173C82] hover:text-[#122c60] dark:text-blue-400 font-semibold">
                    {t('admin.login.registerNow')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Admin Login Page
 */
/**
 * Admin Login Page Skeleton
 * Shows while the main form is loading
 */
function AdminLoginSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#173C82]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Panel Skeleton */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-[#173C82] to-[#0f2a5c] rounded-l-2xl p-10 relative overflow-hidden">
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse" />
            <div className="flex-1 flex flex-col justify-center py-8 space-y-6">
              <div className="w-full h-[220px] bg-white/10 rounded-2xl animate-pulse" />
              <div className="space-y-3">
                <div className="h-6 w-3/4 mx-auto bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-2/3 mx-auto bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* Right Form Skeleton */}
          <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Mobile Logo Skeleton */}
              <div className="flex justify-center mb-6 lg:hidden">
                <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              {/* Header Skeleton */}
              <div className="text-center mb-8 space-y-3">
                <div className="h-7 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              {/* Form Fields Skeleton */}
              <div className="space-y-5">
                <div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
                <div className="flex justify-end">
                  <div className="h-4 w-28 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
              {/* Register Link Skeleton */}
              <div className="mt-8 flex justify-center">
                <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginSkeleton />}>
      <AdminLoginForm />
    </Suspense>
  );
}
