'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, EyeCloseIcon } from '@/icons';
import { saveAdminAuth } from '@/lib/utils/adminAuth';

// Carousel data with English text
const carouselSlides = [
  {
    image: '/images/carousel/il-talent-1.png',
    title: 'Integrated F&B Ecosystem',
    description: 'Cashier, kitchen, and customers connected effectively. All your data will also be kept confidential.',
  },
  {
    image: '/images/carousel/il-talent-2.png',
    title: 'Real-time Order Management',
    description: 'Track and manage orders seamlessly from any device. Stay connected with your business 24/7.',
  },
  {
    image: '/images/carousel/il-talent-3.png',
    title: 'Smart Analytics Dashboard',
    description: 'Get insights into your business performance with comprehensive reports and analytics.',
  },
];

/**
 * Admin Login Form Component
 * Styled to match POSLite ESB design
 */
function AdminLoginForm() {
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Get redirect path and error from query params
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';
  const errorParam = searchParams.get('error');

  // Error messages
  const errorMessages: Record<string, string> = {
    expired: 'Your session has expired. Please log in again.',
    forbidden: 'Access denied. You do not have permission.',
    unauthorized: 'You must log in first.',
  };

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user types
    if (error) setError('');
  };

  /**
   * Handle login form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Input validation - use early return pattern
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email format');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Call admin login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          rememberMe: true,
        }),
      });

      const data = await response.json();

      // Handle API errors without throwing
      if (!response.ok) {
        setError(data.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Validate user role (must be admin/merchant)
      const allowedRoles = ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'];
      if (!allowedRoles.includes(data.data.user.role)) {
        setError('Access denied. This page is for administrators only.');
        setIsLoading(false);
        return;
      }

      // Calculate token expiration
      const expiresIn = data.data.expiresIn || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

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

      // Save profile picture URL separately
      if (data.data.user.profilePictureUrl) {
        localStorage.setItem('profilePictureUrl', data.data.user.profilePictureUrl);
      }

      // Redirect
      window.location.href = redirectPath;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if form is valid for button state
  const isFormValid = formData.email && formData.password && formData.password.length >= 8;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-10 lg:p-20" style={{
      background: 'linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)',
    }}>
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

        {/* Left Side - Carousel (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-[500px]">
          {/* Carousel Image */}
          <div className="relative w-full h-[300px] mb-6">
            {carouselSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${currentSlide === index ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  width={400}
                  height={300}
                  className="object-contain"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>

          {/* Carousel Text */}
          <div className="text-center mb-4">
            <h2
              className="mb-2 transition-all duration-500"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '36px',
                color: '#373A49',
              }}
            >
              {carouselSlides[currentSlide].title}
            </h2>
            <p
              className="transition-all duration-500"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '22.4px',
                color: '#373A49',
              }}
            >
              {carouselSlides[currentSlide].description}
            </p>
          </div>

          {/* Carousel Dots */}
          <div className="flex items-center gap-2">
            {carouselSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className="transition-all duration-300"
                style={{
                  width: currentSlide === index ? '16px' : '8px',
                  height: '8px',
                  borderRadius: '8px',
                  backgroundColor: currentSlide === index ? '#0E65A9' : '#D9D9D9',
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div
          className="w-full max-w-[450px]"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '4px 4px 9px 0px rgba(135, 159, 190, 0.15)',
            padding: '40px 30px',
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image
                src="/images/logo/logo.png"
                alt="Genfity"
                width={180}
                height={50}
                className="dark:hidden"
                priority
              />
              <Image
                src="/images/logo/logo-dark-mode.png"
                alt="Genfity"
                width={180}
                height={50}
                className="hidden dark:block"
                priority
              />
            </Link>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-6">
            <h1
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '24px',
                color: '#373A49',
                marginBottom: '8px',
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                color: '#6B7280',
              }}
            >
              Please sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {(error || errorParam) && (
            <div
              className="mb-6 p-4 rounded-lg flex items-start gap-3"
              style={{ backgroundColor: '#FEF2F2' }}
            >
              <span className="text-red-500 text-lg">⚠</span>
              <div>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#DC2626',
                    marginBottom: '2px',
                  }}
                >
                  Login Failed
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: '#DC2626',
                  }}
                >
                  {error || (errorParam ? errorMessages[errorParam] || 'An error occurred. Please try again.' : '')}
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: 'rgba(0, 0, 0, 0.85)',
                    marginBottom: '8px',
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '0.6px solid #D9D9D9',
                    borderRadius: '5px',
                    padding: '4px 11px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1286E1';
                    e.target.style.boxShadow = '0 0 0 2px rgba(18, 134, 225, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D9D9D9';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: 'rgba(0, 0, 0, 0.85)',
                    marginBottom: '8px',
                  }}
                >
                  Password
                </label>
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
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '0.6px solid #D9D9D9',
                      borderRadius: '5px',
                      padding: '4px 40px 4px 11px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1286E1';
                      e.target.style.boxShadow = '0 0 0 2px rgba(18, 134, 225, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D9D9D9';
                      e.target.style.boxShadow = 'none';
                    }}
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
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  href="/admin/forgot-password"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#1286E1',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '5px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
                  backgroundColor: isLoading || !isFormValid ? '#E3E6E8' : '#F07600',
                  color: isLoading || !isFormValid ? '#74838E' : '#FFFFFF',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && isFormValid) {
                    e.currentTarget.style.backgroundColor = '#D96A00';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && isFormValid) {
                    e.currentTarget.style.backgroundColor = '#F07600';
                  }
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="text-center mt-6">
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              Don&apos;t have an account?{' '}
            </span>
            <Link
              href="/admin/register"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '13px',
                color: '#F07600',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Login Page
 */
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'linear-gradient(109.78deg, #FFFFFF 2.1%, #E7EEF5 100%)' }}
        >
          <div className="text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <p style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
