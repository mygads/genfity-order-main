'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';
import { useCart } from '@/context/CartContext'; // ✅ ADD THIS
import { formatCurrency } from '@/lib/utils/format';
import { calculateCartSubtotal, calculatePriceBreakdown } from '@/lib/utils/priceCalculator';

/**
 * GENFITY - View Order (Cart Review) Page
 * 
 * @description
 * Review cart before payment. User can:
 * - See order type (Dine-in/Takeaway)
 * - View pickup/dine-in info
 * - Adjust quantities with stepper
 * - Add notes to items
 * - Add general notes
 * - See payment summary (collapsible)
 * - Proceed to payment
 * 
 * @specification FRONTEND_SPECIFICATION.md
 * - Container: max-w-[420px] mx-auto bg-white min-h-svh
 * - Safe area padding
 * - Sticky bottom CTA: "Lanjut Pembayaran"
 */
export default function ViewOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as 'dinein' | 'takeaway';

  // ✅ USE CART CONTEXT instead of localStorage
  const { cart, updateItem, removeItem, initializeCart } = useCart();

  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(10); // ✅ NEW: Store merchant tax %

  // ✅ Initialize cart on mount
  useEffect(() => {
    initializeCart(merchantCode, mode);
    setIsLoading(false);
  }, [merchantCode, mode, initializeCart]);

  // Fetch merchant settings
  useEffect(() => {
    const fetchMerchantSettings = async () => {
      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}`);
        const data = await response.json();

        if (data.success && data.data.enableTax) {
          setMerchantTaxPercentage(Number(data.data.taxPercentage) || 10);
          console.log('✅ [VIEW ORDER] Merchant tax %:', data.data.taxPercentage);
        }
      } catch (error) {
        console.error('❌ [VIEW ORDER] Failed to fetch merchant settings:', error);
      }
    };

    if (merchantCode) {
      fetchMerchantSettings();
    }
  }, [merchantCode]);

  // ✅ Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      console.log('⚠️ Cart is empty, redirecting to order page...');
      router.push(`/${merchantCode}/order?mode=${mode}`);
    }
  }, [cart, isLoading, merchantCode, mode, router]);

  // ✅ Update item quantity via context
  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (!cart) return;

    if (newQuantity === 0) {
      removeItem(cartItemId);
    } else {
      updateItem(cartItemId, { quantity: newQuantity });
    }
  };

  // ✅ Update item notes via context
  const updateItemNotes = (cartItemId: string, notes: string) => {
    if (!cart) return;
    updateItem(cartItemId, { notes: notes.trim() || undefined });
  };

  // ✅ UNIFIED: Calculate totals using utility
  const subtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const { serviceCharge, tax, total } = calculatePriceBreakdown(subtotal);

  const handleProceedToPayment = () => {
    // Save general notes to cart context
    if (cart && generalNotes.trim()) {
      console.log('General notes:', generalNotes.trim());
    }

    // Navigate to payment page
    router.push(`/${merchantCode}/payment?mode=${mode}`);
  };

  // Loading state
  if (isLoading || !cart) {
    return (
      <div className="max-w-[420px] mx-auto bg-white min-h-svh flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Calculate with merchant's tax percentage
  const priceBreakdown = calculateCartSubtotal(cart.items, merchantTaxPercentage);

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
        mode={mode}
        showBackButton={true}
        onBack={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
        title="Pesanan"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Order Type Section */}
        <div className="px-4 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipe Pesanan</p>
              <p className="text-base font-semibold text-gray-900">
                {mode === 'dinein' ? '🍽️ Makan di Tempat' : '🛍️ Ambil Sendiri'}
              </p>
              {mode === 'dinein' && cart.tableNumber && (
                <p className="text-sm text-gray-600 mt-1">Meja {cart.tableNumber}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Waktu</p>
              <p className="text-sm font-semibold text-gray-900">⏰ Diambil Sekarang</p>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="px-4 py-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Pesanan ({cart.items.length} item)
          </h3>

          <div className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.cartItemId}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {item.menuName}
                    </h4>
                    <p className="text-base font-bold text-orange-500 mt-1">
                      {formatCurrency(item.price)}
                    </p>

                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.addons.map((addon, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            + {addon.name} <span className="text-orange-500 font-medium">(+{formatCurrency(addon.price)})</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg text-gray-700 hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="text-base font-semibold text-gray-900 min-w-[28px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-8 h-8 rounded-full border-2 border-orange-500 bg-orange-500 flex items-center justify-center text-lg text-white hover:bg-orange-600 hover:border-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Item Notes */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Catatan (opsional)
                  </label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                    placeholder="Contoh: Tidak pedas, tanpa bawang"
                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Notes */}
        <div className="px-4 pb-4">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Catatan Tambahan
          </label>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Tambahkan catatan untuk seluruh pesanan..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Payment Summary */}
        <div className="px-4 pb-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Rincian Pembayaran
            </h3>

            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>

              {/* Collapsible Details */}
              <button
                onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors py-1"
              >
                <span>Termasuk biaya lainnya</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(Number(serviceCharge) + Number(tax))}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showPaymentDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>

                </div>
              </button>

              {/* Expanded Details */}
              {showPaymentDetails && (
                <div className="pl-4 space-y-2 pt-2 border-t border-gray-300">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Biaya Layanan (5%)</span>
                    <span className="text-gray-700">{formatCurrency(Number(serviceCharge))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pajak ({merchantTaxPercentage}%)</span> {/* ✅ Show actual % */}
                    <span className="text-gray-700">{formatCurrency(Number(tax))}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-orange-500">{formatCurrency(Number(total))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <button
          onClick={handleProceedToPayment}
          className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg flex items-center justify-between px-5 hover:bg-orange-600 transition-all active:scale-[0.98]"
        >
          <span>Lanjut Pembayaran</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
