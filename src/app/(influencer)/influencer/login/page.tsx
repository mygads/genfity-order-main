'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FaTimesCircle,
  FaEyeSlash,
  FaEye,
  FaSpinner,
} from 'react-icons/fa';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Carousel slides for influencer login
const carouselSlides = [
  {
    image: '/images/carousel/il-influencer-1.png',
    title: 'Track Your Earnings',
    description: 'Monitor your referral commissions and earnings in real-time with detailed reports.',
  },
  {
    image: '/images/carousel/il-influencer-2.png',
    title: 'Grow Your Network',
    description: 'Share your unique referral code and build a network of merchants using GENFITY.',
  },
  {
    image: '/images/carousel/il-influencer-3.png',
    title: 'Detailed Analytics',
    description: 'Access comprehensive analytics to understand your performance and optimize your strategy.',
  },
];

/**
 * Influencer Login Skeleton
 */
function InfluencerLoginSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[#173C82]/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Panel Skeleton */}
          <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-brand-500 to-brand-600 rounded-l-2xl p-10 relative overflow-hidden">
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse" />
            <div className="flex-1 flex flex-col justify-center py-8 space-y-6">
              <div className="w-full h-[220px] bg-white/10 rounded-2xl animate-pulse" />
              <div className="space-y-3">
                <div className="h-6 w-3/4 mx-auto bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-2/3 mx-auto bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* Right Form Skeleton */}
          <div className="w-full lg:w-[420px] bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex justify-center mb-8 lg:hidden">
                <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="text-center mb-8 space-y-3">
                <div className="h-7 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-5">
                <div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
                <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
              <div className="mt-6 flex justify-center">
                <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfluencerLoginForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!formData.email || !formData.password) {
      setError('Please enter your email and password');
      setIsLoading(false);
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError(t('auth.turnstile.required'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/influencer/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          turnstileToken: turnstileSiteKey ? turnstileToken : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Save tokens and redirect
      localStorage.setItem('influencerAccessToken', data.data.accessToken);
      localStorage.setItem('influencerRefreshToken', data.data.refreshToken);
      localStorage.setItem('influencerData', JSON.stringify(data.data.influencer));

      router.push('/influencer/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[#173C82]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0">
          {/* Left Side - Info Panel with Carousel */}
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

            {/* Carousel Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
              {/* Carousel Image */}
              <div className="relative w-full h-[220px] mb-8">
                {carouselSlides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 flex items-center justify-center ${currentSlide === index ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      width={320}
                      height={220}
                      className="object-contain drop-shadow-2xl"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>

              {/* Carousel Text */}
              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold transition-all duration-500">
                  {carouselSlides[currentSlide].title}
                </h2>
                <p className="text-brand-100 text-sm leading-relaxed max-w-sm mx-auto transition-all duration-500">
                  {carouselSlides[currentSlide].description}
                </p>
              </div>

              {/* Carousel Dots */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {carouselSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all duration-300 rounded-full ${currentSlide === index
                        ? 'w-6 h-2 bg-white'
                        : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                      }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="relative z-10 flex items-center justify-center gap-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-brand-100">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure Login</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-100">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Fast Withdrawals</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 lg:rounded-r-2xl lg:rounded-l-none rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none">
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Mobile Logo */}
              <div className="flex justify-center mb-8 lg:hidden">
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
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome Back, Partner!
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Enter your credentials to access your dashboard
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-3">
                  <FaTimesCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <Link
                      href="/influencer/forgot-password"
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
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

                {turnstileSiteKey && (
                  <div className="flex justify-center">
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onVerify={(token) => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                      theme="auto"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || (turnstileSiteKey ? !turnstileToken : false)}
                  className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin h-5 w-5" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Register Link */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Don&apos;t have an account?{' '}
                  <Link href="/influencer/register" className="text-brand-500 hover:text-brand-600 font-medium">
                    Join Our Program
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

export default function InfluencerLoginPage() {
  return (
    <Suspense fallback={<InfluencerLoginSkeleton />}>
      <InfluencerLoginForm />
    </Suspense>
  );
}

