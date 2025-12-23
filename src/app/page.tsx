'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';

/**
 * Landing Page Component - GENFITY Online Ordering
 * 
 * Ultra-minimal mobile-first design:
 * - Max width 420px, centered layout
 * - English labels for accessibility
 * - Clean typography with proper hierarchy
 * - Subtle interactions, no visual clutter
 * - Dark mode support
 * 
 * @returns {JSX.Element} Landing page component
 */
export default function LandingPage() {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (merchantCode.trim()) {
      router.push(`/${merchantCode.toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900">

      {/* ✅ Use CustomerHeader component (same as /order page) */}
      <CustomerHeader
        title="GENFITY"
        showBackButton={false}
        merchantCode={undefined} // No merchant context on landing page
      />

      {/* Hero Content - Centered Vertically */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Hero Text */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              Order Your Favorite Food
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fast, simple, and seamless ordering experience
            </p>
          </div>

          {/* Merchant Code Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="merchantCode"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
              >
                Merchant Code
              </label>
              <input
                id="merchantCode"
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                placeholder="Enter merchant code"
                className="w-full h-12 px-4 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-all"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
              disabled={!merchantCode.trim()}
            >
              Start Ordering
            </button>
          </form>

          {/* Features - Minimal Icons */}
          <div className="pt-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
                <span className="text-lg">⚡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick & easy ordering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
                <span className="text-lg">💳</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pay at counter
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
                <span className="text-lg">📱</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mobile optimized
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 px-6 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-center text-gray-500 dark:text-gray-500">
          © 2025 GENFITY. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
