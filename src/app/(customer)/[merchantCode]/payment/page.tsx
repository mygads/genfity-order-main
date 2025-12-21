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
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  // ✅ NEW: State untuk table number dan merchant data
  const [tableNumber, setTableNumber] = useState<string>('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(0);
  const [merchantServiceChargePercent, setMerchantServiceChargePercent] = useState(0);
  const [merchantPackagingFee, setMerchantPackagingFee] = useState(0);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');

  const auth = getCustomerAuth();

  /**
   * ✅ Format currency using merchant's currency
   * Uses A$ prefix for Australian Dollar
   */
  const formatCurrency = (amount: number): string => {
    // Special handling for AUD to show A$ prefix
    if (merchantCurrency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }

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
    <>
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

      <main className="flex-1 overflow-y-auto  py-4 pb-6">

        {/* Error Message */}
        {error && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
          </div>
        )}

        <section className="pb-3">
          <div
            className="flex items-center justify-between mt-4 mx-4 relative"
            style={{
              height: '36px',
              fontSize: '0.8rem',
              padding: '8px 16px',
              border: '1px solid #f05a28',
              borderRadius: '8px',
              backgroundColor: 'rgba(240, 90, 40, 0.1)'
            }}
          >
            <span className="text-gray-700">Order Type</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {mode === 'dinein' ? 'Dine In' : 'Takeaway'}
              </span>
              <svg
                style={{ width: '18px', height: '18px', color: '#212529' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                {/* Hollow Circle */}
                <circle cx="12" cy="12" r="10" strokeWidth="2" fill="none" />
                {/* Solid Checkmark */}
                <path
                  d="M8 12l3 3 5-6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* Customer Info Form (ESB Exact Match) */}
        <div className="p-4 pb-0">
          <div className="flex items-center mb-2">
            <span
              className="font-semibold"
              style={{ fontSize: '16px', color: '#101828' }}
            >
              Customer Information
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col">
            {/* Full Name */}
            <label
              htmlFor="name"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              Full Name<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!(auth && auth.user.name)}
                className={`w-full h-12 pl-11 pr-4 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] ${(auth && auth.user.name) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                style={{ borderColor: '#d0d5dd', color: '#101828' }}
                placeholder="Full Name"
              />
            </div>

            {/* Phone Number */}
            <label
              htmlFor="phone"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              Phone Number (for upcoming promos)
            </label>
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                minLength={9}
                maxLength={18}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!(auth && auth.user.phone)}
                className={`w-full h-12 pl-11 pr-4 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] ${(auth && auth.user.phone) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                style={{ borderColor: '#d0d5dd', color: '#101828' }}
                placeholder="Phone Number"
              />
            </div>

            {/* Email */}
            <label
              htmlFor="email"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              Send Receipt to Email<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="email"
                type="email"
                required
                maxLength={50}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!(auth && auth.user.email)}
                className={`w-full h-12 pl-11 pr-4 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] ${(auth && auth.user.email) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                style={{ borderColor: '#d0d5dd', color: '#101828' }}
                placeholder="Email"
              />
            </div>

            {/* Table Number (Dine-in only) */}
            {mode === 'dinein' && (
              <>
                <label
                  htmlFor="tableNumber"
                  className="mb-1"
                  style={{ fontSize: '14px', color: '#212529' }}
                >
                  Table Number<span className="text-red-500">*</span>
                </label>
                <div className="relative mb-3">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <input
                    id="tableNumber"
                    type="text"
                    required
                    maxLength={50}
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]"
                    style={{ borderColor: '#d0d5dd', color: '#101828' }}
                    placeholder="Table Number"
                  />
                </div>
              </>
            )}
          </form>
        </div>

        {/* Pay at Cashier (ESB Exact Match) */}
        <div
          className="flex flex-col items-center text-center"
          style={{
            padding: '32px',
            gap: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            letterSpacing: '0.25px',
            lineHeight: '20px',
            color: '#212529'
          }}
        >
          <div>
            <img
              src="/images/cashier.png"
              alt="Pay at Cashier"
              style={{ maxWidth: '300px', height: 'auto' }}
            />
          </div>
          <div>
            <span>Click <b>&apos;Pay at Cashier&apos;</b> and show QR code to the cashier.</span>
          </div>
        </div>
      </main>

      {/* ===== FIXED BOTTOM PAYMENT BAR (ESB Exact Match) ===== */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white z-10"
        style={{
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          borderRadius: '16px 16px 0 0',
          maxWidth: '500px',
          margin: '0 auto',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          letterSpacing: '0.25px',
          lineHeight: '20px'
        }}
      >
        {/* Detail Payment Section (shown when expanded) */}
        {showPaymentDetails && (
          <div className="flex flex-col px-4 pt-4 mt-2 mx-2">
            {/* Tax Row */}
            {taxAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="flex-grow">Incl. Tax</div>
                <div>{formatCurrency(taxAmount)}</div>
              </div>
            )}
            {/* Service Charge Row */}
            {serviceChargeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="flex-grow">Service Charge</div>
                <div>{formatCurrency(serviceChargeAmount)}</div>
              </div>
            )}
            {/* Packaging Fee Row */}
            {packagingFeeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="flex-grow">Packaging Fee</div>
                <div>{formatCurrency(packagingFeeAmount)}</div>
              </div>
            )}
          </div>
        )}

        {/* Payment Total + Button */}
        <div className="flex pt-3 px-4 pb-2 m-4 items-center">
          {/* Left: Payment Total */}
          <div className="flex flex-col w-1/2">
            <div
              className="flex items-center cursor-pointer"
              style={{ lineHeight: 1, color: '#212529' }}
              onClick={() => setShowPaymentDetails(!showPaymentDetails)}
            >
              Payment Total
              <svg
                style={{
                  width: '20px',
                  height: '20px',
                  marginLeft: '4px',
                  transform: showPaymentDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </div>
            <div
              className="flex items-center"
              style={{ fontWeight: 'bold', fontSize: '20px', lineHeight: 1.5, color: '#101828' }}
            >
              {formatCurrency(totalPayment)}
            </div>
          </div>

          {/* Right: Pay at Cashier Button */}
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isLoading}
            className="w-1/2 py-3 text-white font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#f05a28',
              fontSize: '14px'
            }}
          >
            {isLoading ? 'Processing...' : 'Pay at Cashier'}
          </button>
        </div>
      </div>

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
    </>
  );
}
