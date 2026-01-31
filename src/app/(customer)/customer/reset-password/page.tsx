'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { FormPageSkeleton } from '@/components/common/SkeletonLoaders';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { customerForgotPasswordUrl, customerLoginUrl } from '@/lib/utils/customerRoutes';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';
import InvalidLinkCard from '@/components/auth/InvalidLinkCard';
import { fetchPublicApiJson } from '@/lib/utils/orderApiClient';

/**
 * Reset Password Page
 * 
 * User creates new password after verification
 */
function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';
    const { backHref: ref } = useCustomerBackTarget({
        fallback: customerLoginUrl(),
        includeLastMerchantFallback: false,
    });

    if (!email.trim() || !token.trim()) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
                <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
                    <div className="flex items-center px-4 py-3">
                        <button
                            onClick={() => router.push(customerForgotPasswordUrl({ ref }))}
                            className="w-10 h-10 flex items-center justify-center -ml-2"
                            aria-label="Back"
                        >
                            <FaArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        </button>
                        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
                            {t('auth.createNewPassword')}
                        </h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-4 py-8">
                    <InvalidLinkCard
                        title={t('auth.invalidLinkTitle')}
                        message={t('auth.invalidLinkMessage')}
                        actionHref={customerForgotPasswordUrl({ ref })}
                        actionLabel={t('auth.requestNewLink')}
                        buttonClassName="bg-orange-500 hover:bg-orange-600"
                    />
                </main>

                <div className="py-4">
                    <PoweredByFooter />
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password.length < 6) {
            setError(t('auth.error.passwordTooShort'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDontMatch'));
            return;
        }

        setIsLoading(true);

        try {
            await fetchPublicApiJson('/api/public/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    token,
                    password,
                }),
            });

            setSuccess(true);

            // Redirect to login after success
            setTimeout(() => {
                router.push(customerLoginUrl({ ref }));
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        router.push(customerLoginUrl({ ref }));
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
                <div className="flex items-center px-4 py-3">
                    <button
                        onClick={handleBackToLogin}
                        className="w-10 h-10 flex items-center justify-center -ml-2"
                        aria-label="Back"
                    >
                        <FaArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                    <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
                        {t('auth.createNewPassword')}
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

                    {success ? (
                        /* Success Message */
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                <FaCheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('auth.resetSuccess')}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {t('auth.resetSuccessDesc')}
                            </p>
                            <button
                                onClick={handleBackToLogin}
                                className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all"
                            >
                                {t('auth.signInNow')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Title */}
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('auth.createNewPassword')}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('auth.createNewPasswordDesc')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {email}
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* New Password Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {t('auth.newPassword')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 px-4 pr-12 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                                            placeholder={t('auth.passwordMinChars')}
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

                                {/* Confirm Password Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {t('auth.confirmPassword')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-12 px-4 pr-12 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                                            placeholder={t('auth.placeholder.confirmPassword')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? (
                                                <FaEyeSlash className="w-5 h-5" />
                                            ) : (
                                                <FaEye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Password Match Indicator */}
                                {confirmPassword && (
                                    <div className={`text-xs ${password === confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                                        {password === confirmPassword ? t('auth.passwordsMatch') : t('auth.passwordsDontMatch')}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading || password.length < 6 || password !== confirmPassword}
                                    className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            {t('auth.resetting')}
                                        </span>
                                    ) : (
                                        t('auth.resetPassword')
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>

            {/* Powered By Footer */}
            <div className="py-4">
                <PoweredByFooter />
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<FormPageSkeleton />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
