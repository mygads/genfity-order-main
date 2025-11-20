'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import { useCart } from '@/context/CartContext'; // ✅ ADD THIS
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import { calculateCartSubtotal, calculatePriceBreakdown } from '@/lib/utils/priceCalculator';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number;
  isActive: boolean;
  trackStock: boolean;
}

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
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(10);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [removeItemName, setRemoveItemName] = useState<string>('');

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

        if (data.success) {
          setMerchantTaxPercentage(Number(data.data.taxPercentage) || 10);
          setMerchantCurrency(data.data.currency || 'AUD');
          console.log('✅ [VIEW ORDER] Merchant settings:', {
            tax: data.data.taxPercentage,
            currency: data.data.currency
          });
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
  const updateQuantity = (cartItemId: string, newQuantity: number, itemName?: string) => {
    if (!cart) return;

    if (newQuantity === 0) {
      // Show confirmation modal instead of window.confirm
      setRemoveItemId(cartItemId);
      setRemoveItemName(itemName || 'this item');
    } else {
      updateItem(cartItemId, { quantity: newQuantity });
    }
  };

  // Handle remove item confirmation
  const handleConfirmRemove = () => {
    if (removeItemId) {
      removeItem(removeItemId);
      setRemoveItemId(null);
      setRemoveItemName('');
    }
  };

  // ✅ UNIFIED: Calculate totals using utility
  const subtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const breakdown = calculatePriceBreakdown(subtotal, merchantTaxPercentage);

  const handleProceedToPayment = () => {
    // Save general notes to cart context
    if (cart && generalNotes.trim()) {
      console.log('General notes:', generalNotes.trim());
    }

    // Navigate to payment page
    router.push(`/${merchantCode}/payment?mode=${mode}`);
  };

  const handleAddItem = () => {
    router.push(`/${merchantCode}/order?mode=${mode}`);
  };

  // Handle Edit Item - Open modal with menu detail
  const handleEditItem = async (item: CartItem) => {
    try {
      // Fetch menu detail with addons
      const response = await fetch(`/api/public/merchants/${merchantCode}/menus/${item.menuId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedMenu(data.data);
        setEditingCartItem(item);
      }
    } catch (error) {
      console.error('Failed to fetch menu detail:', error);
    }
  };

  // Close modal and clear edit state
  const handleCloseModal = () => {
    setSelectedMenu(null);
    setEditingCartItem(null);
  };

  // Loading state
  if (isLoading || !cart) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING_CART} />;
  }

  return (
    <div className="max-w-[420px] mx-auto bg-white dark:bg-gray-900 min-h-svh flex flex-col">
      {/* Header */}
      <CustomerHeader
        merchantCode={merchantCode}
        mode={mode}
        showBackButton={true}
        onBack={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
        title="Order"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Order Type Section */}
        <section className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Order Type</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {mode === 'dinein' ? 'Dine In' : 'Takeaway'}
              </span>
              <svg className="w-[18px] h-[18px] text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </section>

        {/* Ordered Items Header */}
        <section className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Ordered Items ({cart.items.length})
            </h2>
            <button
              onClick={handleAddItem}
              className="px-3 py-1.5 text-sm font-bold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              + Add Item
            </button>
          </div>
        </section>

        <div className="px-4">
          <hr className="border-gray-200 dark:border-gray-700" />
        </div>

        {/* Order Items List */}
        <div className="px-4 pt-3 space-y-4">
          {cart.items.map((item) => {
            const itemSubtotal = item.price * item.quantity;
            const addonsSubtotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0) * item.quantity;
            const totalItemPrice = itemSubtotal + addonsSubtotal;

            return (
              <div key={item.cartItemId} className="space-y-2">
                {/* Item Header */}
                <div className="flex items-start justify-between">
                  <h3 className="flex-1 text-base font-bold text-gray-900 dark:text-white line-clamp-2 pr-3">
                    {item.menuName}
                  </h3>
                  <button
                    onClick={() => handleEditItem(item)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-medium">Edit</span>
                  </button>
                </div>

                {/* Addons List */}
                {item.addons && item.addons.length > 0 && (
                  <div className="space-y-0.5">
                    {item.addons.map((addon, idx) => (
                      <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                        1x {addon.name}
                      </p>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {item.notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{item.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No notes yet</p>
                  )}
                </div>

                {/* Price and Quantity */}
                <div className="flex items-center justify-between pt-3">
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalItemPrice, merchantCurrency)}
                  </div>

                  {/* Quantity Counter with Delete */}
                  <div className="flex items-center gap-2">
                    {/* Minus/Delete Button */}
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          // Show confirmation modal before deleting
                          setRemoveItemId(item.cartItemId);
                          setRemoveItemName(item.menuName);
                        } else {
                          updateQuantity(item.cartItemId, item.quantity - 1, item.menuName);
                        }
                      }}
                      className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 transition-all"
                      title={item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                    >
                      {item.quantity === 1 ? (
                        // Trash icon when quantity is 1
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      ) : (
                        // Minus icon when quantity > 1
                        <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        </svg>
                      )}
                    </button>

                    <span className="text-base font-semibold text-gray-900 dark:text-white min-w-6 text-center">
                      {item.quantity}
                    </span>

                    {/* Plus Button */}
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 transition-all"
                      title="Increase quantity"
                    >
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />
              </div>
            );
          })}
        </div>

        {/* Add Another Notes */}
        <div className="px-4 pt-4 pb-4">
          <button
            onClick={() => {
              // Focus on general notes input
              document.getElementById('general-notes')?.focus();
            }}
            className="w-full flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-sm">Add another notes</span>
          </button>
          <textarea
            id="general-notes"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Add notes for your entire order..."
            rows={3}
            className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
          />
        </div>

        {/* Payment Details */}
        <section className="px-4 pb-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <h2 className="text-center text-lg font-bold text-gray-900 dark:text-white py-3 border-b border-gray-200 dark:border-gray-700">
              Payment Details
            </h2>

            <div className="p-4 space-y-3">
              {/* Collapsible Tax Details */}
              <button
                onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                className="w-full flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-2 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-300">Incl. tax</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${showPaymentDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(breakdown.tax), merchantCurrency)}
                </span>
              </button>

              {/* Expanded Details */}
              {showPaymentDetails && (
                <div className="pl-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax ({merchantTaxPercentage}%)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(Number(breakdown.tax), merchantCurrency)}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                <span className="text-xl font-bold text-orange-500">
                  {formatCurrency(Number(breakdown.total), merchantCurrency)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Payment</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(Number(breakdown.total), merchantCurrency)}
            </div>
          </div>
          <button
            onClick={handleProceedToPayment}
            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
          >
            Continue to Payment
          </button>
        </div>
      </div>

      {/* Edit Menu Modal */}
      {selectedMenu && editingCartItem && (
        <MenuDetailModal
          menu={selectedMenu}
          merchantCode={merchantCode}
          mode={mode}
          currency={merchantCurrency}
          editMode={true}
          existingCartItem={editingCartItem}
          onClose={handleCloseModal}
        />
      )}

      {/* Remove Item Confirmation Modal */}
      {removeItemId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[400]"
            onClick={() => {
              setRemoveItemId(null);
              setRemoveItemName('');
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl z-[400] p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Remove Item?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to remove <strong>{removeItemName}</strong> from your cart?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRemoveItemId(null);
                  setRemoveItemName('');
                }}
                className="flex-1 h-11 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 h-11 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
