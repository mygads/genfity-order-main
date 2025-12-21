'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clearCart } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

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

  const merchantCode = params.merchantCode as string;
  const orderNumber = searchParams.get('orderNumber') || '';
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;

  const [order, setOrder] = useState<OrderSummaryData | null>(null);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
   * 
   * @param amount - Number amount to format
   * @returns Formatted string (e.g., "A$45.00")
   */
  const formatCurrency = (amount: number) => {
    if (!merchantInfo) return amount.toFixed(2);

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantInfo.currency,
    }).format(amount);
  };

  /**
   * ✅ Handle "New Order" button click
   */
  const handleNewOrder = () => {
    console.log('🔄 Starting new order');
    clearCart(merchantCode, mode);
    localStorage.removeItem(`mode_${merchantCode}`);
    router.push(`/${merchantCode}`);
  };

  /**
   * ✅ Handle "View History" button click
   */
  const handleViewHistory = () => {
    console.log('📜 Viewing order history');
    router.push(`/${merchantCode}/history?mode=${mode}`);
  };

  // ========================================
  // LOADING STATE
  // ========================================
  if (isLoading) {
    return <LoadingState type="page" message={LOADING_MESSAGES.ORDER_DETAILS} />;
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
            Order Not Found
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
            className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // SUCCESS STATE - MINIMALIST DESIGN
  // ========================================
  return (
    <>
      {/* ========================================
          SUCCESS HEADER - Clean & Minimal
      ======================================== */}
      <div className="px-6 py-8 text-center border-b border-gray-200 dark:border-gray-800">
        {/* Success Icon - Custom CheckCircle */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-500 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="w-10 h-10 text-white"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M3.55 12a8.448 8.448 0 1 1 16.897 0 8.448 8.448 0 0 1-16.896 0M12 2.052c-5.494 0-9.948 4.454-9.948 9.948s4.454 9.948 9.948 9.948 9.948-4.454 9.948-9.948S17.493 2.052 12 2.052m3.514 8.581a.75.75 0 1 0-1.061-1.06l-3.264 3.263-1.642-1.642a.75.75 0 0 0-1.06 1.06l2.172 2.173a.75.75 0 0 0 1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Order Successful!
        </h1>

        {/* Order Number - Monospace Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2">
          <span className="text-sm font-mono text-gray-900 dark:text-white font-semibold">
            {order.orderNumber}
          </span>
        </div>

        {/* Order Type Info */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {order.mode === 'dinein'
            ? `Table #${order.tableNumber}`
            : 'Takeaway Order'
          }
        </p>
      </div>

      {/* ========================================
          SCROLLABLE CONTENT
      ======================================== */}
      <div className="flex-1 overflow-y-auto">
        <main className="px-6 py-6">
          {/* QR Code Section - Minimal Design */}
          <div className="mb-8 text-center">
            <div className="inline-block p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="w-[200px] h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-6xl">
                📱
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
              Show QR code or order number to cashier
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              to complete payment
            </p>
          </div>

          {/* Order Items Section */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Order Details
            </h2>

            {!order.orderItems || order.orderItems.length === 0 ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No items in order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {order.orderItems.map((item, index) => {
                  // Calculate addon total for this item
                  const addonTotal = (item.addons || []).reduce((sum, addon) => {
                    const addonPrice = typeof addon.price === 'number' ? addon.price : 0;
                    const addonQty = addon.quantity || 1;
                    return sum + (addonPrice * addonQty);
                  }, 0);

                  // Item base price (menu price * quantity)
                  const itemBasePrice = item.quantity * item.price;
                  const itemTotalWithAddons = itemBasePrice + addonTotal;

                  return (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      {/* Item Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {item.quantity}x {item.menuName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <p className="text-sm font-bold text-orange-500">
                          {formatCurrency(itemTotalWithAddons)}
                        </p>
                      </div>

                      {/* Display Addons */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="ml-4 space-y-1 mb-2">
                          {item.addons.map((addon, ai) => {
                            const addonPrice = typeof addon.price === 'number' ? addon.price : 0;
                            const addonQty = addon.quantity || 1;
                            const addonSubtotal = addonPrice * addonQty;

                            return (
                              <div key={ai} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                                <span>
                                  + {addon.addonItemName}
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
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-start gap-1">
                          <span>📝</span>
                          <span>{item.notes}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Price Summary - Minimal Card */}
          <div className="mb-6">
            <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatCurrency(order.subtotalAmount)}
                  </span>
                </div>

                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(order.taxAmount)}
                    </span>
                  </div>
                )}

                {order.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Service Charge</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(order.serviceChargeAmount)}
                    </span>
                  </div>
                )}

                {order.packagingFeeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Packaging Fee</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(order.packagingFeeAmount)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-orange-500">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================
          FIXED BOTTOM ACTIONS
      ======================================== */}
      <div className="sticky bottom-0 px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <button
          onClick={handleNewOrder}
          className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98] shadow-sm"
        >
          New Order
        </button>

        <button
          onClick={handleViewHistory}
          className="w-full h-12 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-base font-semibold rounded-lg hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-500 dark:hover:text-orange-500 transition-all active:scale-[0.98]"
        >
          View History
        </button>
      </div>
    </>
  );
}
