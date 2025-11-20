'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerHeader from '@/components/customer/CustomerHeader';

/**
 * GENFITY Customer Landing Page
 * 
 * @description
 * Main entry point for customers. Shows merchant code input and "Cara Menggunakan" hero.
 * Uses CustomerHeader component for consistent auth detection across all pages.
 * 
 * @specification
 * - Container: max-w-[420px] mx-auto bg-white min-h-svh
 * - Header: CustomerHeader component (consistent with /order page)
 * - Hero section: 3 steps illustration (Pesan • Bayar • Makan)
 * - Merchant code input + "Lanjutkan" button
 * - Safe area padding for mobile devices
 * 
 * @navigation
 * - After merchant code input → /[merchantCode]
 * - Sign In → /login?ref=/ 
 * - Profile → /[merchantCode]/profile (via CustomerHeader)
 * - History → /[merchantCode]/history (via CustomerHeader)
 * 
 * @specification copilot-instructions.md - Customer Navigation
 */
export default function CustomerLandingPage() {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle merchant code submission
   * 
   * @description
   * 1. Validate merchant code format
   * 2. Fetch merchant data from API
   * 3. Save to localStorage for quick access
   * 4. Navigate to merchant page
   * 
   * @specification STEP_02 - Merchant validation flow
   */
  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!merchantCode.trim()) {
      setError('Masukkan kode merchant');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/public/merchants/${merchantCode.trim()}`);

      if (!response.ok) {
        throw new Error('Kode merchant tidak valid');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Merchant tidak ditemukan');
      }

      // ✅ Save last visited merchant
      localStorage.setItem('lastMerchantCode', merchantCode.trim());
      console.log('💾 Last merchant saved:', merchantCode.trim());

      router.push(`/${merchantCode.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="max-w-[420px] mx-auto bg-white min-h-svh flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ✅ Use CustomerHeader component (same as /order page) */}
      <CustomerHeader 
        title="GENFITY"
        showBackButton={false}
        merchantCode={undefined} // No merchant context on landing page
      />

      <main className="flex-1 flex flex-col px-4 py-8">
        {/* Logo & Welcome */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <span className="text-6xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Selamat Datang di GENFITY
          </h1>
          <p className="text-sm text-gray-600">
            Pesan makanan favorit Anda dengan mudah
          </p>
        </div>

        {/* Hero: Cara Menggunakan */}
        <div className="mb-12">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-6">
            Cara Menggunakan
          </h2>
          <div className="flex items-center justify-center gap-6">
            {/* Step 1: Order */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">🛒</span>
              </div>
              <p className="text-xs text-gray-700 font-medium">Pesan</p>
            </div>

            <div className="text-gray-400 text-xs">•</div>

            {/* Step 2: Pay */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">💳</span>
              </div>
              <p className="text-xs text-gray-700 font-medium">Bayar</p>
            </div>

            <div className="text-gray-400 text-xs">•</div>

            {/* Step 3: Enjoy */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">😋</span>
              </div>
              <p className="text-xs text-gray-700 font-medium">Makan</p>
            </div>
          </div>
        </div>

        {/* Merchant Code Input Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mulai Memesan
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleMerchantSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="merchantCode"
                className="block text-xs font-semibold text-gray-700 mb-2"
              >
                Kode Merchant
              </label>
              <input
                id="merchantCode"
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode merchant"
                className="w-full h-11 px-3 text-sm border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
                required
                autoComplete="off"
              />
              <p className="mt-2 text-xs text-gray-500">
                Tanyakan kode merchant kepada outlet
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? 'Memvalidasi...' : 'Lanjutkan'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 text-center">
          <p className="text-xs text-gray-500 mb-2">
            Powered by GENFITY
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600">
              Syarat & Ketentuan
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-gray-600">
              Privasi
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
