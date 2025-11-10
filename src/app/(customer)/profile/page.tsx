'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCustomerAuth, clearCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderHistoryItem } from '@/lib/types/customer';

/**
 * Profile Page - Redesigned
 * 
 * Based on FRONTEND_SPECIFICATION.md (Tasks 29-31):
 * - Tab navigation: Akun, Riwayat Pesanan (56px height)
 * - Account tab: Avatar 80x80px, name 20px/700, email, phone, logout button
 * - Order history tab: Order cards with status badges, items count, total
 * - Header: Fixed 56px with back button
 */

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [auth, setAuth] = useState(getCustomerAuth());
  const [activeTab, setActiveTab] = useState<'account' | 'history'>('account');
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const merchant = searchParams.get('merchant');
  const ref = searchParams.get('ref');

  const fetchOrderHistory = async () => {
    if (!auth) return;

    setIsLoadingOrders(true);
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
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    if (!auth) {
      router.push(`/login${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
      return;
    }

    // Fetch order history if on history tab
    if (activeTab === 'history' && orderHistory.length === 0) {
      fetchOrderHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, activeTab, router]);

  const handleLogout = () => {
    clearCustomerAuth();
    setAuth(null);
    
    // Redirect based on context
    if (merchant) {
      router.push(`/${merchant}/home`);
    } else if (ref) {
      router.push(decodeURIComponent(ref));
    } else {
      router.push('/');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dikonfirmasi' },
      ready: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Siap Diambil' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dibatalkan' },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-[#666666]">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Fixed Header - 56px */}
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-[100]">
        {/* Left: Back Button */}
        <button
          onClick={() => {
            if (merchant) {
              router.push(`/${merchant}/home`);
            } else if (ref) {
              router.push(decodeURIComponent(ref));
            } else {
              router.push('/');
            }
          }}
          className="flex items-center gap-2 text-[#1A1A1A]"
        >
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">Kembali</span>
        </button>

        {/* Center: Title */}
        <h1 className="text-base font-bold text-[#1A1A1A]">Profil</h1>

        {/* Right: Placeholder */}
        <div className="w-16" />
      </header>

      {/* Tab Navigation - 56px */}
      <div className="h-14 bg-white border-b border-[#E0E0E0] flex">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 text-sm font-semibold transition-colors ${
            activeTab === 'account'
              ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
              : 'text-[#666666] border-b-[3px] border-transparent'
          }`}
        >
          Akun
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 text-sm font-semibold transition-colors ${
            activeTab === 'history'
              ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
              : 'text-[#666666] border-b-[3px] border-transparent'
          }`}
        >
          Riwayat Pesanan
        </button>
      </div>

      {/* Tab Content */}
      <main className="px-4 py-6">
        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div>
            {/* User Info Section */}
            <div className="mb-6 p-6 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0]">
              {/* Avatar - 80x80px */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold mb-3">
                  {auth.user.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Name - 20px/700 */}
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  {auth.user.name}
                </h2>
                
                {/* Email - 14px/400 */}
                <p className="text-sm text-[#666666] mb-1">
                  📧 {auth.user.email}
                </p>
                
                {/* Phone - 14px/400 */}
                {auth.user.phone && (
                  <p className="text-sm text-[#666666]">
                    📱 {auth.user.phone}
                  </p>
                )}
              </div>

              {/* Account Info Details */}
              <div className="space-y-3 pt-4 border-t border-[#E0E0E0]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#666666]">Status Akun</span>
                  <span className="text-sm font-semibold text-green-600">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#666666]">Total Pesanan</span>
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    {orderHistory.length} pesanan
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Logout Button - 44px */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full h-11 border-2 border-red-500 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                Keluar dari Akun
              </button>
            </div>
          </div>
        )}

        {/* ORDER HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            {isLoadingOrders ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">⏳</div>
                <p className="text-[#666666]">Memuat riwayat...</p>
              </div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-base font-semibold text-[#1A1A1A] mb-2">
                  Belum Ada Pesanan
                </p>
                <p className="text-sm text-[#666666] mb-6">
                  Riwayat pesanan Anda akan muncul di sini
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-[#FF6B35] text-white text-sm font-semibold rounded-lg hover:bg-[#E55A2B]"
                >
                  Mulai Pesan
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <div
                    key={order.id.toString()}
                    className="p-4 border border-[#E0E0E0] rounded-lg bg-white"
                  >
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A] mb-1">
                          {order.merchantName}
                        </p>
                        <p className="text-xs text-[#999999]">
                          {formatDate(order.placedAt)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Order Number */}
                    <div className="mb-3 p-2 bg-[#F9F9F9] rounded">
                      <p className="text-xs text-[#666666]">Nomor Pesanan</p>
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        #{order.orderNumber}
                      </p>
                    </div>

                    {/* Order Mode */}
                    <div className="mb-3">
                      <p className="text-xs text-[#666666] mb-1">
                        {order.mode === 'dinein' ? '🍽️ Makan di Tempat' : '🛍️ Ambil Sendiri'}
                      </p>
                    </div>

                    {/* Total Amount */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#FF6B35]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => router.push(`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`)}
                      className="w-full h-10 border border-[#E0E0E0] text-[#FF6B35] text-sm font-semibold rounded-lg hover:border-[#FF6B35] hover:bg-[#FFF5F0] transition-all"
                    >
                      Lihat Detail
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-[300]"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white rounded-lg z-[300] p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Keluar dari Akun?
              </h3>
              <p className="text-sm text-[#666666]">
                Anda akan keluar dari akun ini
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 border-2 border-[#E0E0E0] text-[#1A1A1A] text-sm font-semibold rounded-lg hover:border-[#666666] transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-all"
              >
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Profile Page with Suspense wrapper
 */
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-[#666666]">Memuat profil...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
