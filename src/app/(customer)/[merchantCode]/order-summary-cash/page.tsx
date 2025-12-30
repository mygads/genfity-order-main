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

// ✅ Order Summary Data Interface
interface OrderSummaryData {
  id: string;
  orderNumber: string;
  merchantName: string;
  customerName: string;
  mode: OrderMode;
  tableNumber: string | null;
  status: string;
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
  const { t } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const orderNumber = searchParams.get('orderNumber') || '';
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;

  const [order, setOrder] = useState<OrderSummaryData | null>(null);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ Check if user is logged in on mount
  useEffect(() => {
    const auth = getCustomerAuth();
    setIsLoggedIn(!!auth?.accessToken);
  }, []);

  /**
   * ✅ Fetch merchant info and order details
   */
  useEffect(() => {
    const loadData = async () => {
      if (!orderNumber) {
        console.error('❌ Missing order number');
        setError('Order number not found');
        setIsLoading(false);
        return;
      }

      console.log('📦 Fetching merchant info and order:', orderNumber);

      try {
        // Fetch merchant info for currency
        const merchantResponse = await fetch(`/api/public/merchants/${merchantCode}`);
        const merchantData = await merchantResponse.json();

        if (merchantData.success) {
          console.log('✅ Merchant info loaded:', merchantData.data);
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
        const response = await fetch(`/api/public/orders/${orderNumber}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('❌ API Error:', data);
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

        console.log('💰 [ORDER ITEMS] Converted items:', convertedOrderItems);

        const orderData: OrderSummaryData = {
          id: data.data.id,
          orderNumber: data.data.orderNumber,
          merchantName: data.data.merchant?.name || data.data.merchantName,
          customerName: data.data.customerName,
          mode: data.data.orderType === 'DINE_IN' ? 'dinein' : 'takeaway',
          tableNumber: data.data.tableNumber,
          status: data.data.status,
          orderItems: convertedOrderItems,
          subtotalAmount: convertDecimal(data.data.subtotal || data.data.subtotalAmount),
          taxAmount: convertDecimal(data.data.taxAmount),
          serviceChargeAmount: convertDecimal(data.data.serviceChargeAmount),
          packagingFeeAmount: convertDecimal(data.data.packagingFeeAmount),
          totalAmount: convertDecimal(data.data.totalAmount),
          createdAt: data.data.createdAt,
        };

        console.log('💰 [ORDER SUMMARY] Final order data:', {
          subtotal: orderData.subtotalAmount,
          tax: orderData.taxAmount,
          total: orderData.totalAmount,
          items: orderData.orderItems,
        });

        setOrder(orderData);
        console.log('✅ Order loaded successfully');

      } catch (err) {
        console.error('❌ Load order error:', err);
        setError('Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [orderNumber, merchantCode]);

  /**
   * ✅ Format currency using merchant's currency
   * Uses A$ prefix for Australian Dollar
   * 
   * @param amount - Number amount to format
   * @returns Formatted string (e.g., "A$45.00")
   */
  const formatCurrency = (amount: number) => {
    if (!merchantInfo) return amount.toFixed(2);

    // Special handling for AUD to show A$ prefix
    if (merchantInfo.currency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }

    // Special handling for IDR - no decimals
    if (merchantInfo.currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantInfo.currency,
    }).format(amount);
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
    console.log('🔄 Starting new order');
    clearCart(merchantCode, mode);
    localStorage.removeItem(`mode_${merchantCode}`);
    setShowNewOrderModal(false);
    router.push(`/${merchantCode}`);
  };

  /**
   * ✅ Handle "View History" button click
   */
  const _handleViewHistory = () => {
    console.log('📜 Viewing order history');
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
          <p className="text-base text-gray-900 dark:text-white font-semibold mb-2">
            {t('customer.orderSummary.orderNotFound')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
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
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
        <div className="flex items-center justify-between px-5 py-4 relative">
          {/* Empty left spacer for centering */}
          <div className="w-8" />

          <h1
            className="text-gray-900 dark:text-white absolute left-1/2 transform -translate-x-1/2"
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
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600 dark:text-gray-300"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
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
              {mode === 'dinein' ? t('customer.mode.dineIn') : t('customer.mode.pickUp')}
            </span>
            <svg
              style={{ width: '18px', height: '18px', color: '#1ca406' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
        </div>
      </section>

      {/* ========================================
          QR CODE BOX - ESB Style
      ======================================== */}
      <div
        className="flex flex-col flex-grow items-center mt-6 mb-3"
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
              {order.orderNumber.split('-').pop()?.toUpperCase() || order.orderNumber}
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
              value={order.orderNumber}
              size={350}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Notification Message - ESB Style with 2-line layout */}
        <div
          className="flex justify-center items-center mb-3 mt-2"
          style={{
            padding: '12px 16px',
            width: '64%',
            minWidth: '343px',
            margin: '0 auto 12px auto',
            backgroundColor: '#fef0c7',
            borderRadius: '8px',
            fontSize: '14px',
            letterSpacing: '0'
          }}
        >
          <svg
            className="flex-shrink-0"
            style={{
              width: '20px',
              height: '20px',
              marginRight: '8px',
              color: '#dc6803'
            }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <span
            style={{
              color: '#1d2939',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              textAlign: 'start'
            }}
          >
            {t('customer.orderSummary.showQRInstruction')}
          </span>
        </div>
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
                    <div className="flex-grow flex flex-col">
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
                          📝 {item.notes}
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
                  <svg
                    style={{
                      width: '24px',
                      height: '24px',
                      marginLeft: '2px',
                      transform: showFeeDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
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
              className="flex-grow"
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
