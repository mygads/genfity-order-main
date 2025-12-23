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
    const statusConfig: Record<string, { border: string; text: string; label: string }> = {
      pending: { border: 'border-yellow-500', text: 'text-yellow-600', label: 'Pending' },
      confirmed: { border: 'border-blue-500', text: 'text-blue-600', label: 'Confirmed' },
      in_progress: { border: 'border-orange-500', text: 'text-orange-600', label: 'In Progress' },
      ready: { border: 'border-purple-500', text: 'text-purple-600', label: 'Ready' },
      completed: { border: 'border-green-500', text: 'text-green-600', label: 'Completed' },
      cancelled: { border: 'border-red-500', text: 'text-red-600', label: 'Cancelled' },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 border ${config.border} ${config.text}`}>
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
  const filteredOrders = orders
    .filter(order => {
      if (filter === 'all') return true;
      if (filter === 'pending') return !['completed', 'cancelled'].includes(order.status.toLowerCase());
      if (filter === 'completed') return order.status.toLowerCase() === 'completed';
      if (filter === 'cancelled') return order.status.toLowerCase() === 'cancelled';
      return true;
    })
    // Sort: active orders first, then by newest
    .sort((a, b) => {
      const aIsActive = !['completed', 'cancelled'].includes(a.status.toLowerCase());
      const bIsActive = !['completed', 'cancelled'].includes(b.status.toLowerCase());
      // Active orders first
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      // Then by newest date
      return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
    });

  // ✅ HYDRATION FIX: Show loading during SSR → CSR transition
  if (!isMounted || !auth) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING} />;
  }

  return (
    <div className="">
      {/* Fixed Header - Profile Style */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
        <div className="flex items-center px-4 py-3">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Title */}
          <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
            Order History
          </h1>
        </div>

        {/* Filter Tabs - Evenly Spaced */}
        <div className="flex border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'all'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'pending'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent'
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'completed'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent'
              }`}
          >
            Completed
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          /* Order History Skeleton Loading */
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
              >
                {/* Header Skeleton */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>

                {/* Order Number Skeleton */}
                <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1" />
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                </div>

                {/* Footer Skeleton */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            {/* Empty State - SVG Icon */}
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
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
            {filteredOrders.map((order) => {
              const isOrderActive = !['completed', 'cancelled'].includes(order.status.toLowerCase());

              return (
                <div
                  key={order.id.toString()}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
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
                      {/* Mode Icon - SVG instead of emoji */}
                      {order.mode === 'dinein' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3V3zm2 8h14M7 7v10m10-10v10" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      )}
                      <span>{order.mode === 'dinein' ? 'Dine-in' : 'Pick Up'}</span>
                      <span>•</span>
                      <span>{order.itemsCount || 0} items</span>
                    </div>
                    <span className="text-base font-bold text-orange-500">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* View Order Button - Always visible */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className="flex-1 py-2 text-sm font-semibold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                    >
                      View Order
                    </button>

                    {/* Track Order Button - Only for active orders */}
                    {isOrderActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${order.merchantCode}/track/${order.orderNumber}`);
                        }}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all"
                      >
                        Track Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
