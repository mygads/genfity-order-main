'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Customer Landing Page
 * - Hero section with system info
 * - Merchant search by name/code
 * - Popular merchants list
 * - Sign In button in header
 */
export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirect to merchant page
      router.push(`/${searchQuery.trim().toUpperCase()}`);
    }
  };

  // Mock popular merchants (will be fetched from API in real implementation)
  const popularMerchants = [
    {
      code: 'BRJO',
      name: 'Burjo Ngegas Gombel',
      description: 'Burjo legendaris dengan menu beragam 24 jam',
      address: 'Jl. Setia Budi No.28, Semarang',
      imageUrl: '/images/merchants/burjo.jpg',
      isOpen: true,
      rating: 4.8,
    },
    {
      code: 'CAFE',
      name: 'Kopi Kenangan Cafe',
      description: 'Kopi dan makanan ringan untuk menemani harimu',
      address: 'Jl. Pemuda No.15, Semarang',
      imageUrl: '/images/merchants/cafe.jpg',
      isOpen: true,
      rating: 4.5,
    },
    {
      code: 'RESTO',
      name: 'Warung Makan Bu Tini',
      description: 'Masakan rumahan dengan cita rasa autentik',
      address: 'Jl. Pandanaran No.42, Semarang',
      imageUrl: '/images/merchants/warung.jpg',
      isOpen: false,
      rating: 4.7,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🍽️</span>
              <span className="text-2xl font-bold text-gray-900">GENFITY</span>
            </div>
            <Link
              href="/login"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Pesan Makanan Favoritmu
            <span className="block text-orange-500">Lebih Mudah & Cepat</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            GENFITY adalah platform pemesanan online untuk restoran. 
            Nikmati kemudahan pesan makanan dengan sistem QR code dan 
            pembayaran di kasir.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-10 max-w-xl"
          >
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-xl text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan nama atau kode merchant (e.g. BRJO)"
                className="block w-full rounded-full border border-gray-300 py-4 pl-12 pr-32 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center rounded-r-full bg-orange-500 px-6 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Cari Merchant
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Kenapa GENFITY?
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
                🛒
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Pesan Online
              </h3>
              <p className="mt-2 text-gray-600">
                Pilih menu favorit tanpa antri, langsung dari smartphone
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
                ⏱️
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Hemat Waktu
              </h3>
              <p className="mt-2 text-gray-600">
                Bayar di kasir dengan menunjukkan QR code pesanan
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
                📍
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Dine-in & Takeaway
              </h3>
              <p className="mt-2 text-gray-600">
                Pilih makan di tempat atau bawa pulang sesuai kebutuhan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Merchants */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Merchant Populer
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularMerchants.map((merchant) => (
              <Link
                key={merchant.code}
                href={`/${merchant.code}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-md transition hover:shadow-xl"
              >
                <div className="relative h-48 bg-gradient-to-br from-orange-400 to-orange-600">
                  {/* Placeholder for merchant image */}
                  <div className="flex h-full items-center justify-center text-6xl font-bold text-white opacity-20">
                    {merchant.code}
                  </div>
                  {merchant.isOpen ? (
                    <div className="absolute right-4 top-4 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                      Buka
                    </div>
                  ) : (
                    <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                      Tutup
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-500">
                    {merchant.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {merchant.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <span>📍</span>
                    <span className="line-clamp-1">{merchant.address}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <span>⭐</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {merchant.rating}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold text-white">GENFITY</span>
            </div>
            <p className="mt-4 text-gray-400">
              Platform Pemesanan Online untuk Restoran
            </p>
            <div className="mt-6 flex justify-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white"
              >
                Dashboard Merchant
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Tentang Kami
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white">
                Hubungi Kami
              </Link>
            </div>
            <p className="mt-8 text-sm text-gray-500">
              © 2024 GENFITY. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
