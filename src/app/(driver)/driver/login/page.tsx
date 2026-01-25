'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { saveDriverAuth } from '@/lib/utils/driverAuth';
import Image from 'next/image';
import { LanguageToggle } from '@/components/common/LanguageSelector';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';

export default function DriverLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      }
    >
      <DriverLoginInner />
    </Suspense>
  );
}

function DriverLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const redirectPath = searchParams.get('redirect') || '/driver/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileResetSignal((prev) => prev + 1);
  };

  const initialError = useMemo(() => {
    if (errorParam === 'expired') return t('driver.login.error.sessionExpired');
    if (errorParam === 'unauthorized') return t('driver.login.error.mustLogin');
    return '';
  }, [errorParam, t]);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    !isLoading &&
    (!turnstileSiteKey || Boolean(turnstileToken));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError(t('driver.login.error.emailPasswordRequired'));
      return;
    }

    setIsLoading(true);

    if (turnstileSiteKey && !turnstileToken) {
      setError(t('auth.turnstile.required'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: 'driver',
          email: email.trim().toLowerCase(),
          password,
          rememberMe: true,
          turnstileToken: turnstileSiteKey ? turnstileToken : undefined,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json?.message || t('driver.login.error.loginFailed'));
        resetTurnstile();
        return;
      }

      const role = json?.data?.user?.role as string | undefined;
      if (role !== 'DELIVERY') {
        setError(t('driver.login.error.deliveryOnly'));
        resetTurnstile();
        return;
      }

      const expiresIn = (json?.data?.expiresIn as number | undefined) || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      saveDriverAuth({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
        expiresAt,
        user: {
          id: String(json.data.user.id),
          name: json.data.user.name,
          email: json.data.user.email,
          role: 'DELIVERY',
          merchantId: json.data.user.merchantId ? String(json.data.user.merchantId) : undefined,
        },
      });

      router.replace(redirectPath);
    } catch {
      setError(t('driver.login.error.network'));
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#173C82]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <LanguageToggle className="bg-white/80 backdrop-blur border border-gray-200" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Side - Info Panel */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-linear-to-br from-[#173C82] to-[#0f2a5c] rounded-l-2xl p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

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

            <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold">{t('driver.login.title')}</h2>
                <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto">
                  {t('driver.login.subtitle')}
                </p>
              </div>

              <div className="mt-8 space-y-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.login.step1')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.login.step2')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.login.step3')}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{t('driver.common.secure')}</span>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-120 bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
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

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('driver.login.formTitle')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('driver.login.formSubtitle')}
                </p>
              </div>

              {(initialError || error) && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{error || initialError}</p>
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    placeholder="driver@genfity.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('driver.login.password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('driver.login.passwordHint')}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/driver/forgot-password"
                    className="text-sm font-medium text-[#173C82] hover:text-[#122c60] dark:text-blue-400"
                  >
                    {t('driver.login.forgotPassword')}
                  </Link>
                </div>

                {turnstileSiteKey && (
                  <div className="flex justify-center">
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onVerify={(token) => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                      resetSignal={turnstileResetSignal}
                      theme="auto"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    !canSubmit
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
                      {t('driver.login.loading')}
                    </>
                  ) : (
                    t('driver.login.submit')
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
                  {t('common.backHome')}
                </Link>
                <Link href="/admin/login" className="hover:text-gray-700 dark:hover:text-gray-300">
                  {t('driver.login.adminLink')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
