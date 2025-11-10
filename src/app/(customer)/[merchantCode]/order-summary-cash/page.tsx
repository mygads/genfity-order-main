'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clearCart } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';

interface OrderSummaryData {
  id: bigint;
  orderNumber: string;
  merchantName: string;
  customerName: string;
  mode: OrderMode;
  tableNumber: string | null;
  status: string;
  items: Array<{
    menuName: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes: string | null;
    addons: Array<{
      addonItemName: string;
      quantity: number;
      price: number;
    }>;
  }>;
  subtotalAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  createdAt: string;
}

/**
 * Order Summary Cash Page - Redesigned
 * 
 * Based on FRONTEND_SPECIFICATION.md (Tasks 25-28):
 * - Success icon: 64x64px checkmark in green circle
 * - Order number: 28px/700 #1A1A1A, center-aligned
 * - QR code: 200x200px for payment at cashier
 * - Order details: items list with addons
 * - Total: 20px/700 #FF6B35
 * - Action buttons: "Pesan Lagi" 48px #FF6B35
 */
export default function OrderSummaryCashPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const orderNumber = searchParams.get('orderNumber') || '';
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [order, setOrder] = useState<OrderSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrderSummary = async () => {
      if (!orderNumber) {
        setError('Nomor pesanan tidak ditemukan');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/orders/${orderNumber}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Gagal memuat pesanan');
        }

        const orderData = {
          ...data.data,
          id: BigInt(data.data.id),
        };

        setOrder(orderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderSummary();
  }, [orderNumber]);

  const formatCurrency = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`;

  const handlePesanBaru = () => {
    // Clear cart for this merchant and mode
    clearCart(merchantCode, mode);
    // Navigate to menu
    router.push(`/${merchantCode}/order?mode=${mode}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-[#666666]">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-base text-[#1A1A1A] font-semibold mb-2">Pesanan Tidak Ditemukan</p>
          <p className="text-sm text-[#666666] mb-6">{error}</p>
          <button
            onClick={() => router.push(`/${merchantCode}/home?mode=${mode}`)}
            className="px-6 py-3 bg-[#FF6B35] text-white text-sm font-semibold rounded-lg hover:bg-[#E55A2B]"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Success Header */}
      <div className="py-8 text-center border-b border-[#E0E0E0]">
        {/* Success Icon - 64x64px */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center text-white text-4xl">
          ✓
        </div>
        
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Pesanan Berhasil!</h1>
        
        {/* Order Number - Monospace tag */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono text-gray-700">
            {order.orderNumber}
          </span>
        </div>
        
        <p className="text-sm text-[#666666]">
          {order.mode === 'dinein' ? `Meja #${order.tableNumber}` : 'Ambil Sendiri'}
        </p>
      </div>

      <main className="px-4 py-6">
        {/* QR Code Section - 200x200px */}
        <div className="mb-6 text-center">
          <div className="inline-block p-4 bg-white border-2 border-[#E0E0E0] rounded-lg">
            <div className="w-[200px] h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 rounded flex items-center justify-center text-6xl">
              📱
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#1A1A1A]">
            Tunjukkan QR atau 8 digit kode pesanan ke kasir
          </p>
          <p className="text-xs text-[#666666]">
            untuk melanjutkan pembayaran
          </p>
        </div>

        {/* Order Details */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">
            Detail Pesanan
          </h2>
          
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="p-3 border border-[#E0E0E0] rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    {item.quantity}x {item.menuName}
                  </span>
                  <span className="text-sm font-bold text-[#FF6B35]">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
                
                {item.addons.length > 0 && (
                  <div className="ml-4 space-y-0.5 mb-2">
                    {item.addons.map((addon, ai) => (
                      <p key={ai} className="text-xs text-[#999999]">
                        + {addon.addonItemName} ({formatCurrency(addon.price)})
                      </p>
                    ))}
                  </div>
                )}
                
                {item.notes && (
                  <p className="text-xs text-[#666666] mt-2">📝 {item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total Summary */}
        <div className="p-4 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0] mb-6">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-[#666666]">Total Pembayaran</span>
            <span className="text-xl font-bold text-[#FF6B35]">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handlePesanBaru}
            className="w-full h-12 bg-[#FF6A35] text-white text-base font-semibold rounded-lg hover:bg-[#F1592A] transition-all active:scale-[0.98]"
          >
            Pesan Baru
          </button>
          
          <button
            onClick={() => router.push(`/${merchantCode}/history?mode=${mode}`)}
            className="w-full h-12 border-2 border-[#E0E0E0] text-[#1A1A1A] text-base font-semibold rounded-lg hover:border-[#FF6A35] hover:text-[#FF6A35] transition-all active:scale-[0.98]"
          >
            Masuk ke History
          </button>
        </div>
      </main>
    </div>
  );
}
