'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaEyeSlash,
  FaEye,
  FaSpinner,
} from 'react-icons/fa';

// Country list with currencies
const countries = [
  { name: 'Indonesia', currency: 'IDR', flag: '🇮🇩' },
  { name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
  { name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  { name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
  { name: 'United States', currency: 'USD', flag: '🇺🇸' },
];

/**
 * Influencer Register Skeleton
 */
function InfluencerRegisterSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[#173C82]/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Panel Skeleton */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded-l-2xl p-10 relative overflow-hidden">
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse" />
            <div className="flex-1 flex flex-col justify-center py-8 space-y-6">
              <div className="h-6 w-48 bg-white/20 rounded-full animate-pulse" />
              <div className="h-8 w-3/4 bg-white/20 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          {/* Right Form Skeleton */}
          <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex justify-center mb-6 lg:hidden">
                <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="text-center mb-6 space-y-3">
                <div className="h-7 w-52 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-48 mx-auto bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                    <div className="h-11 w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                ))}
                <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-2" />
              </div>
              <div className="mt-4 flex justify-center">
                <div className="h-4 w-44 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfluencerRegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: 'Indonesia',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.country) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/influencer/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email.toLowerCase(),
          phone: formData.phone || undefined,
          password: formData.password,
          country: formData.country,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - save tokens and redirect
      localStorage.setItem('influencerAccessToken', data.data.accessToken);
      localStorage.setItem('influencerRefreshToken', data.data.refreshToken);
      localStorage.setItem('influencerData', JSON.stringify(data.data.influencer));
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/influencer/dashboard');
      }, 2000);
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your influencer account has been created. Your account is pending admin approval.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[#173C82]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
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
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Influencer Partnership Program
                </div>
                
                <h2 className="text-3xl font-bold leading-tight">
                  Earn Passive Income with GENFITY
                </h2>
                
                <p className="text-orange-100 leading-relaxed">
                  Join our influencer program and earn commission for every merchant you refer. 
                  Get paid for their deposits, subscriptions, and recurring payments!
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold">10%+</div>
                    <div className="text-sm text-orange-100">First Commission</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold">5%+</div>
                    <div className="text-sm text-orange-100">Recurring</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold">Lifetime</div>
                    <div className="text-sm text-orange-100">Earnings</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold">Multi</div>
                    <div className="text-sm text-orange-100">Currency</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center gap-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-orange-100">
                <FaCheckCircle className="w-4 h-4 text-white" />
                <span>Easy Withdrawals</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-100">
                <FaCheckCircle className="w-4 h-4 text-white" />
                <span>Real-time Tracking</span>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form */}
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

              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Become an Influencer
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Create your account and start earning
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                  <FaTimesCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Register Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+62 812 3456 7890"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Country */}
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    {countries.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name} ({country.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="w-5 h-5" />
                      ) : (
                        <FaEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin h-5 w-5" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>

                {/* Login Link */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/influencer/login" className="text-orange-500 hover:text-orange-600 font-medium">
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InfluencerRegisterPage() {
  return (
    <Suspense fallback={<InfluencerRegisterSkeleton />}>
      <InfluencerRegisterForm />
    </Suspense>
  );
}
