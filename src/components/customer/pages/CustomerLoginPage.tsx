'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { saveCustomerAuth } from '@/lib/utils/localStorage';
import { customerForgotPasswordUrl, customerProfileUrl } from '@/lib/utils/customerRoutes';
import { safeDecodeURIComponent } from '@/lib/utils/safeRef';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

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

  const guestBack = useCustomerBackTarget({
    merchantCode: merchant,
    mode,
    preferOrderWhenMerchant: true,
    blockedRefPatterns: ['/history', '/profile', '/view-order', '/order-summary'],
    includeLastMerchantFallback: false,
    useBrowserBackWhenNoTarget: true,
  });

  const afterLoginBack = useCustomerBackTarget({
    merchantCode: merchant,
    mode,
    preferOrderWhenMerchant: true,
    includeLastMerchantFallback: false,
    fallbackWhenNoMerchant: customerProfileUrl(),
  });

  // Check if in save-account mode and pre-fill form
  useEffect(() => {
    const saveAccountMode = mode === 'save-account';
    setIsSaveAccountMode(saveAccountMode);

    if (saveAccountMode) {
      setShowAuthChoice(false);
      const emailParam = searchParams.get('email');
      const nameParam = searchParams.get('name');
      const phoneParam = searchParams.get('phone');

      if (emailParam) setEmailOrPhone(safeDecodeURIComponent(emailParam) ?? emailParam);
      if (nameParam) setName(safeDecodeURIComponent(nameParam) ?? nameParam);
      if (phoneParam) setPhone(safeDecodeURIComponent(phoneParam) ?? phoneParam);
    }
  }, [mode, searchParams]);

  const handleYesLogin = () => {
    setShowAuthChoice(false);
  };

  const handleGuestCheckout = () => {
    guestBack.goBack();
  };

  const handleForgotPassword = () => {
    router.push(customerForgotPasswordUrl({ ref: guestBack.backHref }));
  };

  const isEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const isPhoneNumber = (value: string): boolean => {
    const cleaned = value.replace(/[\s-]/g, '');
    return /^(\+|0)\d{8,15}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSaveAccountMode && !name.trim()) {
        setError(t('auth.error.nameRequired'));
        setIsLoading(false);
        return;
      }

      const inputValue = emailOrPhone.trim();

      if (!inputValue) {
        setError(t('auth.error.emailRequired'));
        setIsLoading(false);
        return;
      }

      const isEmailInput = isEmail(inputValue);
      const isPhoneInput = isPhoneNumber(inputValue);

      if (!isEmailInput && !isPhoneInput) {
        setError(t('auth.error.invalidEmailOrPhone'));
        setIsLoading(false);
        return;
      }

      const apiEndpoint = isSaveAccountMode
        ? '/api/customer/save-account'
        : '/api/public/auth/customer-login';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

      saveCustomerAuth({
        accessToken: data.data.accessToken,
        customer: data.data.customer,
        expiresAt: data.data.expiresAt,
      });

      // After login, allow redirect to ref (including protected pages)
      afterLoginBack.pushBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (showAuthChoice) {
      handleGuestCheckout();
    } else {
      setShowAuthChoice(true);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
            {showAuthChoice ? t('auth.welcome') : t('auth.signIn')}
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <Image
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Genfity"
                width={200}
                height={100}
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark-mode.png"
                alt="Genfity"
                width={200}
                height={100}
                priority
              />
            </div>
          </div>

          {showAuthChoice ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('auth.alreadyHaveAccount')}
                </p>
              </div>

              <button
                onClick={handleYesLogin}
                className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98]"
              >
                {t('auth.yesSignIn')}
              </button>

              <button
                onClick={handleGuestCheckout}
                className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-base font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 active:scale-[0.98]"
              >
                {t('auth.continueAsGuest')}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                {t('auth.signInBenefits')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {isSaveAccountMode && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💾</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {t('auth.saveAccountTitle')}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('auth.saveAccountDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSaveAccountMode && (
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {t('auth.fullName')}
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder={t('auth.placeholder.name')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-900 dark:text-gray-400 mb-2">
                    {t('auth.emailOrPhone')}
                  </label>
                  <input
                    id="emailOrPhone"
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                    placeholder={t('auth.placeholder.emailOrPhone')}
                  />
                </div>

                {isSaveAccountMode && (
                  <div>
                    <label className="block text-sm text-gray-900 dark:text-gray-400 mb-2">
                      {t('auth.phoneOptional')}
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder={t('auth.placeholder.phone')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-12 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder={isSaveAccountMode ? t('auth.placeholder.passwordCreate') : t('auth.placeholder.password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="w-5 h-5" />
                      ) : (
                        <FaEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {!isSaveAccountMode && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-orange-500 hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isSaveAccountMode ? t('common.saving') : t('auth.signingIn')}
                    </span>
                  ) : (
                    isSaveAccountMode ? t('auth.saveAccount') : t('auth.signIn')
                  )}
                </button>
              </form>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                {t('auth.noAccountInfo')}
              </p>
            </div>
          )}
        </div>
      </main>

      <div className="py-6">
        <PoweredByFooter size="md" />
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
      <LoginForm />
    </Suspense>
  );
}
