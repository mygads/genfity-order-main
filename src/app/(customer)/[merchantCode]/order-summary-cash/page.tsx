'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clearCart, getCustomerAuth } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import { OrderSummaryCashSkeleton } from '@/components/common/SkeletonLoaders';
import NewOrderConfirmationModal from '@/components/modals/NewOrderConfirmationModal';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useCustomerPushNotifications } from '@/hooks/useCustomerPushNotifications';
import { customerTrackUrl } from '@/lib/utils/customerRoutes';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { FaBell, FaCheck, FaCheckCircle, FaChevronDown, FaCopy, FaInfoCircle, FaMoneyBillWave, FaMotorcycle, FaQrcode, FaStickyNote, FaTimes } from 'react-icons/fa';

// ✅ Order Summary Data Interface
interface OrderSummaryData {
  id: string;
  orderNumber: string;
  merchantName: string;
  customerName: string;
  mode: OrderMode;
  tableNumber: string | null;
  status: string;
  deliveryUnit?: string | null;
  deliveryAddress?: string | null;
  deliveryFeeAmount?: number;
  payment?: {
    paymentMethod?: string;
    status?: string;
    amount?: number;
    paidAt?: string | null;
  } | null;
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
  subtotalAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  packagingFeeAmount: number;
  totalAmount: number;
  createdAt: string;
}

// ✅ Merchant Info Interface
interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  currency: string;
  enableTax: boolean;
  taxPercentage: number;
}

/**
 * ✅ Order Summary Cash Page - Mobile-First Minimalist Design
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 * 
 * @description
 * Success page after order creation with:
 * - Clean minimalist design (gray/white palette)
 * - Dynamic currency from merchant API
 * - English labels
 * - Mobile-first responsive layout (max-w-[420px])
 * - Dark mode support
 * 
 * @flow
 * 1. Fetch merchant currency from API
 * 2. Fetch order data via GET /api/public/orders/:orderNumber
 * 3. Display order details with proper formatting
 * 4. Handle errors with user-friendly messages
 */
export default function OrderSummaryCashPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();

  const tOr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const merchantCode = params.merchantCode as string;
  const orderNumber = searchParams.get('orderNumber') || '';
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  const trackingToken = searchParams.get('token') || '';

  const [order, setOrder] = useState<OrderSummaryData | null>(null);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [isTrackingLinkCopied, setIsTrackingLinkCopied] = useState(false);

  // ✅ Push Notification Hook
  const {
    isSupported: isPushSupported,
    isPermissionGranted: isPushPermissionGranted,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    addOrderToSubscription,
  } = useCustomerPushNotifications();

  // ✅ Check if user is logged in on mount
  useEffect(() => {
    const auth = getCustomerAuth();
    setIsLoggedIn(!!auth?.accessToken);
  }, []);

  // ✅ Show push notification prompt when order loads (only if not already subscribed)
  useEffect(() => {
    if (order && isPushSupported && !isPushSubscribed && !isPushPermissionGranted) {
      // Show prompt after a small delay for better UX
      const timer = setTimeout(() => {
        setShowPushPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [order, isPushSupported, isPushSubscribed, isPushPermissionGranted]);

  // ✅ Auto-subscribe to push notifications if already granted permission
  useEffect(() => {
    if (order && isPushSupported && isPushPermissionGranted && !isPushSubscribed) {
      // Auto-add this order to subscription
      addOrderToSubscription(order.orderNumber);
    }
  }, [order, isPushSupported, isPushPermissionGranted, isPushSubscribed, addOrderToSubscription]);

  /**
   * ✅ Fetch merchant info and order details
   */
  useEffect(() => {
    const loadData = async () => {
      if (!orderNumber) {
        setError('Order number not found');
        setIsLoading(false);
        return;
      }

      if (!trackingToken) {
        setError('Tracking token missing. Please open the link from checkout/receipt/email.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch merchant info for currency
        const merchantResponse = await fetch(`/api/public/merchants/${merchantCode}`);
        const merchantData = await merchantResponse.json();

        if (merchantData.success) {
          setMerchantInfo({
            id: merchantData.data.id,
            code: merchantData.data.code,
            name: merchantData.data.name,
            currency: merchantData.data.currency,
            enableTax: merchantData.data.enableTax,
            taxPercentage: merchantData.data.taxPercentage,
          });
        }

        // Fetch order details
        const response = await fetch(`/api/public/orders/${orderNumber}?token=${encodeURIComponent(trackingToken)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Failed to load order');
          setIsLoading(false);
          return;
        }

        /**
         * ✅ Convert Decimal.js serialized object to number
         */
        const convertDecimal = (value: unknown): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return parseFloat(value) || 0;

          if (typeof value === 'object' && value !== null && 'd' in value && Array.isArray((value as { d: number[] }).d)) {
            const decimalObj = value as { s?: number; e?: number; d: number[] };
            const sign = decimalObj.s || 1;
            const exponent = decimalObj.e ?? 0;
            const digits = decimalObj.d[0] || 0;
            const digitsLength = digits.toString().length;
            const result = sign * digits * Math.pow(10, exponent - digitsLength + 1);
            return result;
          }
          return 0;
        };

        // ✅ FIX: Convert Decimal di order items
        const convertedOrderItems = data.data.orderItems.map((item: {
          menuName: string;
          quantity: number;
          menuPrice: unknown;
          subtotal: unknown;
          notes?: string;
          addons: Array<{ addonName?: string; addonItemName?: string; quantity: number; addonPrice?: unknown; price?: unknown }>;
        }) => ({
          menuName: item.menuName,
          quantity: item.quantity,
          price: convertDecimal(item.menuPrice),      // ✅ Convert menuPrice
          subtotal: convertDecimal(item.subtotal),    // ✅ Convert subtotal
          notes: item.notes,
          addons: item.addons.map((addon) => ({
            addonItemName: addon.addonName || addon.addonItemName, // ✅ Support both field names
            quantity: addon.quantity,
            price: convertDecimal(addon.addonPrice || addon.price), // ✅ Support both field names
          })),
        }));

        const orderData: OrderSummaryData = {
          id: data.data.id,
          orderNumber: data.data.orderNumber,
          merchantName: data.data.merchant?.name || data.data.merchantName,
          customerName: data.data.customerName,
          mode: data.data.orderType === 'DINE_IN' ? 'dinein' : data.data.orderType === 'TAKEAWAY' ? 'takeaway' : 'delivery',
          tableNumber: data.data.tableNumber,
          status: data.data.status,
          deliveryUnit: data.data.deliveryUnit ?? null,
          deliveryAddress: data.data.deliveryAddress ?? null,
          deliveryFeeAmount: convertDecimal(data.data.deliveryFeeAmount),
          payment: data.data.payment
            ? {
                paymentMethod: data.data.payment.paymentMethod,
                status: data.data.payment.status,
                amount: convertDecimal(data.data.payment.amount),
                paidAt: data.data.payment.paidAt ?? null,
              }
            : null,
          orderItems: convertedOrderItems,
          subtotalAmount: convertDecimal(data.data.subtotal || data.data.subtotalAmount),
          taxAmount: convertDecimal(data.data.taxAmount),
          serviceChargeAmount: convertDecimal(data.data.serviceChargeAmount),
          packagingFeeAmount: convertDecimal(data.data.packagingFeeAmount),
          totalAmount: convertDecimal(data.data.totalAmount),
          createdAt: data.data.createdAt,
        };

        setOrder(orderData);

        // ✅ Auto-redirect to track page if order is already accepted/progressing/completed
        // Use `replace` to avoid browser back-looping into this summary page.
        if (['ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED'].includes(orderData.status)) {
          router.replace(
            customerTrackUrl(merchantCode, orderData.orderNumber, {
              back: 'history',
              mode: orderData.mode,
              token: trackingToken,
            })
          );
          return;
        }

      } catch (err) {
        console.error('❌ Load order error:', err);
        setError('Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [orderNumber, merchantCode, mode, router]);

  // ✅ Poll for order status changes (auto-redirect when payment verified)
  useEffect(() => {
    if (!orderNumber || !order || order.status !== 'PENDING') return;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(`/api/public/orders/${orderNumber}?token=${encodeURIComponent(trackingToken)}`);
        if (!response.ok) return;

        const data = await response.json();
        const newStatus = data.data?.status;
        const resolvedOrderNumber = data.data?.orderNumber || orderNumber;

        // If order is accepted/in-progress/ready, redirect to track page
        if (['ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED'].includes(newStatus)) {
          router.replace(
            customerTrackUrl(merchantCode, resolvedOrderNumber, {
              back: 'history',
              mode,
              token: trackingToken,
            })
          );
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    // Poll every 3 seconds while order is pending
    const intervalId = setInterval(checkOrderStatus, 3000);

    return () => clearInterval(intervalId);
  }, [orderNumber, order, merchantCode, router, trackingToken, mode]);

  /**
   * ✅ Format currency using merchant's currency
   * Uses A$ prefix for Australian Dollar
   * 
   * @param amount - Number amount to format
   * @returns Formatted string (e.g., "A$45.00")
   */
  const formatCurrency = (amount: number) => {
    const currency = merchantInfo?.currency || 'AUD';
    return formatCurrencyUtil(amount, currency, locale);
  };

  /**
   * ✅ Handle "New Order" button click - Show confirmation modal
   */
  const handleNewOrder = () => {
    setShowNewOrderModal(true);
  };

  /**
   * ✅ Handle confirm new order from modal
   */
  const handleConfirmNewOrder = () => {
    clearCart(merchantCode, mode);
    localStorage.removeItem(`mode_${merchantCode}`);
    setShowNewOrderModal(false);
    router.push(`/${merchantCode}`);
  };

  /**
   * ✅ Handle "View History" button click
   */
  const _handleViewHistory = () => {
    router.push(`/${merchantCode}/history?mode=${mode}`);
  };

  // ========================================
  // LOADING STATE
  // ========================================
  if (isLoading) {
    return <OrderSummaryCashSkeleton />;
  }

  // ========================================
  // ERROR STATE
  // ========================================
  if (error || !order) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-base text-gray-900 font-semibold mb-2">
            {t('customer.orderSummary.orderNotFound')}
          </p>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
            className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
          >
            {t('customer.orderSummary.backToMenu')}
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // SUCCESS STATE - ESB DESIGN
  // ========================================
  return (
    <>
      {/* ========================================
          HEADER - ESB Style (Centered with Shadow)
      ======================================== */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center justify-between px-5 py-4 relative">
          {/* Empty left spacer for centering */}
          <div className="w-8" />

          <h1
            className="text-gray-900 absolute left-1/2 transform -translate-x-1/2"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '24px'
            }}
          >
            {t('customer.orderSummary.title')}
          </h1>

          {/* Close button - only visible for logged in users */}
          {isLoggedIn ? (
            <button
              onClick={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <FaTimes className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>

      {/* ========================================
          ORDER TYPE CARD - ESB Style
      ======================================== */}
      <section className="px-4 pt-4">
        <div
          className="flex items-center justify-between relative"
          style={{
            height: '36px',
            fontSize: '0.8rem',
            padding: '8px 16px',
            border: '1px solid #f05a28',
            borderRadius: '8px',
            backgroundColor: 'rgba(240, 90, 40, 0.1)'
          }}
        >
          <span className="text-gray-700">{t('customer.orderSummary.orderType')}</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {mode === 'dinein'
                ? t('customer.mode.dineIn')
                : mode === 'delivery'
                  ? tOr('customer.mode.delivery', 'Delivery')
                  : t('customer.mode.pickUp')}
            </span>
            <FaCheckCircle style={{ width: '18px', height: '18px', color: '#1ca406' }} />
          </div>
        </div>
      </section>

      {/* ========================================
          QR CODE BOX - ESB Style
      ======================================== */}
      <div
        className="flex flex-col grow items-center mt-6 mb-3"
        style={{ margin: '24px 16px 12px', borderRadius: '10px' }}
      >
        {/* Order Number Title */}
        <div className="order-container text-center mb-4">
          <span
            className="text-sm "
            style={{ color: '#212529' }}
          >
            {t('customer.orderSummary.orderNumber')}
          </span>

          {/* Order Number Box - ESB Style */}
          <div
            className="flex mt-2 justify-center"
            style={{
              border: '1px solid #E6E6E6',
              borderRadius: '8px',
              height: '42px',
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              letterSpacing: '0.25px',
              lineHeight: '20px'
            }}
          >
            {/* Merchant Code (Left - Gray) */}
            <div
              style={{
                padding: '10px',
                backgroundColor: '#ECECEC',
                minWidth: '125px',
                borderRadius: '7px 0 0 7px',
                color: '#a6a6a6',
                fontWeight: 500,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {merchantCode.toUpperCase()}
            </div>
            {/* Order Code (Right - White) */}
            <div
              style={{
                padding: '10px',
                backgroundColor: 'white',
                minWidth: '125px',
                borderRadius: '0 7px 7px 0',
                color: '#212529',
                fontWeight: 700,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Extract code after merchant prefix, or show full if no dash */}
              {order.orderNumber.includes('-')
                ? order.orderNumber.split('-').slice(1).join('-')
                : order.orderNumber}
            </div>
          </div>
        </div>



        {/* QR Code - Real QR with Order Number */}
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center rounded-xl "
            style={{
              width: '240px',
              height: '240px',
              backgroundColor: 'white',
            }}
          >
            <QRCodeSVG
              value={customerTrackUrl(merchantCode, order.orderNumber, {
                token: trackingToken || undefined,
                back: 'history',
                mode,
              })}
              size={350}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Copy tracking link (Delivery) */}
        {mode === 'delivery' && trackingToken ? (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  const path = customerTrackUrl(merchantCode, order.orderNumber, {
                    token: trackingToken,
                    back: 'history',
                    mode,
                  });
                  const url = `${getPublicAppOrigin('http://localhost:3000')}${path}`;
                  await navigator.clipboard.writeText(url);
                  setIsTrackingLinkCopied(true);
                  window.setTimeout(() => setIsTrackingLinkCopied(false), 2000);
                } catch {
                  // Clipboard might be unavailable (non-secure context)
                  setIsTrackingLinkCopied(false);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              {isTrackingLinkCopied ? (
                <>
                  <FaCheck className="w-4 h-4 text-green-600" />
                  <span>{tOr('customer.orderSummary.copied', 'Copied')}</span>
                </>
              ) : (
                <>
                  <FaCopy className="w-4 h-4 text-gray-600" />
                  <span>{tOr('customer.orderSummary.copyTrackingLink', 'Copy tracking link')}</span>
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* Payment & Delivery Summary */}
        <div className="mx-auto mb-3 w-full max-w-[420px] rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[#f05a28]">
              {mode === 'delivery' ? <FaMotorcycle className="h-5 w-5" /> : <FaMoneyBillWave className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {mode === 'delivery'
                    ? tOr('customer.orderSummary.deliveryTitle', 'Delivery order')
                    : tOr('customer.orderSummary.paymentTitle', 'Payment')}
                </p>

                {mode === 'delivery' ? (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    {tOr('customer.orderSummary.paymentStatus', 'Status')}: {order?.payment?.status || order?.status || '-'}
                  </span>
                ) : null}
              </div>

              {mode === 'delivery' ? (
                <div className="mt-1 space-y-2">
                  <p className="text-xs leading-5 text-gray-600">
                    {(order?.payment?.paymentMethod === 'CASH_ON_DELIVERY' || !order?.payment?.paymentMethod)
                      ? tOr('customer.orderSummary.deliveryPayToDriver', 'Payment: Cash on delivery.')
                      : tOr('customer.orderSummary.deliveryPaymentMethod', `Payment: ${order?.payment?.paymentMethod || '-'}`).replace(
                          '{method}',
                          String(order?.payment?.paymentMethod || '-')
                        )}
                  </p>

                  {order?.deliveryAddress ? (
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                        <FaInfoCircle className="h-4 w-4" />
                        <span>{t('customer.delivery.address') || 'Delivery Address'}</span>
                      </div>
                      <p className="mt-1 break-words text-xs leading-5 text-gray-800">
                        {order.deliveryUnit ? `${order.deliveryUnit}, ${order.deliveryAddress}` : order.deliveryAddress}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  {tOr('customer.orderSummary.payAtCashierHint', 'Show this QR to the cashier/staff to process your order.')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notification Message - ESB Style with 2-line layout */}
        <div className="mx-auto mb-3 mt-2 flex w-full max-w-[420px] items-start gap-2 rounded-lg bg-[#fef0c7] px-4 py-3">
          <FaQrcode className="shrink-0" style={{ width: '20px', height: '20px', marginTop: '2px', color: '#dc6803' }} />
          <p className="text-sm leading-5 text-[#1d2939]">
            {mode === 'delivery'
              ? tOr('customer.orderSummary.deliveryQrInstruction', 'Save this QR to track your delivery status and driver updates.')
              : tOr('customer.orderSummary.showQRInstruction', 'Show the QR code or 7-digit order number to our cashier.')}
          </p>
        </div>

        {/* ✅ Push Notification Prompt Banner */}
        {showPushPrompt && isPushSupported && !isPushSubscribed && (
          <div className="mx-auto flex w-full max-w-[420px] animate-fade-in items-center gap-3 rounded-lg bg-[#e0f2fe] px-4 py-3">
            <FaBell className="shrink-0" style={{ width: '24px', height: '24px', color: '#0284c7' }} />
            <div className="flex-1">
              <p style={{ color: '#0c4a6e', fontWeight: 500, marginBottom: '2px' }}>
                {t('customer.push.enableTitle')}
              </p>
              <p style={{ color: '#0369a1', fontSize: '12px' }}>
                {t('customer.push.enableDescription')}
              </p>
            </div>
            <button
              onClick={async () => {
                const success = await subscribePush(order?.orderNumber);
                if (success) {
                  setShowPushPrompt(false);
                }
              }}
              disabled={isPushLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPushLoading ? '...' : t('customer.push.enable')}
            </button>
            <button
              onClick={() => setShowPushPrompt(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================
          ORDERED ITEMS SECTION - ESB Style
      ======================================== */}
      <main
        className="pb-4"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          letterSpacing: '0.25px',
          lineHeight: '20px',
          color: '#212529'
        }}
      >
        {/* Divider */}
        <div style={{ height: '4px', backgroundColor: '#f3f4f6' }} />

        {/* Ordered Items Header */}
        <div
          className="flex justify-between items-center"
          style={{ paddingTop: '16px', paddingLeft: '12px', paddingRight: '12px', height: '35px' }}
        >
          <h1 className="mb-0" style={{ fontSize: '16px', fontWeight: 600, color: '#212529' }}>
            {t('customer.orderSummary.orderedItems')}
          </h1>
        </div>

        {/* Order Items List */}
        {order.orderItems && order.orderItems.length > 0 && (
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            {order.orderItems.map((item, index) => {
              const addonTotal = (item.addons || []).reduce((sum, addon) => {
                const addonPrice = typeof addon.price === 'number' ? addon.price : 0;
                const addonQty = addon.quantity || 1;
                return sum + (addonPrice * addonQty);
              }, 0);
              const itemTotalWithAddons = (item.quantity * item.price) + addonTotal;

              return (
                <div
                  key={index}
                  className="flex flex-col"
                  style={{ padding: '16px' }}
                >
                  <div className="flex flex-row">
                    {/* Quantity - ESB: dark color, bold */}
                    <div
                      className="flex items-start justify-center"
                      style={{
                        marginRight: '0.5rem',
                        fontSize: '1em',
                        fontWeight: 700,
                        lineHeight: '17px',
                        color: '#212529'
                      }}
                    >
                      {item.quantity}x
                    </div>

                    {/* Menu Name & Addons */}
                    <div className="grow flex flex-col">
                      <div style={{ maxWidth: '245px', fontWeight: 500, color: '#212529' }}>
                        {item.menuName}
                      </div>

                      {/* Addons as package text */}
                      {item.addons && item.addons.length > 0 && item.addons.map((addon, ai) => (
                        <div
                          key={ai}
                          style={{
                            fontSize: '12px',
                            color: '#808080',
                            marginTop: '0px',
                            lineHeight: '15px',
                            letterSpacing: '0.25px',
                            fontWeight: 400
                          }}
                        >
                          {addon.quantity || 1} x {addon.addonItemName}
                        </div>
                      ))}

                      {/* Notes */}
                      {item.notes && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
                          <span className="inline-flex items-center gap-2">
                            <FaStickyNote className="w-3.5 h-3.5" />
                            <span>{item.notes}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div
                      className="flex flex-col items-end"
                      style={{ fontSize: '14px', whiteSpace: 'nowrap', color: '#212529' }}
                    >
                      {formatCurrency(itemTotalWithAddons)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================
            PAYMENT DETAILS SECTION - ESB Style
        ======================================== */}
        <div
          className="flex flex-col"
          style={{
            padding: '16px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            letterSpacing: '0.25px',
            lineHeight: '20px'
          }}
        >
          {/* Inclusive Fees - Expandable */}
          {(order.taxAmount > 0 || order.serviceChargeAmount > 0 || order.packagingFeeAmount > 0) && (
            <>
              {/* Header Row - Clickable */}
              <div
                className="flex justify-between items-center cursor-pointer"
                style={{
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px dashed #e4e7ec',
                  color: '#aeb3be',
                  fontSize: '14px',
                  fontWeight: 400
                }}
                onClick={() => setShowFeeDetails(!showFeeDetails)}
              >
                <div className="flex items-center">
                  {t('customer.payment.inclFees')}
                  <FaChevronDown
                    style={{
                      width: '24px',
                      height: '24px',
                      marginLeft: '2px',
                      transform: showFeeDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </div>
                <div style={{ fontWeight: 400 }}>
                  {formatCurrency(order.taxAmount + order.serviceChargeAmount + order.packagingFeeAmount)}
                </div>
              </div>

              {/* Fee Details - Shown when expanded */}
              {showFeeDetails && (
                <div
                  style={{
                    color: '#aeb3be',
                    fontSize: '14px',
                    borderBottom: '1px dashed #e4e7ec',
                    fontWeight: 400
                  }}
                >
                  {order.taxAmount > 0 && (
                    <div
                      className="flex justify-between"
                      style={{
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        paddingLeft: '8px'
                      }}
                    >
                      <div>{t('customer.orderSummary.inclPB1')}</div>
                      <div>{formatCurrency(order.taxAmount)}</div>
                    </div>
                  )}
                  {order.serviceChargeAmount > 0 && (
                    <div
                      className="flex justify-between"
                      style={{
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        paddingLeft: '24px'
                      }}
                    >
                      <div>{t('customer.payment.serviceCharge')}</div>
                      <div>{formatCurrency(order.serviceChargeAmount)}</div>
                    </div>
                  )}
                  {order.packagingFeeAmount > 0 && (
                    <div
                      className="flex justify-between"
                      style={{
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        paddingLeft: '24px'
                      }}
                    >
                      <div>{t('customer.payment.packagingFee')}</div>
                      <div>{formatCurrency(order.packagingFeeAmount)}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Total Section - ESB Style */}
          <section
            className="flex"
            style={{
              paddingTop: '12px',
              fontWeight: 700,
              fontSize: '1em',
              lineHeight: '17px'
            }}
          >
            <div
              className="grow"
              style={{ color: '#212529' }}
            >
              {t('customer.payment.total')}
            </div>
            <div style={{ color: '#f05a28', fontWeight: 700 }}>
              {formatCurrency(order.totalAmount)}
            </div>
          </section>
        </div>
        {/* New Order Button - ESB Style */}
        <button
          onClick={handleNewOrder}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'calc(100% - 32px)',
            margin: '16px',
            height: '48px',
            backgroundColor: '#F05A28',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Roboto, sans-serif',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px',
            lineHeight: '20px',
            padding: '4.8px 16px'
          }}
        >
          {t('customer.orderSummary.newOrder')}
        </button>
      </main>

      {/* New Order Confirmation Modal */}
      <NewOrderConfirmationModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onConfirm={handleConfirmNewOrder}
      />
    </>
  );
}
