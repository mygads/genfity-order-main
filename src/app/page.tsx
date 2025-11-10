'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Landing Page Component - GENFITY Online Ordering
 * 
 * Redesigned to match FRONTEND_SPECIFICATION.md:
 * - Mobile-first design (375-428px viewport)
 * - Navbar with Sign In button (border 2px #FF6B35)
 * - Hero section with 28px/700 heading
 * - Input with label 14px/600
 * - Submit button "Mulai Pesan" 48px height
 * - Features section with icons
 * 
 * @returns {JSX.Element} Landing page component
 */
export default function LandingPage() {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState('');

  /**
   * Handle merchant code submission
   * Redirects to merchant selection page
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (merchantCode.trim()) {
      router.push(`/${merchantCode.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar - Height 56px */}
      <nav className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="text-base font-bold text-[#1A1A1A]">GENFITY</span>
        </div>
        <Link
          href="/login"
          className="px-4 py-1.5 text-sm font-medium text-[#FF6B35] border-2 border-[#FF6B35] rounded-lg hover:bg-[#FF6B35] hover:text-white transition-all duration-200"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="px-4 pt-12 pb-8">
        <div className="max-w-md mx-auto text-center">
          {/* Hero Heading - 28px/700 */}
          <h1 className="text-[28px] font-bold leading-tight text-[#1A1A1A] mb-3">
            Pesan Makanan Favoritmu
          </h1>
          <p className="text-base text-[#666666] mb-8">
            dengan mudah dan cepat
          </p>

          {/* Merchant Code Input Form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="text-left mb-4">
              {/* Label - 14px/600 */}
              <label 
                htmlFor="merchantCode" 
                className="block text-sm font-semibold text-[#1A1A1A] mb-2"
              >
                Kode Merchant
              </label>
              {/* Input - Height 48px */}
              <input
                id="merchantCode"
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                placeholder="Masukkan kode merchant"
                className="w-full h-12 px-4 text-sm border border-[#E0E0E0] rounded-lg text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
              />
            </div>
            {/* Submit Button - "Mulai Pesan" - 48px height */}
            <button
              type="submit"
              className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!merchantCode.trim()}
            >
              Mulai Pesan
            </button>
          </form>

          {/* Features Section */}
          <div className="mt-16 space-y-8">
            {/* Feature 1: Cepat & Mudah */}
            <div className="flex items-start gap-4 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-[#FFF5F0] rounded-full flex items-center justify-center text-2xl">
                �
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
                  Cepat & Mudah
                </h3>
                <p className="text-sm text-[#666666]">
                  Pesan makanan hanya dengan beberapa klik
                </p>
              </div>
            </div>

            {/* Feature 2: Bayar di Kasir */}
            <div className="flex items-start gap-4 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-[#FFF5F0] rounded-full flex items-center justify-center text-2xl">
                �
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
                  Bayar di Kasir
                </h3>
                <p className="text-sm text-[#666666]">
                  Tidak perlu repot, bayar langsung di tempat
                </p>
              </div>
            </div>

            {/* Feature 3: Mobile Friendly */}
            <div className="flex items-start gap-4 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-[#FFF5F0] rounded-full flex items-center justify-center text-2xl">
                📱
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
                  Mobile Friendly
                </h3>
                <p className="text-sm text-[#666666]">
                  Akses dari smartphone kapan saja
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#F9F9F9] border-t border-[#E0E0E0] py-6 mt-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <p className="text-xs text-[#999999]">
            &copy; 2024 GENFITY Online Ordering. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
