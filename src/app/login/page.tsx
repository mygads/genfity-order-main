'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { saveCustomerAuth } from '@/lib/utils/localStorage';

/**
 * Customer Login Form Component
 * Wrapped in Suspense to use useSearchParams
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const merchant = searchParams.get('merchant');
  const mode = searchParams.get('mode');
  const ref = searchParams.get('ref');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call customer login/register API
      const response = await fetch('/api/public/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
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
      } else if (merchant) {
        const modeParam = mode ? `?mode=${mode}` : '';
        router.push(`/${merchant}/home${modeParam}`);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-4xl">🍽️</span>
            <span className="text-3xl font-bold text-gray-900">GENFITY</span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Masuk atau Daftar
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan email Anda untuk melanjutkan pesanan
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="nama@email.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Jika belum punya akun, akan otomatis didaftarkan
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Nama Lengkap <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Muhammad Yoga Adi Saputra"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Nomor Ponsel <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0896-6817-6764"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Memproses...' : 'Lanjutkan'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={ref ? decodeURIComponent(ref) : merchant ? `/${merchant}` : '/'}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Kembali{merchant ? ` ke ${merchant}` : ''}
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Dengan melanjutkan, Anda menyetujui{' '}
          <Link href="#" className="text-orange-500 hover:underline">
            Syarat & Ketentuan
          </Link>{' '}
          dan{' '}
          <Link href="#" className="text-orange-500 hover:underline">
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
 * - Passwordless login/register dengan email
 * - Jika email ada: login (update name/phone jika berbeda)
 * - Jika email baru: register sebagai CUSTOMER
 * - Redirect ke ref parameter setelah login
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-center"><div className="mb-4 text-6xl">⏳</div><p className="text-gray-600">Loading...</p></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
