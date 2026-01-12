'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getCustomerAuth, getTableNumber, saveRecentOrder } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import PaymentConfirmationModal from '@/components/modals/PaymentConfirmationModal';
import DeliveryAddressPicker from '@/components/delivery/DeliveryAddressPicker';
import DeliveryFeePreview from '@/components/delivery/DeliveryFeePreview';
import { useCart } from '@/context/CartContext';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import { calculateCartSubtotal } from '@/lib/utils/priceCalculator';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaArrowLeft, FaCheckCircle, FaChevronDown, FaEnvelope, FaExclamationCircle, FaPhone, FaTable, FaUser } from 'react-icons/fa';

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
  const { t, locale } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  const _isGroupOrderCheckout = searchParams.get('groupOrder') === 'true';

  const { cart, initializeCart, clearCart: clearCartContext } = useCart();
  const {
    submitOrder: _submitGroupOrder,
    clearGroupOrderState: _clearGroupOrderState,
    session: _groupSession,
    splitBill: _splitBill
  } = useGroupOrder();

  // ✅ Use CustomerData Context for instant merchant info access
  const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [apiError, setApiError] = useState(''); // For API submission errors

  // ✅ NEW: Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    tableNumber?: string;
    deliveryAddress?: string;
  }>({});

  // ✅ NEW: Refs for focusing invalid fields
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const tableNumberInputRef = useRef<HTMLInputElement>(null);

  // ✅ NEW: State untuk table number dan merchant data
  const [tableNumber, setTableNumber] = useState<string>('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(0);
  const [merchantServiceChargePercent, setMerchantServiceChargePercent] = useState(0);
  const [merchantPackagingFee, setMerchantPackagingFee] = useState(0);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');

  // ✅ NEW: Delivery-specific state
  const [deliveryUnit, setDeliveryUnit] = useState('');
  const [deliveryBuildingName, setDeliveryBuildingName] = useState('');
  const [deliveryBuildingNumber, setDeliveryBuildingNumber] = useState('');
  const [deliveryFloor, setDeliveryFloor] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAddressParts, setDeliveryAddressParts] = useState<{
    streetLine?: string | null;
    neighbourhood?: string | null;
    suburb?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null>(null);
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryFeeError, setDeliveryFeeError] = useState('');
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);

  const auth = getCustomerAuth();

  const formatCurrency = (amount: number): string => formatCurrencyUtil(amount, merchantCurrency, locale);

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

  // ✅ Initialize context for this merchant
  useEffect(() => {
    initializeData(merchantCode);
  }, [merchantCode, initializeData]);

  // ✅ Use Context data when available (instant navigation)
  useEffect(() => {
    if (isInitialized && contextMerchantInfo) {
      console.log('✅ [PAYMENT] Using CustomerData Context - instant load');

      if (contextMerchantInfo.enableTax) {
        setMerchantTaxPercentage(Number(contextMerchantInfo.taxPercentage) || 0);
      }
      if (contextMerchantInfo.enableServiceCharge) {
        setMerchantServiceChargePercent(Number(contextMerchantInfo.serviceChargePercent) || 0);
      }
      if (contextMerchantInfo.enablePackagingFee && mode === 'takeaway') {
        setMerchantPackagingFee(Number(contextMerchantInfo.packagingFeeAmount) || 0);
      }
      setMerchantCurrency(contextMerchantInfo.currency || 'AUD');

      // ✅ NEW: Check if delivery is available
      const isDeliveryEnabled = (contextMerchantInfo as any).isDeliveryEnabled === true;
      setIsDeliveryAvailable(isDeliveryEnabled);
    }
  }, [isInitialized, contextMerchantInfo, mode]);

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
      setName(auth.customer.name);
      setEmail(auth.customer.email);
      setPhone(auth.customer.phone || '');
    }
  }, [auth]);

  /**
   * Form submission handler
   * 
   * @description
   * Validates form before showing confirmation modal:
   * - Name is required
   * - Table number required for dine-in (already in cart)
   * - Delivery address + coordinates required for delivery
   * 
   * @specification FRONTEND_SPECIFICATION.md - Payment Page Validation
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    const errors: typeof fieldErrors = {};
    let firstInvalidRef: React.RefObject<HTMLInputElement | null> | null = null;

    // Validate required fields with inline error
    if (!name.trim()) {
      errors.name = t('customer.payment.error.nameRequired');
      if (!firstInvalidRef) firstInvalidRef = nameInputRef;
    }

    // Validate phone is required
    if (!phone.trim()) {
      errors.phone = t('customer.payment.error.phoneRequired');
      if (!firstInvalidRef) firstInvalidRef = phoneInputRef;
    }

    // Validate email is required
    if (!email.trim()) {
      errors.email = t('customer.payment.error.emailRequired');
      if (!firstInvalidRef) firstInvalidRef = emailInputRef;
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = t('customer.payment.error.invalidEmail');
        if (!firstInvalidRef) firstInvalidRef = emailInputRef;
      }
    }

    // Validate table number for dine-in
    if (mode === 'dinein' && !tableNumber.trim()) {
      errors.tableNumber = t('customer.payment.error.tableRequired');
      if (!firstInvalidRef) firstInvalidRef = tableNumberInputRef;
    }

    // ✅ NEW: Validate delivery address and coordinates for delivery mode
    if (mode === 'delivery') {
      if (!deliveryAddress.trim()) {
        errors.deliveryAddress = t('customer.payment.error.deliveryAddressRequired') || 'Delivery address is required';
        if (!firstInvalidRef) firstInvalidRef = null; // No ref for delivery address yet
      }
      if (deliveryLatitude === null || deliveryLongitude === null) {
        errors.deliveryAddress = t('customer.payment.error.deliveryLocationRequired') || 'Please pick delivery location on map';
        if (!firstInvalidRef) firstInvalidRef = null;
      }
    }

    // If there are errors, set them and focus first invalid field
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (firstInvalidRef?.current) {
        firstInvalidRef.current.focus();
        firstInvalidRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Clear errors and show confirmation modal
    setFieldErrors({});
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
    setApiError('');
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
      const orderType = mode === 'dinein' ? 'DINE_IN' : mode === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY';
      // ✅ FIXED: Gunakan tableNumber dari state (bukan cart)
      const orderTableNumber = mode === 'dinein' ? tableNumber : null;

      const orderPayload: any = {
        merchantCode: cart.merchantCode,
        orderType,
        tableNumber: orderTableNumber, // ✅ Dari localStorage
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        paymentMethod: mode === 'delivery' ? 'CASH_ON_DELIVERY' : 'CASH_ON_COUNTER',
        items: cart.items.map((item) => ({
          menuId: item.menuId.toString(),
          quantity: item.quantity,
          notes: item.notes || undefined,
          // Aggregate duplicate addon entries into counts (cart stores duplicates to represent qty)
          addons: Object.values((item.addons || []).reduce((acc: Record<string, { addonItemId: string; quantity: number }>, addon: { id: string | number }) => {
            const key = addon.id.toString();
            if (!acc[key]) acc[key] = { addonItemId: key, quantity: 0 };
            acc[key].quantity += 1;
            return acc;
          }, {} as Record<string, { addonItemId: string; quantity: number }>)).map((s) => ({ addonItemId: s.addonItemId, quantity: s.quantity })),
        })),
      };

      // ✅ NEW: Add delivery fields if delivery mode
      if (mode === 'delivery') {
        orderPayload.deliveryUnit = deliveryUnit.trim() || undefined;
        orderPayload.deliveryAddress = deliveryAddress.trim();
        orderPayload.deliveryLatitude = deliveryLatitude;
        orderPayload.deliveryLongitude = deliveryLongitude;

        orderPayload.deliveryBuildingName = deliveryBuildingName.trim() || undefined;
        orderPayload.deliveryBuildingNumber = deliveryBuildingNumber.trim() || undefined;
        orderPayload.deliveryFloor = deliveryFloor.trim() || undefined;

        const parts = deliveryAddressParts;
        if (parts) {
          orderPayload.deliveryStreetLine = parts.streetLine || undefined;
          orderPayload.deliverySuburb = parts.suburb || undefined;
          orderPayload.deliveryCity = parts.city || undefined;
          orderPayload.deliveryState = parts.state || undefined;
          orderPayload.deliveryPostcode = parts.postcode || undefined;
          orderPayload.deliveryCountry = parts.country || undefined;
        }

        const instructions = deliveryInstructions.trim();
        if (instructions) {
          orderPayload.deliveryInstructions = instructions;
        }
      }

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

      const trackingToken = typeof orderData?.data?.trackingToken === 'string' ? orderData.data.trackingToken : null;

      // ========================================
      // STEP 4: Save order for push notification tracking (24h expiry)
      // ========================================
      saveRecentOrder(orderData.data.orderNumber, merchantCode);
      console.log('📱 Order saved for push notifications:', orderData.data.orderNumber);

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
        `/${merchantCode}/order-summary-cash?orderNumber=${encodeURIComponent(orderData.data.orderNumber)}&mode=${encodeURIComponent(mode)}${trackingToken ? `&token=${encodeURIComponent(trackingToken)}` : ''}`
      );

      // ✅ 6. Clear cart context AFTER navigation (delayed)
      setTimeout(() => {
        clearCartContext();
        console.log('🗑️ Cart context cleared (delayed)');
      }, 100);

    } catch (err) {
      console.error('❌ Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setApiError(errorMessage);
      setIsLoading(false);
      setIsProcessingOrder(false);
      setShowConfirmModal(false);

      // ✅ Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ✅ FIXED: Calculate with all fees
  const cartSubtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const taxAmount = cartSubtotal * (merchantTaxPercentage / 100);
  const serviceChargeAmount = cartSubtotal * (merchantServiceChargePercent / 100);
  const packagingFeeAmount = merchantPackagingFee;
  const totalPayment = cartSubtotal + taxAmount + serviceChargeAmount + packagingFeeAmount + (mode === 'delivery' ? deliveryFee : 0);

  // Loading state while cart initializes
  if (cart === null) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-10" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto py-4 pb-6">
          {/* Order Type Badge Skeleton */}
          <section className="pb-3">
            <div className="mt-4 mx-4 h-9 bg-gray-100 rounded-lg animate-pulse" />
          </section>

          {/* Customer Info Form Skeleton */}
          <div className="p-4 pb-0">
            <div className="w-48 h-5 bg-gray-200 rounded mb-3 animate-pulse" />

            {/* Name Field Skeleton */}
            <div className="w-24 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />

            {/* Phone Field Skeleton */}
            <div className="w-32 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />

            {/* Email Field Skeleton */}
            <div className="w-36 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />
          </div>

          {/* Cashier Image Skeleton */}
          <div className="flex flex-col items-center text-center mb-20 px-8 py-8">
            <div className="w-64 h-48 bg-gray-200 rounded-lg mb-3 animate-pulse" />
            <div className="w-56 h-4 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </main>

        {/* Bottom Payment Bar Skeleton */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white z-10"
          style={{
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
            borderRadius: '16px 16px 0 0',
            maxWidth: '500px',
            margin: '0 auto'
          }}
        >
          <div className="flex pt-3 px-4 pb-2 m-4 items-center gap-4">
            <div className="flex flex-col w-1/2 gap-2">
              <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-1/2 h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header - Profile Style */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push(`/${merchantCode}/view-order?mode=${mode}`)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.payment.title')}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto  py-4 pb-6">

        {/* API Error Message */}
        {apiError && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4" />
              <span>{apiError}</span>
            </p>
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
            <span className="text-gray-700">{t('order.type')}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {mode === 'dinein'
                  ? t('customer.mode.dineIn')
                  : mode === 'takeaway'
                    ? t('customer.mode.pickUp')
                      : (t('customer.mode.delivery') === 'customer.mode.delivery' ? 'Delivery' : t('customer.mode.delivery'))}
              </span>
              <FaCheckCircle style={{ width: '18px', height: '18px', color: '#212529' }} />
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
              {t('customer.payment.customerInfo')}
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col">
            {/* Full Name */}
            <label
              htmlFor="name"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('auth.fullName')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.name ? '#EF4444' : '#9CA3AF' }}>
                <FaUser className="w-5 h-5" />
              </div>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                }}
                disabled={!!(auth && auth.customer.name)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.name
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.name) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.fullName')}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.name}
              </p>
            )}
            {!fieldErrors.name && <div className="mb-2" />}

            {/* Phone Number */}
            <label
              htmlFor="phone"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('auth.phoneNumber')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.phone ? '#EF4444' : '#9CA3AF' }}>
                <FaPhone className="w-5 h-5" />
              </div>
              <input
                ref={phoneInputRef}
                id="phone"
                type="tel"
                inputMode="numeric"
                minLength={9}
                maxLength={18}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }));
                }}
                disabled={!!(auth && auth.customer.phone)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.phone
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.phone) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.phoneNumber')}
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.phone}
              </p>
            )}
            {!fieldErrors.phone && <div className="mb-2" />}

            {/* Email */}
            <label
              htmlFor="email"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('customer.payment.sendReceipt')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.email ? '#EF4444' : '#9CA3AF' }}>
                <FaEnvelope className="w-5 h-5" />
              </div>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                required
                maxLength={50}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                }}
                disabled={!!(auth && auth.customer.email)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.email
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.email) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.email')}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.email}
              </p>
            )}
            {!fieldErrors.email && <div className="mb-2" />}

            {/* Table Number (Dine-in only) */}
            {mode === 'dinein' && (
              <>
                <label
                  htmlFor="tableNumber"
                  className="mb-1"
                  style={{ fontSize: '14px', color: '#212529' }}
                >
                  {t('customer.table.title')}<span className="text-red-500">*</span>
                </label>
                <div className="relative mb-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.tableNumber ? '#EF4444' : '#9CA3AF' }}>
                    <FaTable className="w-5 h-5" />
                  </div>
                  <input
                    ref={tableNumberInputRef}
                    id="tableNumber"
                    type="text"
                    required
                    maxLength={50}
                    value={tableNumber}
                    onChange={(e) => {
                      setTableNumber(e.target.value);
                      if (fieldErrors.tableNumber) setFieldErrors(prev => ({ ...prev, tableNumber: undefined }));
                    }}
                    className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm bg-white focus:outline-none transition-colors ${fieldErrors.tableNumber
                      ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                      }`}
                    placeholder={t('customer.table.title')}
                  />
                </div>
                {fieldErrors.tableNumber && (
                  <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {fieldErrors.tableNumber}
                  </p>
                )}
                {!fieldErrors.tableNumber && <div className="mb-2" />}
              </>
            )}

            {/* ✅ NEW: Delivery Mode - Address & Map Picker */}
            {mode === 'delivery' && isDeliveryAvailable && (
              <>
                <div className="mb-4 mt-4 pt-4 border-t border-gray-200">
                  <DeliveryAddressPicker
                    deliveryUnit={deliveryUnit}
                    onUnitChange={setDeliveryUnit}
                    deliveryBuildingName={deliveryBuildingName}
                    onBuildingNameChange={setDeliveryBuildingName}
                    deliveryBuildingNumber={deliveryBuildingNumber}
                    onBuildingNumberChange={setDeliveryBuildingNumber}
                    deliveryFloor={deliveryFloor}
                    onFloorChange={setDeliveryFloor}
                    deliveryInstructions={deliveryInstructions}
                    onInstructionsChange={setDeliveryInstructions}
                    onAddressPartsChange={setDeliveryAddressParts}
                    onAddressChange={setDeliveryAddress}
                    onCoordinatesChange={(lat, lng) => {
                      setDeliveryLatitude(lat);
                      setDeliveryLongitude(lng);
                    }}
                    deliveryAddress={deliveryAddress}
                    deliveryLatitude={deliveryLatitude}
                    deliveryLongitude={deliveryLongitude}
                    merchantLatitude={(contextMerchantInfo as any)?.latitude !== undefined && (contextMerchantInfo as any)?.latitude !== null
                      ? Number((contextMerchantInfo as any).latitude)
                      : null}
                    merchantLongitude={(contextMerchantInfo as any)?.longitude !== undefined && (contextMerchantInfo as any)?.longitude !== null
                      ? Number((contextMerchantInfo as any).longitude)
                      : null}
                    error={fieldErrors.deliveryAddress}
                  />
                </div>

                {/* Delivery Fee Preview */}
                <div className="mb-4">
                  <DeliveryFeePreview
                    merchantCode={merchantCode}
                    deliveryLatitude={deliveryLatitude}
                    deliveryLongitude={deliveryLongitude}
                    deliveryAddress={deliveryAddress}
                    currency={merchantCurrency}
                    onFeeCalculated={setDeliveryFee}
                    onError={setDeliveryFeeError}
                  />
                </div>
              </>
            )}
          </form>
        </div>

        {/* Payment instructions */}
        <div
          className="flex flex-col items-center text-center mb-20"
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
            <Image
              src={mode === 'delivery' ? '/images/cod.png' : '/images/cashier.png'}
              alt={mode === 'delivery' ? 'Pay on Delivery' : 'Pay at Cashier'}
              width={300}
              height={300}
              style={{ maxWidth: '300px', height: 'auto' }}
            />
          </div>
          <div>
            <span>
              {mode === 'delivery'
                ? (t('customer.payment.payOnDeliveryHint') || 'Pay on delivery. You can track your driver after the order is accepted.')
                : t('customer.payment.showQRCode')}
            </span>
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
                <div className="grow">{t('customer.payment.inclTax')}</div>
                <div>{formatCurrency(taxAmount)}</div>
              </div>
            )}
            {/* Service Charge Row */}
            {serviceChargeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.payment.serviceCharge')}</div>
                <div>{formatCurrency(serviceChargeAmount)}</div>
              </div>
            )}
            {/* Packaging Fee Row */}
            {packagingFeeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.payment.packagingFee')}</div>
                <div>{formatCurrency(packagingFeeAmount)}</div>
              </div>
            )}
            {/* ✅ NEW: Delivery Fee Row */}
            {mode === 'delivery' && deliveryFee > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.delivery.fee') || 'Delivery Fee'}</div>
                <div>{formatCurrency(deliveryFee)}</div>
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
              {t('customer.payment.paymentTotal')}
                <FaChevronDown
                  style={{
                    width: '20px',
                    height: '20px',
                    marginLeft: '4px',
                    transform: showPaymentDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
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
            className="w-1/2 py-3 text-white font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#f05a28',
              fontSize: '16px'
            }}
          >
            {isLoading
              ? t('customer.payment.processing')
              : (mode === 'delivery'
                ? (t('customer.payment.placeDeliveryOrder') === 'customer.payment.placeDeliveryOrder' ? 'Place delivery order' : t('customer.payment.placeDeliveryOrder'))
                : t('customer.payment.payAtCashier'))}
          </button>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
      />
    </>
  );
}
