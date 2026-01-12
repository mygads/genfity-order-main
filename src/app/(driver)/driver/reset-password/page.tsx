'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, EyeCloseIcon } from '@/icons';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from '@/components/common/LanguageSelector';

function DriverResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.password || !formData.confirmPassword) {
        throw new Error(t('driver.resetPassword.error.allFieldsRequired'));
      }

      if (formData.password.length < 8) {
        throw new Error(t('driver.resetPassword.error.passwordMin8'));
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error(t('driver.resetPassword.error.passwordMismatch'));
      }

      if (!token) {
        throw new Error(t('driver.resetPassword.error.invalidToken'));
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('driver.resetPassword.error.resetFailed'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/driver/login');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="absolute right-4 top-4 z-20">
          <LanguageToggle className="bg-white/80 backdrop-blur border border-gray-200" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('driver.resetPassword.invalidTokenTitle')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {t('driver.resetPassword.invalidTokenMessage')}
          </p>
          <Link
            href="/driver/forgot-password"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#173C82] hover:bg-[#122c60] text-white font-semibold rounded-lg transition-all"
          >
            {t('driver.resetPassword.requestNewLink')}
          </Link>
        </div>
      </div>
    );
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold">{t('driver.resetPassword.createNewPassword')}</h2>
                <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto">
                  {t('driver.resetPassword.securePasswordHint')}
                </p>
              </div>

              <div className="mt-8 space-y-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.resetPassword.tip1')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.resetPassword.tip2')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-100">{t('driver.resetPassword.tip3')}</p>
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

          <div className="w-full lg:w-120 bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
            <div className="p-6 sm:p-8 lg:p-10">
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

              {!success ? (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {t('driver.resetPassword.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {t('driver.resetPassword.subtitle')}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('driver.resetPassword.newPassword')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('driver.resetPassword.newPasswordPlaceholder')}
                          value={formData.password}
                          onChange={handleChange}
                          required
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('driver.resetPassword.passwordHint')}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('driver.resetPassword.confirmPassword')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('driver.resetPassword.confirmPasswordPlaceholder')}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#173C82] focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <EyeIcon className="w-5 h-5 fill-gray-400" />
                          ) : (
                            <EyeCloseIcon className="w-5 h-5 fill-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isLoading
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
                          {t('driver.resetPassword.resetting')}
                        </>
                      ) : (
                        t('driver.resetPassword.resetPassword')
                      )}
                    </button>
                  </form>

                  <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                    <Link href="/driver/login" className="text-[#173C82] hover:text-[#122c60] dark:text-blue-400 font-semibold">
                      {t('driver.resetPassword.backToLogin')}
                    </Link>
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('driver.resetPassword.success.title')}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t('driver.resetPassword.success.message')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverResetPasswordPage() {
  return (
    <Suspense>
      <DriverResetPasswordForm />
    </Suspense>
  );
}
