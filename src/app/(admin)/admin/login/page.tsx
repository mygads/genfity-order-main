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

      <div className="min-h-screen flex items-center justify-center p-4 md:p-10 lg:p-20" style={{
        background: 'linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)',
      }}>
        <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

          {/* Left Side - Carousel (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-[500px]">
            {/* Carousel Image */}
            <div className="relative w-full h-[300px] mb-6">
              {carouselSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${currentSlide === index ? 'opacity-100' : 'opacity-0'
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
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  lineHeight: '36px',
                  color: '#373A49',
                }}
              >
                {t(carouselSlides[currentSlide].titleKey)}
              </h2>
              <p
                className="transition-all duration-500"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '22.4px',
                  color: '#373A49',
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
                    width: currentSlide === index ? '16px' : '8px',
                    height: '8px',
                    borderRadius: '8px',
                    backgroundColor: currentSlide === index ? '#0E65A9' : '#D9D9D9',
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div
            className="w-full max-w-[450px]"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '4px 4px 9px 0px rgba(135, 159, 190, 0.15)',
              padding: '40px 30px',
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-8">
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

            {/* Welcome Text */}
            <div className="text-center mb-6">
              <h1
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '24px',
                  color: '#373A49',
                  marginBottom: '8px',
                }}
              >
                {t('admin.login.welcomeBack')}
              </h1>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  color: '#6B7280',
                }}
              >
                {t('admin.login.signInPrompt')}
              </p>
            </div>

            {/* Error Alert */}
            {(error || errorParam) && (
              <div
                className="mb-6 p-4 rounded-lg flex items-start gap-3"
                style={{ backgroundColor: '#FEF2F2' }}
              >
                <span className="text-red-500 text-lg">⚠</span>
                <div>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: '#DC2626',
                      marginBottom: '2px',
                    }}
                  >
                    {t('admin.login.error.loginFailed')}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontSize: '13px',
                      color: '#DC2626',
                    }}
                  >
                    {error || (errorParam ? errorMessages[errorParam] || 'An error occurred. Please try again.' : '')}
                  </p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      display: 'block',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: 'rgba(0, 0, 0, 0.85)',
                      marginBottom: '8px',
                    }}
                  >
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
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '0.6px solid #D9D9D9',
                      borderRadius: '5px',
                      padding: '4px 11px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1286E1';
                      e.target.style.boxShadow = '0 0 0 2px rgba(18, 134, 225, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D9D9D9';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="password"
                    style={{
                      display: 'block',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: 'rgba(0, 0, 0, 0.85)',
                      marginBottom: '8px',
                    }}
                  >
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
                      style={{
                        width: '100%',
                        height: '40px',
                        border: '0.6px solid #D9D9D9',
                        borderRadius: '5px',
                        padding: '4px 40px 4px 11px',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1286E1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(18, 134, 225, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D9D9D9';
                        e.target.style.boxShadow = 'none';
                      }}
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
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#1286E1',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {t('auth.forgotPassword')}?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '5px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
                    backgroundColor: isLoading || !isFormValid ? '#E3E6E8' : '#F07600',
                    color: isLoading || !isFormValid ? '#74838E' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && isFormValid) {
                      e.currentTarget.style.backgroundColor = '#D96A00';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading && isFormValid) {
                      e.currentTarget.style.backgroundColor = '#F07600';
                    }
                  }}
                >
                  {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                </button>
              </div>
            </form>

            {/* Register Link */}
            <div className="text-center mt-6">
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '13px',
                  color: '#6B7280',
                }}
              >
                {t('auth.dontHaveAccount')}{' '}
              </span>
              <Link
                href="/merchant/register"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#F07600',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {t('admin.login.registerNow')}
              </Link>
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
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)' }}
        >
          <div className="text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <p style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
