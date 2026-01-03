'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Forgot Password Page
 * 
 * User enters email, receives verification code via email
 */
function ForgotPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const ref = searchParams.get('ref') || '/login';

    const handleBack = () => {
        router.push(`/login?ref=${encodeURIComponent(ref)}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate email
            if (!email.trim()) {
                setError(t('auth.error.emailRequired'));
                setIsLoading(false);
                return;
            }

            // Call API to send verification code
            const response = await fetch('/api/public/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send verification code');
            }

            // ✅ Save timestamp for countdown persistence
            const storageKey = `resend_cooldown_${email.trim().toLowerCase()}`;
            if (data.data?.lastSentAt) {
                localStorage.setItem(storageKey, data.data.lastSentAt.toString());
            } else {
                localStorage.setItem(storageKey, Date.now().toString());
            }

            // Navigate to verification page
            router.push(`/verify-code?email=${encodeURIComponent(email.trim())}&ref=${encodeURIComponent(ref)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
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
                        {t('auth.forgotPassword')}
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

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('auth.resetPassword')}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('auth.resetPasswordDesc')}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm text-gray-900 dark:text-gray-400 mb-2">
                                {t('auth.emailAddress')}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 px-4 border-b border-gray-300 dark:border-gray-600 text-base text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 transition-all"
                                placeholder={t('auth.placeholder.email')}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('auth.sendingCode')}
                                </span>
                            ) : (
                                t('auth.sendVerificationCode')
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="text-center mt-6">
                        <button
                            onClick={handleBack}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            {t('auth.backToSignIn')}
                        </button>
                    </div>
                </div>
            </main>

            {/* Powered By Footer */}
            <div className="py-4">
                <PoweredByFooter />
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
            <ForgotPasswordForm />
        </Suspense>
    );
}
