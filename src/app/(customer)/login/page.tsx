'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { saveCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

/**
 * Customer Login Page - Burjo ESB Style
 * 
 * Features:
 * - Auth choice: Sign In or Guest
 * - Guest returns to previous page (ref)
 * - Sign In with email/phone + password
 * - Forgot password link
 * - Consistent header styling
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaveAccountMode, setIsSaveAccountMode] = useState(false);

  const merchant = searchParams.get('merchant');
  const mode = searchParams.get('mode');
  const ref = searchParams.get('ref');

  // Check if in save-account mode and pre-fill form
  useEffect(() => {
    const saveAccountMode = mode === 'save-account';
    setIsSaveAccountMode(saveAccountMode);

    if (saveAccountMode) {
      setShowAuthChoice(false);
      const emailParam = searchParams.get('email');
      const nameParam = searchParams.get('name');
      const phoneParam = searchParams.get('phone');

      if (emailParam) setEmailOrPhone(decodeURIComponent(emailParam));
      if (nameParam) setName(decodeURIComponent(nameParam));
      if (phoneParam) setPhone(decodeURIComponent(phoneParam));
    }
  }, [mode, searchParams]);

  /**
   * Handle "Yes, Sign In" - show email/password form
   */
  const handleYesLogin = () => {
    setShowAuthChoice(false);
  };

  /**
   * Handle "Continue as Guest" - go back to previous page
   */
  const handleGuestCheckout = () => {
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchant && mode) {
      router.push(`/${merchant}/order?mode=${mode}`);
    } else if (merchant) {
      router.push(`/${merchant}`);
    } else {
      // Check if we have browser history to go back
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    }
  };

  /**
   * Handle forgot password navigation
   */
  const handleForgotPassword = () => {
    const currentRef = ref || (merchant ? `/${merchant}/order?mode=${mode || 'dinein'}` : '/');
    router.push(`/forgot-password?ref=${encodeURIComponent(currentRef)}`);
  };

  /**
   * Check if input is email or phone
   */
  const isEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const isPhoneNumber = (value: string): boolean => {
    // Check for phone number patterns: starts with + or 0, contains only digits
    const cleaned = value.replace(/[\s-]/g, '');
    return /^(\+|0)\d{8,15}$/.test(cleaned);
  };

  /**
   * Handle login form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate name field (only required in save-account mode)
      if (isSaveAccountMode && !name.trim()) {
        setError('Full name is required');
        setIsLoading(false);
        return;
      }

      const inputValue = emailOrPhone.trim();

      // Validate email or phone
      if (!inputValue) {
        setError('Email or phone number is required');
        setIsLoading(false);
        return;
      }

      const isEmailInput = isEmail(inputValue);
      const isPhoneInput = isPhoneNumber(inputValue);

      if (!isEmailInput && !isPhoneInput) {
        setError('Please enter a valid email or phone number');
        setIsLoading(false);
        return;
      }

      // Call customer login API
      const apiEndpoint = isSaveAccountMode
        ? '/api/customer/save-account'
        : '/api/public/auth/customer-login';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send as email or phone based on input type
          ...(isEmailInput ? { email: inputValue } : { phone: inputValue }),
          password: password.trim(),
          ...(isSaveAccountMode && {
            name: name.trim(),
            phone: phone.trim() || undefined,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save auth to localStorage
      saveCustomerAuth({
        accessToken: data.data.accessToken,
        user: data.data.user,
        expiresAt: data.data.expiresAt,
      });

      // Redirect to ref or merchant home
      if (ref) {
        router.push(decodeURIComponent(ref));
      } else if (merchant && mode) {
        router.push(`/${merchant}/order?mode=${mode}`);
      } else if (merchant) {
        router.push(`/${merchant}`);
      } else {
        router.push('/profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (showAuthChoice) {
      // If on auth choice, go back to previous page
      handleGuestCheckout();
    } else {
      // If on login form, go back to auth choice
      setShowAuthChoice(true);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
            {showAuthChoice ? 'Welcome' : 'Sign In'}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <Image
                className="dark:hidden"
                src="/images/logo/icon.png"
                alt="Genfity"
                width={40}
                height={40}
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/icon-dark-mode.png"
                alt="Genfity"
                width={40}
                height={40}
                priority
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">GENFITY</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {showAuthChoice
                ? 'Choose how to continue'
                : 'Access your order history and checkout faster'
              }
            </p>
          </div>

          {/* Conditional Rendering: Auth Choice or Login Form */}
          {showAuthChoice ? (
            /* Auth Choice Dialog */
            <div className="space-y-4">
              {/* Question */}
              <div className="text-center py-4">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  Already have an account?
                </p>
              </div>

              {/* Yes, Sign In Button */}
              <button
                onClick={handleYesLogin}
                className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98]"
              >
                Yes, Sign In
              </button>

              {/* Continue as Guest Button */}
              <button
                onClick={handleGuestCheckout}
                className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-base font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 active:scale-[0.98]"
              >
                Continue as Guest
              </button>

              {/* Info Text */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                Sign in to save your order history and speed up checkout
              </p>
            </div>
          ) : (
            /* Login Form */
            <div className="space-y-4">
              {/* Save Account Banner */}
              {isSaveAccountMode && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💾</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Save & Secure Your Account
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Update your information and set a password to secure your account
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Input - Only show in save-account mode */}
                {isSaveAccountMode && (
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="Your full name"
                    />
                  </div>
                )}

                {/* Email or Phone Input */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Email or Phone Number
                  </label>
                  <input
                    id="emailOrPhone"
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                    placeholder="your@email.com or +628xxx"
                  />
                </div>

                {/* Phone Input - Only show in save-account mode */}
                {isSaveAccountMode && (
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Phone Number (optional)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="+62xxx or +61xxx"
                    />
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-12 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder={isSaveAccountMode ? 'Create password (min. 6 chars)' : 'Your password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link - Only show in login mode */}
                {!isSaveAccountMode && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-orange-500 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isSaveAccountMode ? 'Saving...' : 'Signing in...'}
                    </span>
                  ) : (
                    isSaveAccountMode ? 'Save Account' : 'Sign In'
                  )}
                </button>
              </form>

              {/* Sign Up Info */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                Don&apos;t have an account? You can create one during checkout
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{' '}
          <Link href="#" className="text-orange-500 hover:underline">
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-orange-500 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </footer>

      {/* Powered By Footer */}
      <div className="py-3 text-center text-xs text-gray-400">
        Powered By <span className="font-semibold">GENFITY</span>
      </div>
    </div>
  );
}

/**
 * Customer Login Page with Suspense wrapper
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
      <LoginForm />
    </Suspense>
  );
}
