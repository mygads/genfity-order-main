'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCustomerAuth, clearCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderHistoryItem } from '@/lib/types/customer';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

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
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD'); // ✅ NEW: Dynamic currency

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

    // ✅ Fetch order history immediately on mount (only once)
    if (orderHistory.length === 0) {
      fetchOrderHistory();
    }

    // ✅ Fetch merchant info to get currency
    if (merchant) {
      fetchMerchantInfo(merchant);
    }

    // ✅ Check if user has password
    const checkPassword = async () => {
      try {
        const response = await fetch('/api/customer/check-password', {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setHasPassword(data.data.hasPassword);
        }
      } catch (error) {
        console.error('Failed to check password:', error);
      }
    };

    checkPassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, router]);

  /**
   * ✅ NEW: Fetch merchant info to get currency
   * 
   * @param merchantCode - Merchant code from URL
   */
  const fetchMerchantInfo = async (merchantCode: string) => {
    try {
      const response = await fetch(`/api/public/merchants/${merchantCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.currency) {
          setMerchantCurrency(data.data.currency);
          console.log('✅ [PROFILE] Merchant currency:', data.data.currency);
        }
      }
    } catch (error) {
      console.error('❌ [PROFILE] Failed to fetch merchant info:', error);
    }
  };

  const handleLogout = () => {
    console.log('🔐 [PROFILE] Logout initiated');

    // Clear auth from localStorage (will dispatch event)
    clearCustomerAuth();

    // Update local state
    setAuth(null);
    console.log('🔐 [PROFILE] Auth state cleared');

    // Redirect based on context
    if (ref) {
      console.log('🔐 [PROFILE] Redirecting to ref:', decodeURIComponent(ref));
      router.push(decodeURIComponent(ref));
    } else if (merchant) {
      console.log('🔐 [PROFILE] Redirecting to merchant home:', `/${merchant}`);
      router.push(`/${merchant}`);
    } else {
      // Fallback: get last merchant from localStorage
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        console.log('🔐 [PROFILE] Redirecting to last merchant:', `/${lastMerchant}`);
        router.push(`/${lastMerchant}`);
      } else {
        console.log('🔐 [PROFILE] Redirecting to home');
        router.push('/');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', label: 'Confirmed' },
      ready: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400', label: 'Ready' },
      completed: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Completed' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Cancelled' },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  /**
   * ✅ FIXED: Format currency using merchant's currency setting
   * 
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantCurrency,
    }).format(amount);
  };

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
    return <LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back Button */}
          <button
            onClick={() => {
              if (ref) {
                router.push(decodeURIComponent(ref));
              } else if (merchant) {
                router.push(`/${merchant}`);
              } else {
                // Fallback: get last merchant from localStorage
                const lastMerchant = localStorage.getItem('lastMerchantCode');
                if (lastMerchant) {
                  router.push(`/${lastMerchant}`);
                } else {
                  router.push('/');
                }
              }
            }}
            className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-orange-500 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Title */}
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Profile</h1>

          {/* Placeholder */}
          <div className="w-16" />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'account'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'history'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Order History
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="p-4 pb-24">
            {/* User Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-4">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-lg">
                  {auth.user.name.charAt(0).toUpperCase()}
                </div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {auth.user.name}
                </h2>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>{auth.user.email}</span>
                </div>

                {auth.user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{auth.user.phone}</span>
                  </div>
                )}
              </div>

              {/* Account Stats */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {orderHistory.length} orders
                  </span>
                </div>
              </div>
            </div>

            {/* Save Account Button (for users without password) */}
            {!hasPassword && (
              <div className="mb-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">💾</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      Save Your Account
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Set a password to secure your account and access it from any device
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Navigate to login with save-account mode
                    const saveAccountUrl = `/login?mode=save-account&email=${encodeURIComponent(auth.user.email)}&name=${encodeURIComponent(auth.user.name)}${auth.user.phone ? `&phone=${encodeURIComponent(auth.user.phone)}` : ''}&ref=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                    router.push(saveAccountUrl);
                  }}
                  className="w-full h-11 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
                >
                  Save Account
                </button>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full h-11 border-2 border-red-500 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* ORDER HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="p-4 pb-24">
            {isLoadingOrders ? (
              <LoadingState type="inline" message={LOADING_MESSAGES.ORDER_HISTORY} />
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  No Orders Yet
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Your order history will appear here
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
                >
                  Start Ordering
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <div
                    key={order.id.toString()}
                    onClick={() => router.push(`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`)}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                  >
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate">
                          {order.merchantName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(order.placedAt)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Order Number */}
                    <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Order Number</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                        #{order.orderNumber}
                      </p>
                    </div>

                    {/* Order Details */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>{order.mode === 'dinein' ? '🍽️ Dine-in' : '🛍️ Takeaway'}</span>
                      </div>
                      <span className="text-base font-bold text-orange-500">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
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
            className="fixed inset-0 bg-black/50 z-[300]"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl z-[300] p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Sign Out?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You will be signed out from your account
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-semibold rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all active:scale-[0.98]"
              >
                Sign Out
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
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />}>
      <ProfileContent />
    </Suspense>
  );
}
