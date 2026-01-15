'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaEnvelope,
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaKey,
} from 'react-icons/fa';

/**
 * Influencer Forgot Password Page
 * 
 * Features:
 * - Email input for password reset
 * - Sends reset link via email
 * - User-friendly success/error messages
 * 
 * Flow:
 * 1. User enters email
 * 2. System validates email exists
 * 3. Generates reset token (valid 1 hour)
 * 4. Sends email with reset link
 * 5. Shows success message
 */
export default function InfluencerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Input validation
      if (!email) {
        throw new Error('Email is required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Call forgot password API
      const response = await fetch('/api/influencer/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      // Show success message
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Side - Info Panel */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-brand-500 to-brand-600 rounded-l-2xl p-10 text-white relative overflow-hidden">
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

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
              {/* Icon */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
                  <FaKey className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold">
                  Need Help?
                </h2>
                <p className="text-brand-100 text-sm leading-relaxed max-w-sm mx-auto">
                  Reset your password securely with email verification
                </p>
              </div>

              {/* Steps */}
              <div className="mt-8 space-y-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <p className="text-sm text-brand-100">Enter your registered email</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <p className="text-sm text-brand-100">Check your inbox for reset link</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <p className="text-sm text-brand-100">Create a new secure password</p>
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="relative z-10 flex items-center justify-center gap-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-brand-100">
                <FaCheckCircle className="w-4 h-4 text-green-300" />
                <span>Secure & Encrypted</span>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
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

              {!success ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Forgot Password?
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Enter your email to receive a password reset link
                    </p>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Input */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FaEnvelope className="inline w-4 h-4 mr-1" />
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                          focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm 
                          bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isLoading
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-200 dark:shadow-none'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <FaSpinner className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>

                  {/* Back to Login Link */}
                  <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                    Remember your password?{' '}
                    <Link href="/influencer/login" className="text-brand-500 hover:text-brand-600 font-semibold">
                      Back to Login
                    </Link>
                  </p>
                </>
              ) : (
                /* Success State */
                <div className="text-center">
                  {/* Success Icon */}
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaCheckCircle className="w-8 h-8 text-green-500" />
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Check Your Email
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                    Please check your inbox and follow the instructions.
                  </p>

                  <Link
                    href="/influencer/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-all"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    Return to Login
                  </Link>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
                    Didn&apos;t receive the email? Check your spam folder or{' '}
                    <button 
                      onClick={() => { setSuccess(false); setEmail(''); }}
                      className="text-brand-500 hover:underline"
                    >
                      try again
                    </button>
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
