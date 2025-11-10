'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerAuth, clearCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderHistoryItem } from '@/lib/types/customer';

/**
 * Profile Content Component (uses useSearchParams)
 */
function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [auth, _setAuth] = useState(getCustomerAuth());
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const merchant = searchParams.get('merchant');
  const _mode = searchParams.get('mode');
  const ref = searchParams.get('ref');

  const fetchOrderHistory = async () => {
    if (!auth) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/customer/orders', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrderHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    if (!auth) {
      router.push('/login');
      return;
    }

    // Fetch order history
    fetchOrderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, router]);

  const handleLogout = () => {
    clearCustomerAuth();
    router.push(ref ? decodeURIComponent(ref) : '/');
  };

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      ACCEPTED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Diterima' },
      PREPARING: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Diproses' },
      READY: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Siap' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dibatalkan' },
    };

    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold text-gray-900">GENFITY</span>
            </Link>
            <Link
              href={ref ? decodeURIComponent(ref) : merchant ? `/${merchant}` : '/'}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Kembali
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{auth.user.name}</h1>
                <p className="mt-1 text-orange-100">{auth.user.email}</p>
                {auth.user.phone && (
                  <p className="text-sm text-orange-100">{auth.user.phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Order History */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Pesanan</h2>

          {isLoading ? (
            <div className="mt-4 text-center text-gray-500">
              <div className="text-3xl">⏳</div>
              <p className="mt-2">Memuat riwayat pesanan...</p>
            </div>
          ) : orderHistory.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow">
              <div className="text-5xl">📦</div>
              <p className="mt-4 text-gray-600">Belum ada pesanan</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Mulai Pesan
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {orderHistory.map((order) => (
                <div
                  key={order.id.toString()}
                  className="overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            {order.merchantName}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(order.placedAt)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.mode === 'dinein' ? '🍽️ Makan di tempat' : '🛍️ Ambil sendiri'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`}
                        className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
                      >
                        Lihat Detail
                      </Link>
                      <Link
                        href={`/${order.merchantCode}`}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Pesan Lagi
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Customer Profile Page with Suspense wrapper
 */
export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-center"><div className="mb-4 text-6xl">⏳</div><p className="text-gray-600">Loading...</p></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}
