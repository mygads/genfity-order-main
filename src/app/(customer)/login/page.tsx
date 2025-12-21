'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { saveCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

/**
 * Customer Login Form Component
 * Mobile-first redesign with consistent layout:
 * - Max width 420px (same as order page)
 * - English language
 * - Minimal and readable design
 * - Two paths: Login (email/password) or Guest checkout
 * - Ref parameter for navigation
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

      if (emailParam) setEmail(decodeURIComponent(emailParam));
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
   * Handle "Continue as Guest" - skip login
   */
  const handleGuestCheckout = () => {
    // Skip to cart/menu as guest
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchant && mode) {
      router.push(`/${merchant}/order?mode=${mode}`);
    } else if (merchant) {
      router.push(`/${merchant}`);
    } else {
      router.push('/');
    }
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

      // Call customer login API (or save-account API)
      const apiEndpoint = isSaveAccountMode
        ? '/api/customer/save-account'
        : '/api/public/auth/customer-login';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
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

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Image
              className="dark:hidden"
              src="/images/logo/icon.png"
              alt="Genfity"
              width={32}
              height={32}
              priority
            />
            <Image
              className="hidden dark:block"
              src="/images/logo/icon-dark-mode.png"
              alt="Genfity"
              width={32}
              height={32}
              priority
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white">GENFITY</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {showAuthChoice ? 'Welcome' : 'Sign In'}
            </h1>
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
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Input with Icon - Only show in save-account mode */}
                {isSaveAccountMode && (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Full Name"
                    />
                  </div>
                )}

                {/* Email Input with Icon */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Email"
                  />
                </div>

                {/* Phone Input with Icon - Only show in save-account mode */}
                {isSaveAccountMode && (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Phone Number (optional)"
                    />
                  </div>
                )}

                {/* Password Input with Icon */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder={isSaveAccountMode ? "Create Password (min. 6 characters)" : "Password"}
                  />
                </div>

                {/* Forgot Password Link - Only show in login mode */}
                {!isSaveAccountMode && (
                  <div className="text-right">
                    <a href="#" className="text-xs text-orange-500 hover:underline">
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (isSaveAccountMode ? 'Saving...' : 'Signing in...') : (isSaveAccountMode ? 'Save Account' : 'Continue')}
                </button>
              </form>

              {/* Back Button */}
              <button
                onClick={() => {
                  setShowAuthChoice(true);
                  setError('');
                }}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back
              </button>

              {/* Sign Up Info */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                Don&apos;t have an account? You can create one during checkout
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-gray-200 dark:border-gray-700">
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
    </>
  );
}

/**
 * Customer Login Page
 * - Conditional rendering: Auth choice dialog first
 * - Two paths: Login or Guest checkout
 * - Passwordless auto-register on new email
 * - Ref parameter for navigation
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
      <LoginForm />
    </Suspense>
  );
}
