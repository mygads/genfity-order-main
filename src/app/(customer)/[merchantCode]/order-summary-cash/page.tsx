'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clearCart } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';

// ✅ FIX: Update interface to match backend response
interface OrderSummaryData {
  id: string;
  orderNumber: string;
  merchantName: string;
  customerName: string;
  mode: OrderMode;
  tableNumber: string | null;
  status: string;
  // ✅ FIXED: Match backend field names
  orderItems: Array<{
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
  subtotalAmount: number;  // ✅ Backend sends 'subtotalAmount'
  serviceFeeAmount: number; // ✅ Backend sends 'serviceFeeAmount'
  taxAmount: number;        // ✅ Backend sends 'taxAmount'
  totalAmount: number;      // ✅ Backend sends 'totalAmount'
  createdAt: string;
}

/**
 * Order Summary Cash Page
 * 
 * @specification FRONTEND_SPECIFICATION.md (Tasks 25-28)
 * 
 * @description
 * Success page after order creation:
 * - Success icon (64x64px green checkmark)
 * - Order number display (monospace)
 * - QR code placeholder (200x200px)
 * - Order items list with addons
 * - Total amount display
 * - Actions: "Pesan Baru" + "History"
 * 
 * @security
 * - No authentication required (public order lookup)
 * - Order number validation via API
 * 
 * @flow
 * 1. Fetch order data via GET /api/public/orders/:orderNumber
 * 2. Display order details with proper formatting
 * 3. Handle errors (404, 500) with user-friendly messages
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

  /**
   * Fetch order details from API
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
   */
  useEffect(() => {
    const loadOrderSummary = async () => {
      if (!orderNumber) {
        console.error('❌ Missing order number');
        setError('Nomor pesanan tidak ditemukan');
        setIsLoading(false);
        return;
      }

      console.log('📦 Fetching order:', orderNumber);

      try {
        const response = await fetch(`/api/public/orders/${orderNumber}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('❌ API Error:', data);
          setError(data.message || 'Gagal memuat pesanan');
          setIsLoading(false);
          return;
        }

        /**
         * ✅ Convert Decimal.js serialized object to number
         */
        const convertDecimal = (value: any): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return parseFloat(value) || 0;

          if (typeof value === 'object' && value.d && Array.isArray(value.d)) {
            const sign = value.s || 1;
            const exponent = value.e ?? 0;
            const digits = value.d[0] || 0;
            const digitsLength = digits.toString().length;
            const result = sign * digits * Math.pow(10, exponent - digitsLength + 1);

            console.log(`✅ [DECIMAL] {s:${sign}, e:${exponent}, d:[${digits}]} → ${result}`);
            return result;
          }

          console.warn('⚠️ [DECIMAL] Unknown type:', typeof value, value);
          return 0;
        };

        console.log('💰 [ORDER SUMMARY] Raw API response:', {
          subtotal: data.data.subtotal,
          serviceFee: data.data.serviceFeeAmount,
          tax: data.data.taxAmount,
          total: data.data.totalAmount,
          orderItems: data.data.orderItems,
        });

        // ✅ FIX: Convert Decimal di order items
        const convertedOrderItems = data.data.orderItems.map((item: any) => ({
          menuName: item.menuName,
          quantity: item.quantity,
          price: convertDecimal(item.menuPrice),      // ✅ Convert menuPrice
          subtotal: convertDecimal(item.subtotal),    // ✅ Convert subtotal
          notes: item.notes,
          addons: item.addons.map((addon: any) => ({
            addonItemName: addon.addonItemName,
            quantity: addon.quantity,
            price: convertDecimal(addon.price),       // ✅ Convert addon price
          })),
        }));

        console.log('💰 [ORDER ITEMS] Converted items:', convertedOrderItems);

        const orderData: OrderSummaryData = {
          id: data.data.id,
          orderNumber: data.data.orderNumber,
          merchantName: data.data.merchant?.name || data.data.merchantName,
          customerName: data.data.customerName,
          mode: data.data.orderType === 'DINE_IN' ? 'dinein' : 'takeaway',
          tableNumber: data.data.tableNumber,
          status: data.data.status,
          orderItems: convertedOrderItems,            // ✅ Use converted items
          subtotalAmount: convertDecimal(data.data.subtotal || data.data.subtotalAmount),
          serviceFeeAmount: convertDecimal(data.data.serviceFeeAmount),
          taxAmount: convertDecimal(data.data.taxAmount),
          totalAmount: convertDecimal(data.data.totalAmount),
          createdAt: data.data.createdAt,
        };

        console.log('💰 [ORDER SUMMARY] Final order data:', {
          subtotal: orderData.subtotalAmount,
          serviceCharge: orderData.serviceFeeAmount,
          tax: orderData.taxAmount,
          total: orderData.totalAmount,
          items: orderData.orderItems,
        });

        setOrder(orderData);
        console.log('✅ Order loaded successfully');

      } catch (err) {
        console.error('❌ Load order error:', err);
        setError('Gagal memuat pesanan');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderSummary();
  }, [orderNumber, merchantCode]);

  /**
   * Format currency to Indonesian Rupiah
   * 
   * @param amount - Number amount to format
   * @returns Formatted string (e.g., "Rp45.000")
   */
  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID')}`;
  };

  /**
   * Handle "Pesan Baru" button click
   * 
   * @description
   * Clears ALL caches (cart + mode) and navigates to order page.
   * User will be prompted to select mode again.
   * 
   * @specification STEP_06_BUSINESS_FLOWS.txt - New order flow
   */
  const handlePesanBaru = () => {
    console.log('🔄 Starting new order');

    // ✅ 1. Clear cart (existing function)
    clearCart(merchantCode, mode);

    // ✅ 2. Clear mode cache (force re-selection)
    localStorage.removeItem(`mode_${merchantCode}`);
    console.log('🗑️ Mode cache cleared for new order');

    // ✅ 3. Navigate to merchant page (NOT /order directly)
    // This ensures user goes through mode selection modal
    router.push(`/${merchantCode}`);
  };

  /**
   * Handle "Masuk ke History" button click
   * Navigates to order history page
   */
  const handleViewHistory = () => {
    console.log('📜 Viewing order history');
    router.push(`/${merchantCode}/history?mode=${mode}`);
  };

  // ========================================
  // LOADING STATE
  // ========================================
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

  // ========================================
  // ERROR STATE
  // ========================================
  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-base text-[#1A1A1A] font-semibold mb-2">
            Pesanan Tidak Ditemukan
          </p>
          <p className="text-sm text-[#666666] mb-6">{error}</p>
          <button
            onClick={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
            className="px-6 py-3 bg-[#FF6B35] text-white text-sm font-semibold rounded-lg hover:bg-[#E55A2B] transition-all active:scale-[0.98]"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // SUCCESS STATE
  // ========================================
  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Success Header */}
      <div className="py-8 text-center border-b border-[#E0E0E0]">
        {/* Success Icon - 64x64px */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center text-white text-4xl">
          ✓
        </div>

        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">
          Pesanan Berhasil!
        </h1>

        {/* Order Number - Monospace tag */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono text-gray-700">
            {order.orderNumber}
          </span>
        </div>

        <p className="text-sm text-[#666666]">
          {order.mode === 'dinein'
            ? `Meja #${order.tableNumber}`
            : 'Ambil Sendiri'
          }
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

          {/* ✅ FIX: Change order.items to order.orderItems */}
          {!order.orderItems || order.orderItems.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">Tidak ada item dalam pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ✅ FIX: Map over orderItems instead of items */}
              {order.orderItems.map((item, index) => (
                <div key={index} className="p-3 border border-[#E0E0E0] rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {item.quantity}x {item.menuName}
                    </span>
                    <span className="text-sm font-bold text-[#FF6B35]">
                      {/* ✅ FIX: Use menuPrice instead of subtotal for per-item price */}
                      {formatCurrency(Number(item.subtotal))}
                    </span>
                  </div>

                  {item.addons.length > 0 && (
                    <div className="ml-4 space-y-0.5 mb-2">
                      {item.addons.map((addon, ai) => (
                        <p key={ai} className="text-xs text-[#999999]">
                          + {addon.addonItemName} ({formatCurrency(Number(addon.price))})
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
          )}
        </div>

        {/* Total Summary */}
        <div className="mb-6">
          <div className="p-4 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0]">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Subtotal</span>
                <span className="text-[#1A1A1A] font-medium">
                  {formatCurrency(order.subtotalAmount)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Biaya Layanan</span>
                <span className="text-[#1A1A1A] font-medium">
                  {formatCurrency(order.serviceFeeAmount)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Pajak</span>
                <span className="text-[#1A1A1A] font-medium">
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E0E0E0]">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-[#1A1A1A]">Total</span>
                  <span className="text-lg font-bold text-[#FF6A35]">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
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
            onClick={handleViewHistory}
            className="w-full h-12 border-2 border-[#E0E0E0] text-[#1A1A1A] text-base font-semibold rounded-lg hover:border-[#FF6L35] hover:text-[#FF6A35] transition-all active:scale-[0.98]"
          >
            Masuk ke History
          </button>
        </div>
      </main>
    </div>
  );
}
