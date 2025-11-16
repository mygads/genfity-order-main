'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@/icons';
import Label from '@/components/form/Label';

/**
 * Forgot Password Page
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
 * 
 * API Endpoint: POST /api/auth/forgot-password
 */
export default function ForgotPasswordPage() {
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
        throw new Error('Invalid email format');
      }

      // Call forgot password API
      const response = await fetch('/api/auth/forgot-password', {
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
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      {/* Left Side - Form */}
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="w-full max-w-md sm:pt-10 mx-auto mb-5 px-4">
          <Link
            href="/admin/login"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeftIcon />
            Back to login
          </Link>
        </div>

        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-4">
          {!success ? (
            <div>
              {/* Header */}
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Forgot Password
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your email address and we will send you a link to reset your password
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">⚠</span>
                    <div>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Error
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Email Input */}
                  <div>
                    <Label htmlFor="email">
                      Email <span className="text-error-500">*</span>
                    </Label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@genfity.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send reset link'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            // Success Message
            <div>
              <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold text-xl">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Email Sent
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      We have sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Please check your email and click the link to reset your password. 
                      The link will expire in 1 hour.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600"
                >
                  Back to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Need Help?
            </h2>
            <p className="text-white/80 text-lg">
              Reset your password securely with email verification
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enter Your Email</h3>
                <p className="text-sm text-white/70">
                  Provide the email address associated with your account
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Check Your Email</h3>
                <p className="text-sm text-white/70">
                  We will send you a secure link to reset your password
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Create New Password</h3>
                <p className="text-sm text-white/70">
                  Click the link and set a new secure password
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
