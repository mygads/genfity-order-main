'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';
import { getCustomerAuth } from '@/lib/utils/localStorage';

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
  const [auth] = useState(getCustomerAuth());
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    // Check authentication
    if (!auth) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = merchantCode
        ? `/login?merchant=${merchantCode}${mode ? `&mode=${mode}` : ''}&ref=${encodeURIComponent(currentPath)}`
        : `/login?ref=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, merchantCode, mode]);

  const fetchOrders = async () => {
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
    } else if (merchantCode && mode) {
      router.push(`/${merchantCode}/profile?mode=${mode}`);
    } else if (merchantCode) {
      router.push(`/${merchantCode}/profile`);
    } else {
      router.push('/profile');
    }
  };

  const handleOrderClick = (order: OrderHistoryItem) => {
    router.push(`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`);
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

  // Filter orders based on selected filter
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'confirmed', 'ready'].includes(order.status.toLowerCase());
    if (filter === 'completed') return order.status.toLowerCase() === 'completed';
    if (filter === 'cancelled') return order.status.toLowerCase() === 'cancelled';
    return true;
  });

  if (!auth) return null;

  return (
    <div
      className="max-w-[420px] mx-auto bg-white min-h-svh flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <CustomerHeader
        merchantCode={merchantCode}
        mode={mode || undefined}
        showBackButton={true}
        onBack={handleBack}
        title="Riwayat Pesanan"
      />

      {/* Filter Tabs */}
      <div className="sticky top-14 z-40 bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all ${
              filter === 'pending'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900'
            }`}
          >
            Berlangsung
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all ${
              filter === 'completed'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all ${
              filter === 'cancelled'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900'
            }`}
          >
            Dibatalkan
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Memuat riwayat...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-base font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {filter === 'all'
                ? 'Riwayat pesanan Anda akan muncul di sini'
                : `Tidak ada pesanan dengan status ${filter === 'pending' ? 'berlangsung' : filter === 'completed' ? 'selesai' : 'dibatalkan'}`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
              >
                Mulai Pesan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id.toString()}
                onClick={() => handleOrderClick(order)}
                className="p-4 border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]"
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      {order.merchantName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(order.placedAt)}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Order Number */}
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Nomor Pesanan</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">
                    #{order.orderNumber}
                  </p>
                </div>

                {/* Order Details */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{order.mode === 'dinein' ? '🍽️ Dine-in' : '🛍️ Takeaway'}</span>
                    <span>•</span>
                    <span>{order.itemsCount || 0} item</span>
                  </div>
                  <p className="text-base font-bold text-orange-500">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>

                {/* Action Hint */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-orange-500 font-medium">
                    Lihat Detail
                  </span>
                  <span className="text-gray-400">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
