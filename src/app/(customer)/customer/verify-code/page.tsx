'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { FormPageSkeleton } from '@/components/common/SkeletonLoaders';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaArrowLeft } from 'react-icons/fa';
import { customerForgotPasswordUrl, customerLoginUrl, customerResetPasswordUrl } from '@/lib/utils/customerRoutes';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';
import InvalidLinkCard from '@/components/auth/InvalidLinkCard';
import { fetchPublicApiJson } from '@/lib/utils/orderApiClient';

interface ForgotPasswordResponse {
    success: boolean;
    data?: {
        lastSentAt?: string | number;
    };
    message?: string;
}

interface VerifyResetCodeResponse {
    success: boolean;
    data: {
        token: string;
    };
    message?: string;
}

/**
 * Verify Code Page
 * 
 * User enters 6-digit verification code sent to email
 */
function VerifyCodeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const email = searchParams.get('email') || '';
    const { backHref: ref } = useCustomerBackTarget({
        fallback: customerLoginUrl(),
        includeLastMerchantFallback: false,
    });
    const hasEmail = Boolean(email.trim());

    const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

    // ✅ Check localStorage for last sent timestamp on mount
    useEffect(() => {
        if (!hasEmail) {
            setResendTimer(0);
            setCanResend(false);
            return;
        }
        const storageKey = `resend_cooldown_${email}`;
        const lastSentAt = localStorage.getItem(storageKey);

        if (lastSentAt) {
            const elapsed = Date.now() - parseInt(lastSentAt, 10);
            const remaining = Math.max(0, RESEND_COOLDOWN_MS - elapsed);

            if (remaining > 0) {
                setResendTimer(Math.ceil(remaining / 1000));
                setCanResend(false);
            } else {
                setCanResend(true);
                localStorage.removeItem(storageKey);
            }
        } else {
            // First time visiting - start with cooldown active
            setResendTimer(60);
        }
    }, [email, hasEmail, RESEND_COOLDOWN_MS]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else if (resendTimer === 0) {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleBack = () => {
        router.push(customerForgotPasswordUrl({ ref }));
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only keep last digit
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }
        setCode(newCode);
        // Focus last filled input or last input
        const lastIndex = Math.min(pastedData.length, 5);
        inputRefs.current[lastIndex]?.focus();
    };

    const handleResendCode = async () => {
        if (!canResend) return;

        setCanResend(false);
        setResendTimer(60);
        setError('');

        const storageKey = `resend_cooldown_${email}`;

        try {
            const data = await fetchPublicApiJson<ForgotPasswordResponse>('/api/public/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            // ✅ Save timestamp on successful resend
            if (data.data?.lastSentAt) {
                localStorage.setItem(storageKey, data.data.lastSentAt.toString());
            } else {
                localStorage.setItem(storageKey, Date.now().toString());
            }
        } catch (err) {
            const error = err as Error & { status?: number; info?: { data?: { retryAfterSeconds?: number } } };
            if (error.status === 429 && error.info?.data?.retryAfterSeconds) {
                setResendTimer(error.info.data.retryAfterSeconds);
                setCanResend(false);
                return;
            }
            setError(error.message || 'Failed to resend code');
            setCanResend(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const verificationCode = code.join('');
        if (verificationCode.length !== 6) {
            setError(t('auth.error.invalidCode'));
            return;
        }

        setIsLoading(true);

        try {
            // Verify the code
            const data = await fetchPublicApiJson<VerifyResetCodeResponse>('/api/public/auth/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code: verificationCode,
                }),
            });

            // Navigate to reset password page with token
            router.push(customerResetPasswordUrl({ email, token: data.data.token, ref }));
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
                        <FaArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                    <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
                        {t('auth.enterVerificationCode')}
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                {!hasEmail ? (
                    <InvalidLinkCard
                        title={t('auth.invalidLinkTitle')}
                        message={t('auth.invalidLinkMessage')}
                        actionHref={customerForgotPasswordUrl({ ref })}
                        actionLabel={t('auth.requestNewLink')}
                        buttonClassName="bg-orange-500 hover:bg-orange-600"
                    />
                ) : (
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
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('auth.checkEmail')}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('auth.codeSentTo')}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                            {email}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Code Input */}
                        <div>
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
                                {t('auth.enter6DigitCode')}
                            </label>
                            <div className="flex justify-center gap-2" onPaste={handlePaste}>
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:border-orange-500 transition-all"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || code.join('').length !== 6}
                            className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('auth.verifying')}
                                </span>
                            ) : (
                                t('auth.verifyCode')
                            )}
                        </button>
                    </form>

                    {/* Resend Code */}
                    <div className="text-center mt-6">
                        {canResend ? (
                            <button
                                onClick={handleResendCode}
                                className="text-sm text-orange-500 hover:underline"
                            >
                                {t('auth.resendCode')}
                            </button>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('auth.resendCodeIn')} <span className="font-medium">{resendTimer}s</span>
                            </p>
                        )}
                    </div>

                    {/* Back to Login */}
                    <div className="text-center mt-4">
                        <button
                            onClick={() => router.push(customerLoginUrl({ ref }))}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            {t('auth.backToSignIn')}
                        </button>
                    </div>
                </div>
                )}
            </main>

            {/* Powered By Footer */}
            <div className="py-4">
                <PoweredByFooter />
            </div>
        </div>
    );
}

export default function VerifyCodePage() {
    return (
        <Suspense fallback={<FormPageSkeleton />}>
            <VerifyCodeForm />
        </Suspense>
    );
}
