'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaSpinner,
  FaKey,
  FaShieldAlt,
} from 'react-icons/fa';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate passwords
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Call reset password API
      const response = await fetch('/api/influencer/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/influencer/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Side - Info Panel */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded-l-2xl p-10 text-white relative overflow-hidden">
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
                  <FaShieldAlt className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold">
                  Create New Password
                </h2>
                <p className="text-orange-100 text-sm leading-relaxed max-w-sm mx-auto">
                  Choose a strong password to secure your account
                </p>
              </div>

              {/* Password Tips */}
              <div className="mt-8 space-y-3 max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-4 h-4 text-green-300 shrink-0" />
                  <p className="text-sm text-orange-100">At least 8 characters long</p>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-4 h-4 text-green-300 shrink-0" />
                  <p className="text-sm text-orange-100">Include numbers and symbols</p>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-4 h-4 text-green-300 shrink-0" />
                  <p className="text-sm text-orange-100">Don&apos;t reuse old passwords</p>
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="relative z-10 flex items-center justify-center gap-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-orange-100">
                <FaLock className="w-4 h-4 text-green-300" />
                <span>256-bit Encryption</span>
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
                      Reset Password
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Create a new secure password for your account
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
                    {/* New Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FaKey className="inline w-4 h-4 mr-1" />
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          disabled={isLoading || !token}
                          className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                            focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm 
                            bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Minimum 8 characters
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FaLock className="inline w-4 h-4 mr-1" />
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          disabled={isLoading || !token}
                          className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                            focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm 
                            bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !token}
                      className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isLoading || !token
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <FaSpinner className="w-5 h-5 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>

                  {/* Back to Login Link */}
                  <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                    Remember your password?{' '}
                    <Link href="/influencer/login" className="text-orange-500 hover:text-orange-600 font-semibold">
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
                    Password Reset!
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>

                  <p className="text-sm text-gray-400 mb-4">
                    Redirecting to login in 3 seconds...
                  </p>

                  <Link
                    href="/influencer/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Go to Login Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InfluencerResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
