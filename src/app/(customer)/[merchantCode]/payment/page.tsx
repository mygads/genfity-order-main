'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getCustomerAuth, getTableNumber, saveCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import PaymentConfirmationModal from '@/components/modals/PaymentConfirmationModal';
import { useCart } from '@/context/CartContext';
import { calculateCartSubtotal } from '@/lib/utils/priceCalculator';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

/**
 * Payment Page - Customer Order Payment
 * 
 * @specification FRONTEND_SPECIFICATION.md (Tasks 21-24)
 * 
 * @description
 * Payment form with customer info collection:
 * - Order mode badge (Dine-in/Takeaway)
 * - Customer form (Name*, Email*, Phone, Table Number*)
 * - Payment instructions card
 * - Total summary display
 * - Confirmation modal before order creation
 * 
 * @flow
 * 1. User fills form → Click "Process Order"
 * 2. Validation: Email required + format check
 * 3. Confirmation modal → Click "Pay Now"
 * 4. Create order via POST /api/public/orders (API auto-registers customer)
 * 5. Auto-login guest customer (get JWT token for order tracking)
 * 6. Clear cart → Navigate to order summary
 * 
 * @security
 * - Email validation (required + format)
 * - JWT token from customer-login endpoint
 * - Optional Bearer auth for order creation
 * - Auto-login after order for guest users
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

  // ✅ NEW: State untuk table number dan merchant data
  const [tableNumber, setTableNumber] = useState<string>('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(0);
  const [merchantServiceChargePercent, setMerchantServiceChargePercent] = useState(0);
  const [merchantPackagingFee, setMerchantPackagingFee] = useState(0);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');

  const auth = getCustomerAuth();

  /**
   * ✅ Format currency using merchant's currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantCurrency,
    }).format(amount);
  };

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

        if (data.success) {
          // ✅ Set tax percentage
          if (data.data.enableTax) {
            setMerchantTaxPercentage(Number(data.data.taxPercentage) || 0);
            console.log('✅ [PAYMENT] Merchant tax %:', data.data.taxPercentage);
          }
          // ✅ Set service charge
          if (data.data.enableServiceCharge) {
            setMerchantServiceChargePercent(Number(data.data.serviceChargePercent) || 0);
            console.log('✅ [PAYMENT] Service charge %:', data.data.serviceChargePercent);
          }
          // ✅ Set packaging fee (for takeaway)
          if (data.data.enablePackagingFee && mode === 'takeaway') {
            setMerchantPackagingFee(Number(data.data.packagingFeeAmount) || 0);
            console.log('✅ [PAYMENT] Packaging fee:', data.data.packagingFeeAmount);
          }
          // ✅ Set currency
          setMerchantCurrency(data.data.currency || 'AUD');
          console.log('✅ [PAYMENT] Merchant currency:', data.data.currency);
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
      setError('Full name is required');
      return;
    }

    // ✅ NEW: Validate email is required for all users
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // ✅ FIXED: Validate table number from state (not cart)
    if (mode === 'dinein' && !tableNumber) {
      setError('Table number is required for dine-in orders');
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
   * 2. Create order via API (API auto-registers customer if needed)
   * 3. Auto-login guest customer (if not logged in) to get JWT token
   * 4. Clear localStorage (mode + cart cache)
   * 5. Navigate to order-summary-cash
   * 6. Clear cart context AFTER navigation (100ms delay)
   * 
   * @security
   * - JWT Bearer token authentication (optional for guests)
   * - Auto-login after order for guest tracking
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
      // STEP 1: Get Access Token (if logged in)
      // ========================================
      const accessToken = auth?.accessToken;

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
          // Aggregate duplicate addon entries into counts (cart stores duplicates to represent qty)
          addons: Object.values((item.addons || []).reduce((acc: Record<string, any>, addon: any) => {
            const key = addon.id.toString();
            if (!acc[key]) acc[key] = { addonItemId: key, quantity: 0 };
            acc[key].quantity += 1;
            return acc;
          }, {} as Record<string, any>)).map((s: any) => ({ addonItemId: s.addonItemId, quantity: s.quantity })),
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
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }), // ✅ Optional auth header
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
        throw new Error(orderData.message || 'Failed to create order');
      }

      console.log('✅ Order created:', orderData.data.orderNumber);

      // ========================================
      // STEP 4: Auto-login guest customer (if not logged in)
      // ========================================

      /**
       * ✅ GUEST AUTO-LOGIN AFTER ORDER
       * 
       * @description
       * If user is not logged in (guest), auto-login them after successful order
       * so they can view order history and track their order.
       * 
       * @flow
       * 1. Check if user is NOT logged in (no accessToken)
       * 2. Call customer-login API with email, name, phone
       * 3. Save auth data to localStorage
       * 4. User can now access order history
       */
      if (!accessToken) {
        console.log('🔐 Auto-login guest customer after order...');

        try {
          const loginResponse = await fetch('/api/public/auth/customer-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              name: name.trim(),
              phone: phone.trim() || undefined,
            }),
          });

          if (loginResponse.ok) {
            const loginData = await loginResponse.json();

            if (loginData.success) {
              // ✅ Save auth data to localStorage
              saveCustomerAuth({
                accessToken: loginData.data.accessToken,
                user: loginData.data.user,
                expiresAt: loginData.data.expiresAt,
              });

              console.log('✅ Guest customer logged in:', loginData.data.user.email);
            }
          } else {
            console.warn('⚠️ Guest auto-login failed (non-critical)');
          }
        } catch (loginError) {
          // Non-critical error - order is already created
          console.warn('⚠️ Guest auto-login error (non-critical):', loginError);
        }
      }

      // ========================================
      // STEP 5: Clear localStorage ONLY (not cart context yet)
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
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setIsProcessingOrder(false);
    }
  };

  // ✅ FIXED: Calculate with all fees
  const cartSubtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const taxAmount = cartSubtotal * (merchantTaxPercentage / 100);
  const serviceChargeAmount = cartSubtotal * (merchantServiceChargePercent / 100);
  const packagingFeeAmount = merchantPackagingFee;
  const totalPayment = cartSubtotal + taxAmount + serviceChargeAmount + packagingFeeAmount;

  // Loading state while cart initializes
  if (cart === null) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING_CART} />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Back Button */}
          <button
            onClick={() => router.push(`/${merchantCode}/view-order?mode=${mode}`)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Payment</h1>

          {/* Placeholder for symmetry */}
          <div className="w-10" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-6">



        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Customer Info Form */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1A1A1A] dark:text-white mb-3">
            Customer Information
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* Name Input with Icon */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] dark:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!(auth && auth.user.name)}
                className={`w-full h-12 pl-11 pr-4 border border-[#E0E0E0] dark:border-gray-700 rounded-lg text-sm text-[#1A1A1A] dark:text-white placeholder-[#999999] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] ${(auth && auth.user.name) ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'dark:bg-gray-800'}`}
                placeholder="Full Name *"
              />
            </div>

            {/* Phone Input with Icon */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] dark:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!(auth && auth.user.phone)}
                className={`w-full h-12 pl-11 pr-4 border border-[#E0E0E0] dark:border-gray-700 rounded-lg text-sm text-[#1A1A1A] dark:text-white placeholder-[#999999] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] ${(auth && auth.user.phone) ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'dark:bg-gray-800'}`}
                placeholder="Phone Number (optional)"
              />
            </div>

            {/* Email Input with Icon */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] dark:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!(auth && auth.user.email)}
                className={`w-full h-12 pl-11 pr-4 border border-[#E0E0E0] dark:border-gray-700 rounded-lg text-sm text-[#1A1A1A] dark:text-white placeholder-[#999999] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] ${(auth && auth.user.email) ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'dark:bg-gray-800'}`}
                placeholder="Email *"
              />
            </div>

            {/* ✅ EDITABLE Table Number Input with Icon */}
            {mode === 'dinein' && (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] dark:text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  id="tableNumber"
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 border border-[#E0E0E0] dark:border-gray-700 rounded-lg text-sm text-[#1A1A1A] dark:text-white dark:bg-gray-800 placeholder-[#999999] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  placeholder="Table Number *"
                />
              </div>
            )}
          </form>
        </div>

        {/* Payment Instructions Card */}
        <div className="mb-4 p-4 bg-[#FFF5F0] dark:bg-orange-900/20 rounded-lg border border-[#FF6B35]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 bg-[#FF6B35] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-white mb-1">
                Pay at Cashier
              </h3>
              <p className="text-xs text-[#666666] dark:text-gray-400 leading-relaxed">
                Click &quot;Process Order&quot; then show the QR code to the cashier for payment.
              </p>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Order Items Summary */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Order Items
          </h2>
          <div className="space-y-3">
            {cart?.items.map((item, index) => {
              // Build aggregated addon list — cart stores addons as duplicated entries
              const addonAggregatedMap = (item.addons || []).reduce((acc: Record<string, any>, addon) => {
                const key = addon.id.toString();
                if (!acc[key]) acc[key] = { ...addon, quantity: 0 };
                acc[key].quantity += 1;
                return acc;
              }, {} as Record<string, any>);

              const addonAggregated = Object.values(addonAggregatedMap);

              // Calculate addon total using aggregated quantities
              const addonTotal = addonAggregated.reduce((sum, addon) => {
                const addonPrice = typeof addon.price === 'number' ? addon.price : 0;
                const addonQty = addon.quantity || 1;
                return sum + addonPrice * addonQty;
              }, 0);

              const itemSubtotal = (item.quantity * item.price) + addonTotal;

              return (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.quantity}x {item.menuName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-orange-500">
                      {formatCurrency(itemSubtotal)}
                    </p>
                  </div>

                  {/* Display Addons */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="ml-4 space-y-1 mb-2">
                      {addonAggregated.map((addon, addonIndex) => {
                        const addonPrice = typeof addon.price === 'number' ? addon.price : 0;
                        const addonQty = addon.quantity || 1;
                        const addonSubtotal = addonPrice * addonQty;

                        return (
                          <div key={addonIndex} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              + {addon.name}
                              {addonQty > 1 && ` x${addonQty}`}
                              {addonPrice > 0 && ` (+${formatCurrency(addonPrice)})`}
                            </span>
                            {addonSubtotal > 0 && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatCurrency(addonSubtotal)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Item Notes */}
                  {item.notes && (
                    <div className="ml-4 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                      <span>📝</span>
                      <span>{item.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Summary Card */}
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-[#E0E0E0] dark:border-gray-700 space-y-2">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666] dark:text-gray-400">Subtotal ({cart?.items.length || 0} item{cart && cart.items.length !== 1 ? 's' : ''})</span>
            <span className="text-sm text-[#1A1A1A] dark:text-white font-medium">
              {formatCurrency(cartSubtotal)}
            </span>
          </div>

          {/* Tax */}
          {taxAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666] dark:text-gray-400">Tax ({merchantTaxPercentage}%)</span>
              <span className="text-sm text-[#1A1A1A] dark:text-white font-medium">
                {formatCurrency(taxAmount)}
              </span>
            </div>
          )}

          {/* Service Charge */}
          {serviceChargeAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666] dark:text-gray-400">Service Charge ({merchantServiceChargePercent}%)</span>
              <span className="text-sm text-[#1A1A1A] dark:text-white font-medium">
                {formatCurrency(serviceChargeAmount)}
              </span>
            </div>
          )}

          {/* Packaging Fee */}
          {packagingFeeAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666] dark:text-gray-400">Packaging Fee</span>
              <span className="text-sm text-[#1A1A1A] dark:text-white font-medium">
                {formatCurrency(packagingFeeAmount)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E0E0E0] dark:border-gray-700">
            <span className="text-base font-semibold text-[#1A1A1A] dark:text-white">Total Payment</span>
            <span className="text-xl font-bold text-[#FF6B35]">
              {formatCurrency(totalPayment)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={isLoading}
          className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] disabled:bg-[#E0E0E0] dark:disabled:bg-gray-700 disabled:text-[#999999] dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isLoading ? 'Processing...' : 'Process Order'}
        </button>
      </main>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
        totalAmount={totalPayment}
        currency={merchantCurrency}
        breakdown={{
          subtotal: cartSubtotal,
          serviceCharge: serviceChargeAmount,
          tax: taxAmount,
        }}
      />
    </div>
  );
}
