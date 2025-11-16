'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, EyeIcon, EyeCloseIcon } from '@/icons';
import Label from '@/components/form/Label';
import Checkbox from '@/components/form/input/Checkbox';
import { saveAdminAuth } from '@/lib/utils/adminAuth';

/**
 * Admin Login Form Component
 * Handles email/password authentication for admin users
 * 
 * Features:
 * - Email and password authentication
 * - JWT token-based authentication
 * - Session management
 * - Role-based access (SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF)
 * - Remember me functionality
 * 
 * Security:
 * - bcryptjs password validation (>=10 rounds)
 * - JWT session verification
 * - Parameterized database queries
 * 
 * API Endpoint: POST /api/auth/login
 */
function AdminLoginForm() {
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get redirect path and error from query params
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';
  const errorParam = searchParams.get('error');

  // Error messages
  const errorMessages: Record<string, string> = {
    expired: 'Your session has expired. Please log in again.',
    forbidden: 'Access denied. You do not have permission.',
    unauthorized: 'You must log in first.',
  };

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  /**
   * Handle login form submission
   * Calls /api/auth/login endpoint with email and password
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Input validation
      if (!formData.email || !formData.password) {
        throw new Error('Email dan password harus diisi');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Format email tidak valid');
      }

      if (formData.password.length < 8) {
        throw new Error('Password minimal 8 karakter');
      }

      // Call admin login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          rememberMe, // Include remember me flag for session duration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal');
      }

      // Validate user role (must be admin/merchant)
      const allowedRoles = ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'];
      if (!allowedRoles.includes(data.data.user.role)) {
        throw new Error('Akses ditolak. Halaman ini khusus untuk admin.');
      }

      // Calculate token expiration (default 1 hour if not provided)
      const expiresIn = data.data.expiresIn || 3600; // 3600 seconds = 1 hour
      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

      // Save auth to localStorage and cookies
      saveAdminAuth({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        user: {
          id: data.data.user.id.toString(),
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          merchantId: data.data.user.merchantId,
        },
        expiresAt,
      });

      // Save profile picture URL separately for easy access
      if (data.data.user.profilePictureUrl) {
        localStorage.setItem('profilePictureUrl', data.data.user.profilePictureUrl);
      }

      // Determine redirect URL based on role
      let redirectUrl = redirectPath;
      // All admin roles go to /admin/dashboard which handles role-based rendering
      if (redirectPath === '/admin/dashboard') {
        redirectUrl = '/admin/dashboard';
      }

      // Use window.location for more reliable redirect
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      console.error('Login error:', err);
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
            href="/"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeftIcon />
            Back to home
          </Link>
        </div>

        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-4">
          <div>
            {/* Header */}
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Sign In
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign in!
              </p>
            </div>

            {/* Error Alert */}
            {(error || errorParam) && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Login Failed
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {error || (errorParam ? errorMessages[errorParam] || 'Terjadi kesalahan. Silakan coba lagi.' : '')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
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
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <Label htmlFor="password">
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      role="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={rememberMe} onChange={setRememberMe} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    href="/admin/forgot-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </div>
            </form>

            {/* Development Credentials */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800/50 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  <span className="font-semibold">🔐 Dev Mode:</span><br />
                  Email: admin@genfity.com<br />
                  Password: 1234abcd
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Welcome to GENFITY
            </h2>
            <p className="text-white/80 text-lg">
              Powerful restaurant management system to grow your business
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Menu & Order Management</h3>
                <p className="text-sm text-white/70">
                  Update menus and track orders in real-time
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sales Analytics</h3>
                <p className="text-sm text-white/70">
                  Comprehensive business insights and reporting
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Multi-Merchant Support</h3>
                <p className="text-sm text-white/70">
                  Manage multiple restaurants from one platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Login Page
 * 
 * Features:
 * - Email and password authentication
 * - JWT token-based authentication
 * - Session management
 * - Role-based access (SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF)
 * - Secure token storage in localStorage
 * - Auto-redirect to admin dashboard on successful login
 * - Error handling with user-friendly messages
 * 
 * Security:
 * - bcryptjs password validation (>=10 rounds)
 * - JWT session verification
 * - HTTPS-only in production
 * - No password exposure in logs
 * 
 * API Endpoint: POST /api/auth/login
 */
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="mb-4 text-5xl">⏳</div>
            <p className="text-[#666666]">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
