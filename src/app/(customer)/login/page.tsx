'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { saveCustomerAuth } from '@/lib/utils/localStorage';

/**
 * Customer Login Form Component
 * Redesigned to match FRONTEND_SPECIFICATION.md:
 * - Conditional rendering: "Sudah punya akun?" dialog first
 * - Two paths: Login (email/password) or Guest checkout
 * - Auto-register on new email
 * - Ref parameter for navigation
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const merchant = searchParams.get('merchant');
  const mode = searchParams.get('mode');
  const ref = searchParams.get('ref');

  /**
   * Handle "Ya, Login" - show email/password form
   */
  const handleYesLogin = () => {
    setShowAuthChoice(false);
  };

  /**
   * Handle "Tidak, Lanjut Tanpa Login" - guest checkout
   */
  const handleGuestCheckout = () => {
    // Skip to cart/menu as guest
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchant && mode) {
      router.push(`/${merchant}/order?mode=${mode}`);
    } else if (merchant) {
      router.push(`/${merchant}`);
    } else {
      router.push('/');
    }
  };

  /**
   * Handle login form submission
   * Simple login with email + password only
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call customer login API (email + password only)
      const response = await fetch('/api/public/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal');
      }

      // Save auth to localStorage
      saveCustomerAuth({
        accessToken: data.data.accessToken,
        user: data.data.user,
        expiresAt: data.data.expiresAt,
      });

      // Redirect to ref or merchant home
      if (ref) {
        router.push(decodeURIComponent(ref));
      } else if (merchant && mode) {
        router.push(`/${merchant}/order?mode=${mode}`);
      } else if (merchant) {
        router.push(`/${merchant}`);
      } else {
        router.push('/profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🍽️</span>
            <span className="text-2xl font-bold text-[#1A1A1A]">GENFITY</span>
          </Link>
          <h1 className="text-[28px] font-bold text-[#1A1A1A] mb-2">
            {showAuthChoice ? 'Selamat Datang' : 'Masuk ke Akun'}
          </h1>
          <p className="text-sm text-[#666666]">
            {showAuthChoice 
              ? 'Silakan pilih cara melanjutkan'
              : 'Login untuk akses riwayat pesanan dan checkout lebih cepat'
            }
          </p>
        </div>

        {/* Conditional Rendering: Auth Choice or Login Form */}
        {showAuthChoice ? (
          /* Auth Choice Dialog */
          <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 shadow-sm">
            <p className="text-base font-semibold text-[#1A1A1A] mb-6 text-center">
              Sudah punya akun?
            </p>

            <div className="space-y-3">
              {/* Ya, Login Button */}
              <button
                onClick={handleYesLogin}
                className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] transition-all duration-200 active:scale-[0.98]"
              >
                Ya, Login
              </button>

              {/* Tidak, Lanjut Tanpa Login Button */}
              <button
                onClick={handleGuestCheckout}
                className="w-full h-12 bg-white text-[#FF6B35] text-base font-semibold border-2 border-[#FF6B35] rounded-lg hover:bg-[#FFF5F0] transition-all duration-200 active:scale-[0.98]"
              >
                Tidak, Lanjut Tanpa Login
              </button>
            </div>

            <p className="mt-6 text-xs text-center text-[#999999]">
              Login untuk menyimpan riwayat pesanan dan mempercepat checkout
            </p>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 shadow-sm">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[#1A1A1A] mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 text-sm border border-[#E0E0E0] rounded-lg text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
                  placeholder="nama@email.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[#1A1A1A] mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 text-sm border border-[#E0E0E0] rounded-lg text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
                  placeholder="Masukkan password"
                />
                <a href="#" className="inline-block mt-2 text-xs text-[#FF6B35] hover:underline">
                  Lupa Kata Sandi?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? 'Memproses...' : 'Lanjutkan'}
              </button>
            </form>

            {/* Back to Choice */}
            <button
              onClick={() => setShowAuthChoice(true)}
              className="w-full mt-4 text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
            >
              ← Kembali
            </button>

            <p className="mt-4 text-xs text-center text-[#999999]">
              Belum punya akun? Buat akun saat checkout pembayaran
            </p>
          </div>
        )}

        {/* Footer Links */}
        <p className="mt-6 text-center text-xs text-[#999999]">
          Dengan melanjutkan, Anda menyetujui{' '}
          <Link href="#" className="text-[#FF6B35] hover:underline">
            Syarat & Ketentuan
          </Link>{' '}
          dan{' '}
          <Link href="#" className="text-[#FF6B35] hover:underline">
            Kebijakan Privasi
          </Link>{' '}
          GENFITY
        </p>
      </div>
    </div>
  );
}

/**
 * Customer Login Page
 * - Conditional rendering: Auth choice dialog first
 * - Two paths: Login or Guest checkout
 * - Passwordless auto-register on new email
 * - Ref parameter for navigation
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 text-5xl">⏳</div>
          <p className="text-[#666666]">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
