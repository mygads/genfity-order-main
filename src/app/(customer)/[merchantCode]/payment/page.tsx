'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerAuth, getTableNumber, saveCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import PaymentConfirmationModal from '@/components/modals/PaymentConfirmationModal';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import { calculateCartSubtotal, calculatePriceBreakdown } from '@/lib/utils/priceCalculator';

/**
 * Payment Page - Customer Order Payment
 * 
 * @specification FRONTEND_SPECIFICATION.md (Tasks 21-24)
 * 
 * @description
 * Payment form with customer info collection:
 * - Order mode badge (Dine-in/Takeaway)
 * - Customer form (Name*, Phone, Email)
 * - Payment instructions card
 * - Total summary display
 * - Confirmation modal before order creation
 * 
 * @flow
 * 1. User fills form → Click "Proses Pesanan"
 * 2. Confirmation modal → Click "Bayar Sekarang"
 * 3. Auto-register customer (if not logged in)
 * 4. Create order via POST /api/public/orders
 * 5. Clear cart → Navigate to order summary
 * 
 * @security
 * - JWT token from customer-login endpoint
 * - Bearer auth for order creation
 * - Guest email fallback: guest_[timestamp]@genfity.com
 */
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;

  const { cart, initializeCart, clearCart: clearCartContext } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  // ✅ NEW: State untuk table number dari localStorage
  const [tableNumber, setTableNumber] = useState<string>('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(10); // ✅ NEW

  const auth = getCustomerAuth();

  // Initialize cart on mount
  useEffect(() => {
    initializeCart(merchantCode, mode);

    const cartKey = `cart_${merchantCode}_${mode}`;
    const storedCart = localStorage.getItem(cartKey);
    console.log('📦 Payment page - Cart from localStorage:', JSON.parse(storedCart || '{}'));

    // ✅ Load table number dari localStorage
    const tableData = getTableNumber(merchantCode);
    console.log('📍 Payment page - Table number from localStorage:', tableData);

    if (tableData && tableData.tableNumber) {
      setTableNumber(tableData.tableNumber);
    }
  }, [merchantCode, mode, initializeCart]);

  // Fetch merchant settings
  useEffect(() => {
    const fetchMerchantSettings = async () => {
      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}`);
        const data = await response.json();

        if (data.success && data.data.enableTax) {
          setMerchantTaxPercentage(Number(data.data.taxPercentage) || 10);
          console.log('✅ [PAYMENT] Merchant tax %:', data.data.taxPercentage);
        }
      } catch (error) {
        console.error('❌ [PAYMENT] Failed to fetch merchant settings:', error);
      }
    };

    if (merchantCode) {
      fetchMerchantSettings();
    }
  }, [merchantCode]);

  /**
   * ✅ FIXED: Only redirect if NOT processing order
   * 
   * @description
   * Prevents redirect loop during order creation.
   * The flag `isProcessingOrder` is set to true when "Proses Pesanan" is clicked,
   * and remains true until navigation to order-summary-cash completes.
   * 
   * @specification Emergency Troubleshooting - copilot-instructions.md
   */
  useEffect(() => {
    // ✅ Skip redirect if currently processing order
    if (isProcessingOrder) {
      console.log('🔄 Order processing in progress, skipping redirect check');
      return;
    }

    if (cart !== null && (!cart || cart.items.length === 0)) {
      console.log('⚠️ Cart is empty, redirecting to order page...');
      router.push(`/${merchantCode}/order?mode=${mode}`);
    }
  }, [cart, merchantCode, mode, router, isProcessingOrder]);

  // Auto-fill form if authenticated
  useEffect(() => {
    if (auth) {
      setName(auth.user.name);
      setEmail(auth.user.email);
      setPhone(auth.user.phone || '');
    }
  }, [auth]);

  /**
   * Form submission handler
   * 
   * @description
   * Validates form before showing confirmation modal:
   * - Name is required
   * - Table number required for dine-in (already in cart)
   * 
   * @specification FRONTEND_SPECIFICATION.md - Payment Page Validation
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    // Validate required fields
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }

    // ✅ FIXED: Validasi table number dari state (bukan cart)
    if (mode === 'dinein' && !tableNumber) {
      setError('Nomor meja wajib diisi untuk pesanan dine-in');
      return;
    }

    setError('');
    setShowConfirmModal(true);
  };

  /**
   * ✅ FIXED: Clear cart AFTER navigation using setTimeout
   * 
   * @flow
   * 1. Set isProcessingOrder flag (prevents redirect)
   * 2. Auto-register customer (if needed)
   * 3. Create order via API
   * 4. Clear localStorage (mode + cart cache)
   * 5. Navigate to order-summary-cash
   * 6. Clear cart context AFTER navigation (100ms delay)
   * 
   * @security
   * - JWT Bearer token authentication
   * - Guest email fallback
   * 
   * @specification STEP_06_BUSINESS_FLOWS.txt - Order creation
   */
  const handleConfirmPayment = async () => {
    if (!cart) return;

    setIsLoading(true);
    setError('');
    setShowConfirmModal(false);
    setIsProcessingOrder(true);

    try {
      // ========================================
      // STEP 1: Customer Authentication
      // ========================================
      let accessToken = auth?.accessToken;

      if (!auth) {
        console.log('🔐 Registering guest customer...');

        const authResponse = await fetch('/api/public/auth/customer-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim() || `guest_${Date.now()}@genfity.com`,
            name: name.trim(),
            phone: phone.trim() || undefined,
          }),
        });

        const authData = await authResponse.json();
        if (!authResponse.ok) {
          throw new Error(authData.message || 'Login gagal');
        }

        saveCustomerAuth({
          accessToken: authData.data.accessToken,
          user: authData.data.user,
          expiresAt: authData.data.expiresAt,
        });

        accessToken = authData.data.accessToken;
        console.log('✅ Customer registered:', authData.data.user.email);
      }

      // ========================================
      // STEP 2: Prepare Order Payload
      // ========================================
      const orderType = mode === 'dinein' ? 'DINE_IN' : 'TAKEAWAY';
      // ✅ FIXED: Gunakan tableNumber dari state (bukan cart)
      const orderTableNumber = mode === 'dinein' ? tableNumber : null;

      const orderPayload = {
        merchantCode: cart.merchantCode,
        orderType,
        tableNumber: orderTableNumber, // ✅ Dari localStorage
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        items: cart.items.map((item) => ({
          menuId: item.menuId.toString(),
          quantity: item.quantity,
          notes: item.notes || undefined,
          addons: (item.addons || []).map((addon) => ({
            addonItemId: addon.id.toString(),
            quantity: 1,
          })),
        })),
      };

      // ✅ Debug logging BEFORE API call
      console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

      // ========================================
      // STEP 3: Create Order
      // ========================================
      const orderResponse = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();

      // ✅ Log response for debugging
      console.log('📥 Order Response:', {
        status: orderResponse.status,
        ok: orderResponse.ok,
        data: orderData,
      });

      if (!orderResponse.ok) {
        console.error('❌ Order creation failed:', orderData);
        throw new Error(orderData.message || 'Gagal membuat pesanan');
      }

      console.log('✅ Order created:', orderData.data.orderNumber);

      // ========================================
      // STEP 4: Clear localStorage ONLY (not cart context yet)
      // ========================================

      // ✅ 2. Clear mode cache
      localStorage.removeItem(`mode_${merchantCode}`);
      console.log('🗑️ Mode cache cleared:', `mode_${merchantCode}`);

      // ✅ 3. Clear cart localStorage
      localStorage.removeItem(`cart_${merchantCode}_${mode}`);
      console.log('🗑️ Cart cache cleared:', `cart_${merchantCode}_${mode}`);

      // ✅ 4. Verify cleanup
      const modeCheck = localStorage.getItem(`mode_${merchantCode}`);
      const cartCheck = localStorage.getItem(`cart_${merchantCode}_${mode}`);
      console.log('🔍 Cleanup verification:', {
        modeCache: modeCheck === null ? 'CLEARED ✅' : `STILL EXISTS: ${modeCheck}`,
        cartCache: cartCheck === null ? 'CLEARED ✅' : `STILL EXISTS: ${cartCheck}`,
      });

      // ========================================
      // STEP 5: Navigate FIRST, then clear cart context
      // ========================================

      // ✅ 5. Navigate to summary
      router.push(
        `/${merchantCode}/order-summary-cash?orderNumber=${orderData.data.orderNumber}&mode=${mode}`
      );

      // ✅ 6. Clear cart context AFTER navigation (delayed)
      setTimeout(() => {
        clearCartContext();
        console.log('🗑️ Cart context cleared (delayed)');
      }, 100);

    } catch (err) {
      console.error('❌ Payment error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsLoading(false);
      setIsProcessingOrder(false);
    }
  };

  // ✅ UNIFIED: Calculate order total using utility
  const subtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const { total } = calculatePriceBreakdown(subtotal);

  // ✅ FIXED: Calculate with merchant's tax percentage
  const priceBreakdown = cart ? calculateCartSubtotal(cart.items, merchantTaxPercentage) : { subtotal: 0, serviceCharge: 0, tax: 0, total: 0 };

  // Loading state while cart initializes
  if (cart === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Fixed Header - 56px */}
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-100">
        <Link href={`/${merchantCode}/view-order?mode=${mode}`} className="flex items-center gap-2 text-[#1A1A1A]">
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">Kembali</span>
        </Link>

        <h1 className="text-base font-bold text-[#1A1A1A]">Pembayaran</h1>

        <div className="w-16" />
      </header>

      <main className="px-4 py-4">
        {/* Order Mode Badge */}
        <div className="mb-4 p-3 bg-[#FFF5F0] border border-[#FF6B35] rounded-lg flex items-center gap-3">
          <span className="text-2xl">{mode === 'dinein' ? '🍽️' : '🛍️'}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {mode === 'dinein' ? 'Makan di Tempat' : 'Ambil Sendiri'}
            </p>
            {/* ✅ FIXED: Gunakan tableNumber dari state */}
            {tableNumber && mode === 'dinein' && (
              <p className="text-xs text-[#666666]">Meja #{tableNumber}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Customer Info Form */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">
            Informasi Pemesan
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* ✅ FIXED: Table Number Input menggunakan state */}
            {mode === 'dinein' && (
              <div>
                <label htmlFor="tableNumber" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Nomor Meja <span className="text-red-500">*</span>
                </label>
                <input
                  id="tableNumber"
                  type="text"
                  disabled
                  value={tableNumber ? `Meja #${tableNumber}` : 'Belum dipilih'}
                  className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#666666] bg-[#F9F9F9] cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-[#999999]">
                  📍 Nomor meja dipilih saat memulai pesanan
                </p>
              </div>
            )}

            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: Muhammad Yoga Adi Saputra"
              />
            </div>

            {/* Phone Input */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Nomor Ponsel
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: 0896-6817-6764"
              />
              <p className="mt-1 text-xs text-[#999999]">Opsional - untuk info promo</p>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: m.yogaadi1234@gmail.com"
              />
              <p className="mt-1 text-xs text-[#999999]">Opsional - untuk struk digital</p>
            </div>
          </form>
        </div>

        {/* Payment Instructions Card */}
        <div className="mb-4 p-4 bg-[#FFF5F0] rounded-lg border border-[#FF6B35]">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">
                Cara Pembayaran
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Klik &quot;Proses Pesanan&quot; lalu tunjukkan kode QR ke kasir untuk pembayaran.
              </p>
            </div>
          </div>
        </div>

        {/* Total Summary Card */}
        <div className="mb-4 p-4 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Total Pembayaran</p>
              <p className="text-xs text-[#999999] mt-0.5">{cart?.items.length || 0} item</p>
            </div>
            <span className="text-xl font-bold text-[#FF6B35]">
              {formatCurrency(Number(total))}
            </span>
          </div>
        </div>

        {/* Expanded Details */}
        {showPaymentDetails && (
          <div className="pl-4 space-y-2 pt-2 border-t border-gray-300">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Biaya Layanan (5%)</span>
              <span className="text-gray-700">{formatCurrency(Number(priceBreakdown.serviceCharge))}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Pajak ({merchantTaxPercentage}%)</span> {/* ✅ Show actual % */}
              <span className="text-gray-700">{formatCurrency(Number(priceBreakdown.tax))}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={isLoading}
          className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] disabled:bg-[#E0E0E0] disabled:text-[#999999] disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isLoading ? 'Memproses...' : 'Proses Pesanan'}
        </button>
      </main>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
        totalAmount={Number(priceBreakdown.total)}
        breakdown={{
          subtotal: Number(priceBreakdown.subtotal),
          serviceCharge: Number(priceBreakdown.serviceCharge),
          tax: Number(priceBreakdown.tax),
        }}
      />
    </div>
  );
}
