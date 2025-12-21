'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

interface OrderHistoryItem {
  id: bigint;
  orderNumber: string;
  merchantName: string;
  merchantCode: string;
  mode: 'dinein' | 'takeaway';
  status: string;
  totalAmount: number;
  placedAt: string;
  itemsCount: number;
}

/**
 * GENFITY Customer Order History Page
 * 
 * @description
 * Displays all past orders for authenticated customer.
 * Shows order cards with status, items, and total amount.
 * 
 * @specification
 * - Container: max-w-[420px] mx-auto bg-white min-h-svh
 * - CustomerHeader with back button
 * - Order cards with status badges
 * - Filter by status (All, Pending, Completed, Cancelled)
 * - Click card → navigate to order detail
 * 
 * @navigation
 * - Back: Returns to ref or profile page
 * - Order card: /[merchantCode]/order-summary-cash?orderNumber={number}&mode={mode}
 * 
 * @security
 * - JWT Bearer token authentication
 * - Hydration-safe rendering (prevents SSR/CSR mismatch)
 */
export default function OrderHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const merchantCode = params.merchantCode as string | undefined;
  const mode = searchParams.get('mode') as 'dinein' | 'takeaway' | null;
  const ref = searchParams.get('ref');

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<ReturnType<typeof getCustomerAuth> | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [merchantCurrency, setMerchantCurrency] = useState('AUD'); // ✅ NEW: Dynamic currency

  // ✅ FIX: Add hydration guard to prevent SSR/CSR mismatch
  const [isMounted, setIsMounted] = useState(false);

  /**
   * ✅ FIXED: Hydration-safe authentication check
   * 
   * @description
   * Prevents hydration mismatch by:
   * 1. Setting isMounted flag AFTER client-side hydration completes
   * 2. Loading auth from localStorage only on client-side
   * 3. Showing loading state during SSR → CSR transition
   * 
   * @specification Emergency Troubleshooting - copilot-instructions.md
   * 
   * @security
   * - localStorage only accessed on client-side (after mount)
   * - No SSR/CSR data mismatch
   */
  useEffect(() => {
    // ✅ 1. Mark component as mounted (client-side only)
    setIsMounted(true);

    // ✅ 2. Load auth from localStorage (safe now)
    const customerAuth = getCustomerAuth();
    setAuth(customerAuth);

    // ✅ 3. Redirect if not authenticated
    if (!customerAuth) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = merchantCode
        ? `/login?merchant=${merchantCode}${mode ? `&mode=${mode}` : ''}&ref=${encodeURIComponent(currentPath)}`
        : `/login?ref=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    // ✅ 4. Fetch merchant info if merchantCode available
    if (merchantCode) {
      fetchMerchantInfo(merchantCode);
    }

    // ✅ 5. Fetch orders if authenticated
    fetchOrders(customerAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, merchantCode, mode]);

  /**
   * ✅ NEW: Fetch merchant info to get currency
   * 
   * @param code - Merchant code
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Merchant Endpoints
   */
  const fetchMerchantInfo = async (code: string) => {
    try {
      const response = await fetch(`/api/public/merchants/${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.currency) {
          setMerchantCurrency(data.data.currency);
          console.log('✅ [ORDER HISTORY] Merchant currency:', data.data.currency);
        }
      }
    } catch (error) {
      console.error('❌ [ORDER HISTORY] Failed to fetch merchant info:', error);
    }
  };

  /**
   * Fetch orders from API
   * 
   * @param customerAuth - Customer authentication object
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
   */
  const fetchOrders = async (customerAuth: NonNullable<ReturnType<typeof getCustomerAuth>>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer/orders', {
        headers: {
          'Authorization': `Bearer ${customerAuth.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchantCode) {
      router.push(`/${merchantCode}`);
    } else {
      // Fallback: get last merchant from localStorage
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}`);
      } else {
        router.push('/');
      }
    }
  };

  const handleOrderClick = (order: OrderHistoryItem) => {
    router.push(`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`);
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

  // Filter orders based on selected filter
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'confirmed', 'ready'].includes(order.status.toLowerCase());
    if (filter === 'completed') return order.status.toLowerCase() === 'completed';
    if (filter === 'cancelled') return order.status.toLowerCase() === 'cancelled';
    return true;
  });

  // ✅ HYDRATION FIX: Show loading during SSR → CSR transition
  if (!isMounted || !auth) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING} />;
  }

  return (
    <>
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Order History</h1>

          {/* Placeholder */}
          <div className="w-10" />
        </div>

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${filter === 'all'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${filter === 'pending'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${filter === 'completed'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${filter === 'cancelled'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <LoadingState type="inline" message={LOADING_MESSAGES.ORDER_HISTORY} />
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {filter === 'all' ? 'No Orders Yet' : 'No Orders Found'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {filter === 'all'
                ? 'Your order history will appear here'
                : `No ${filter === 'pending' ? 'active' : filter} orders found`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
              >
                Start Ordering
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id.toString()}
                onClick={() => handleOrderClick(order)}
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
                    <span>•</span>
                    <span>{order.itemsCount || 0} items</span>
                  </div>
                  <span className="text-base font-bold text-orange-500">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
