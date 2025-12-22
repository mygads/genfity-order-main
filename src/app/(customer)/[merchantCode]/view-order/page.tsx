'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import { calculateCartSubtotal } from '@/lib/utils/priceCalculator';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number;
  isActive: boolean;
  trackStock: boolean;
}

interface RelatedMenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

/**
 * GENFITY - View Order (Cart Review) Page
 * 
 * @description
 * ESB-Style Order Review Page with:
 * - Orange themed Order Type card
 * - Related Menu horizontal scroll section
 * - Circular quantity control buttons
 * - Expandable Payment Details
 * - Premium visual styling
 */
export default function ViewOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as 'dinein' | 'takeaway';

  const { cart, updateItem, removeItem, initializeCart, addItem } = useCart();

  const [isLoading, setIsLoading] = useState(true);
  const [showOtherFees, setShowOtherFees] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(0);
  const [merchantServiceChargePercent, setMerchantServiceChargePercent] = useState(0);
  const [merchantPackagingFee, setMerchantPackagingFee] = useState(0);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [removeItemName, setRemoveItemName] = useState<string>('');
  const [relatedMenus, setRelatedMenus] = useState<RelatedMenuItem[]>([]);

  // Initialize cart on mount
  useEffect(() => {
    initializeCart(merchantCode, mode);
    setIsLoading(false);
  }, [merchantCode, mode, initializeCart]);

  // Fetch merchant settings and related menus
  useEffect(() => {
    const fetchMerchantData = async () => {
      try {
        // Fetch merchant settings
        const settingsResponse = await fetch(`/api/public/merchants/${merchantCode}`);
        const settingsData = await settingsResponse.json();

        if (settingsData.success) {
          if (settingsData.data.enableTax) {
            setMerchantTaxPercentage(Number(settingsData.data.taxPercentage) || 0);
          }
          if (settingsData.data.enableServiceCharge) {
            setMerchantServiceChargePercent(Number(settingsData.data.serviceChargePercent) || 0);
          }
          if (settingsData.data.enablePackagingFee && mode === 'takeaway') {
            setMerchantPackagingFee(Number(settingsData.data.packagingFeeAmount) || 0);
          }
          setMerchantCurrency(settingsData.data.currency || 'AUD');
        }

        // Fetch related menus for upselling
        const menusResponse = await fetch(`/api/public/merchants/${merchantCode}/menus?limit=5`);
        const menusData = await menusResponse.json();

        if (menusData.success && menusData.data) {
          // Filter out items already in cart
          const cartMenuIds = cart?.items.map(item => item.menuId) || [];
          const filteredMenus = menusData.data
            .filter((menu: RelatedMenuItem) => !cartMenuIds.includes(menu.id.toString()))
            .slice(0, 4);
          setRelatedMenus(filteredMenus);
        }
      } catch (error) {
        console.error('Failed to fetch merchant data:', error);
      }
    };

    if (merchantCode) {
      fetchMerchantData();
    }
  }, [merchantCode, mode, cart?.items]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      router.push(`/${merchantCode}/order?mode=${mode}`);
    }
  }, [cart, isLoading, merchantCode, mode, router]);

  const updateQuantity = (cartItemId: string, newQuantity: number, itemName?: string) => {
    if (!cart) return;
    if (newQuantity === 0) {
      setRemoveItemId(cartItemId);
      setRemoveItemName(itemName || 'this item');
    } else {
      updateItem(cartItemId, { quantity: newQuantity });
    }
  };

  const handleConfirmRemove = () => {
    if (removeItemId) {
      removeItem(removeItemId);
      setRemoveItemId(null);
      setRemoveItemName('');
    }
  };

  // Handle adding related menu item
  const handleAddRelatedItem = async (menuId: string) => {
    try {
      const response = await fetch(`/api/public/merchants/${merchantCode}/menus/${menuId}`);
      const data = await response.json();

      if (data.success) {
        const menu = data.data;
        addItem({
          menuId: menu.id,
          menuName: menu.name,
          price: menu.price,
          quantity: 1,
          addons: [],
          notes: ''
        });
        // Remove from related menus list
        setRelatedMenus(prev => prev.filter(m => m.id !== menuId));
      }
    } catch (error) {
      console.error('Failed to add related item:', error);
    }
  };

  // Calculate totals
  const subtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const taxAmount = subtotal * (merchantTaxPercentage / 100);
  const serviceChargeAmount = subtotal * (merchantServiceChargePercent / 100);
  const packagingFeeAmount = merchantPackagingFee;
  const otherFees = taxAmount + serviceChargeAmount + packagingFeeAmount;
  const total = subtotal + otherFees;

  const handleProceedToPayment = () => {
    if (cart && generalNotes.trim()) {
      console.log('General notes:', generalNotes.trim());
    }
    router.push(`/${merchantCode}/payment?mode=${mode}`);
  };

  const handleAddItem = () => {
    router.push(`/${merchantCode}/order?mode=${mode}`);
  };

  const handleEditItem = async (item: CartItem) => {
    try {
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

  const handleCloseModal = () => {
    setSelectedMenu(null);
    setEditingCartItem(null);
  };

  if (isLoading || !cart) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING_CART} />;
  }

  return (
    <div className="min-h-screen bg-white-50 dark:bg-gray-900">
      {/* ===== HEADER (ESB Style) ===== */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.push(`/${merchantCode}/order?mode=${mode}`)}
            className="w-10 h-10 -ml-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Order</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="pb-36">
        {/* ===== ORDER TYPE CARD (ESB Exact Match) ===== */}
        <section className="pb-3">
          <div
            className="flex items-center justify-between mt-4 mx-3 relative"
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


        {/* ===== ORDERED ITEMS SECTION (ESB Exact CSS Match) ===== */}
        <section className="order-menu-section" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3">
            <h2
              className="flex-grow m-0"
              style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                color: '#101828',
                lineHeight: '24px'
              }}
            >
              Ordered Items ({cart.items.length})
            </h2>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 rounded-lg transition-colors"
              style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                color: '#f05a28',
                border: '1px solid #f05a28',
                backgroundColor: 'transparent'
              }}
            >
              + Add Item
            </button>
          </div>

          {/* Separator Line */}
          <div className="px-3">
            <hr style={{ borderColor: '#dee2e6', marginTop: '12px', marginBottom: '0' }} />
          </div>

          {/* Items List */}
          <div className="mt-3">
            {cart.items.map((item, index) => {
              const itemSubtotal = item.price * item.quantity;
              const addonsSubtotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0) * item.quantity;
              const totalItemPrice = itemSubtotal + addonsSubtotal;

              return (
                <div key={item.cartItemId} className="px-3">
                  {/* Item Name + Edit Button */}
                  <div className="flex items-center justify-between w-full">
                    <h3
                      className="m-0 flex-grow pr-2"
                      style={{
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#101828',
                        lineHeight: '17px'
                      }}
                    >
                      {item.menuName}
                    </h3>
                    <button
                      onClick={() => handleEditItem(item)}
                      className="flex items-center px-2.5 py-1 rounded transition-colors flex-shrink-0"
                      style={{
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#212529',
                        border: '1px solid #dee2e6',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <svg
                        style={{
                          width: '16px',
                          height: '16px',
                          marginRight: '6px',
                          color: '#6C6C6C'
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Addons/Extras */}
                  <div className="mt-1">
                    {item.addons && item.addons.length > 0 && (
                      <div className="flex flex-col">
                        {item.addons.map((addon, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 400,
                              color: '#6c757d'
                            }}
                          >
                            1x {addon.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="flex items-center my-2">
                      <div className="mr-2" style={{ minWidth: '18px', minHeight: '18px' }}>
                        <svg
                          style={{ width: '18px', height: '18px', color: '#6c757d' }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <p
                        className="m-0"
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: '#6c757d'
                        }}
                      >
                        {item.notes || 'No notes yet'}
                      </p>
                    </div>
                  </div>

                  {/* Price and Quantity */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col flex-grow">
                      <span
                        style={{
                          fontFamily: 'var(--font-inter), Inter, sans-serif',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#667085',
                          lineHeight: '22px'
                        }}
                      >
                        {formatCurrency(totalItemPrice, merchantCurrency)}
                      </span>
                    </div>

                    {/* Quantity Counter (ESB Style) */}
                    <div className="flex items-center">
                      {/* Minus Button */}
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            setRemoveItemId(item.cartItemId);
                            setRemoveItemName(item.menuName);
                          } else {
                            updateQuantity(item.cartItemId, item.quantity - 1, item.menuName);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center"
                        title={item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                      >
                        <svg style={{ width: '24px', height: '24px', color: '#212529' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" />
                        </svg>
                      </button>

                      {/* Quantity Display */}
                      <div
                        className="min-w-[28px] text-center"
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 400,
                          color: '#212529'
                        }}
                      >
                        {item.quantity}
                      </div>

                      {/* Plus Button */}
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center"
                        title="Increase quantity"
                      >
                        <svg style={{ width: '24px', height: '24px', color: '#212529' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm5-9h-4V7h-2v4H7v2h4v4h2v-4h4z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Separator (between items - solid line like ESB) */}
                  {index < cart.items.length - 1 && (
                    <hr style={{ borderColor: '#dee2e6', marginTop: '16px', marginBottom: '16px' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Dashed Separator before Add Notes (ESB Style) */}
          <hr
            style={{
              borderColor: '#dee2e6',
              width: '100%',
              margin: '1rem 0'
            }}
          />

          {/* Add Another Notes (ESB Style) */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => document.getElementById('general-notes')?.focus()}
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              marginLeft: '1rem',
              marginRight: '1rem',
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
              borderLeft: '3px solid #f05a28',
              fontSize: '0.9rem',
              fontStyle: 'italic',
              fontWeight: 400
            }}
          >
            <svg
              className="mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ minWidth: '24px', minHeight: '24px', width: '24px', color: '#808080' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span style={{ color: '#808080' }}>Add another notes</span>
          </div>

          {/* Notes Textarea (hidden initially, show when focused) */}
          <div className="px-3 pb-3">
            <textarea
              id="general-notes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Add notes for your entire order..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </section>

        {/* ===== PAYMENT DETAILS (ESB Exact Match) ===== */}
        <section
          className="flex flex-col pb-5"
          style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
        >
          <div
            className="mx-3 overflow-hidden"
            style={{
              border: '1px solid #d0d5dd',
              borderRadius: '16px',
              backgroundColor: 'white'
            }}
          >
            {/* Header */}
            <h2
              className="m-0 text-center"
              style={{
                padding: '12px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#101828'
              }}
            >
              Payment Details
            </h2>

            {/* Details Content */}
            <div
              className="flex flex-col"
              style={{
                padding: '12px',
                fontWeight: 600,
                backgroundColor: 'white',
                borderRadius: '16px'
              }}
            >
              {/* Other Fees - Expandable (ESB Style) */}
              {otherFees > 0 && (
                <div>
                  <button
                    onClick={() => setShowOtherFees(!showOtherFees)}
                    className="w-full flex items-center justify-between"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#aeb3be',
                      padding: '10px 0 20px',
                      borderBottom: '1px dashed #e4e7ec',
                      height: '35px',
                      alignItems: 'center'
                    }}
                  >
                    <div className="flex items-center">
                      <span>Incl. other fees</span>
                      <svg
                        className="ml-1"
                        style={{
                          width: '20px',
                          height: '20px',
                          transform: showOtherFees ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                    </div>
                    <span>
                      {formatCurrency(otherFees, merchantCurrency)}
                    </span>
                  </button>

                  {/* Expandable Fee Details */}
                  {showOtherFees && (
                    <div>
                      {taxAmount > 0 && (
                        <div
                          className="flex items-center justify-between"
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: '#aeb3be',
                            borderBottom: '1px dashed #e4e7ec',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            paddingLeft: '5px'
                          }}
                        >
                          <span className="flex-grow">Incl. Tax</span>
                          <span>{formatCurrency(taxAmount, merchantCurrency)}</span>
                        </div>
                      )}
                      {serviceChargeAmount > 0 && (
                        <div
                          className="flex items-center justify-between"
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: '#aeb3be',
                            borderBottom: '1px dashed #e4e7ec',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            paddingLeft: '5px'
                          }}
                        >
                          <span className="flex-grow">Service ({merchantServiceChargePercent}%)</span>
                          <span>{formatCurrency(serviceChargeAmount, merchantCurrency)}</span>
                        </div>
                      )}
                      {packagingFeeAmount > 0 && (
                        <div
                          className="flex items-center justify-between"
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: '#aeb3be',
                            borderBottom: '1px dashed #e4e7ec',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            paddingLeft: '5px'
                          }}
                        >
                          <span className="flex-grow">Packaging</span>
                          <span>{formatCurrency(packagingFeeAmount, merchantCurrency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <section
                className="flex items-center justify-between mb-1"
                style={{
                  fontWeight: 700,
                  fontSize: '1em'
                }}
              >
                <div
                  className="flex flex-grow mt-1"
                  style={{ lineHeight: '17px', color: '#212529' }}
                >
                  Total
                </div>
                <div style={{ color: '#f05a28' }}>
                  {formatCurrency(total, merchantCurrency)}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FIXED BOTTOM BAR (ESB Exact Match) ===== */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 z-10"
        style={{
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          borderRadius: '16px 16px 0 0',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Total Payment */}
          <div className="flex flex-col p-4">
            <div
              className="flex items-center"
              style={{ lineHeight: 1, color: '#667085', fontSize: '14px' }}
            >
              Total Payment
            </div>
            <div
              className="flex items-center"
              style={{ fontWeight: 'bold', fontSize: '20px', lineHeight: 1.5, color: '#101828' }}
            >
              {formatCurrency(total, merchantCurrency)}
            </div>
          </div>

          {/* Right: Button */}
          <div className="p-4">
            <button
              onClick={handleProceedToPayment}
              className="mt-2 px-6 py-4 text-white font-medium rounded-lg transition-all active:scale-[0.98]"
              style={{
                backgroundColor: '#f05a28',
                fontSize: '14px'
              }}
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>


      {/* ===== EDIT MENU MODAL ===== */}
      {
        selectedMenu && editingCartItem && (
          <MenuDetailModal
            menu={selectedMenu}
            merchantCode={merchantCode}
            mode={mode}
            currency={merchantCurrency}
            editMode={true}
            existingCartItem={editingCartItem}
            onClose={handleCloseModal}
          />
        )
      }

      {/* ===== REMOVE ITEM CONFIRMATION MODAL ===== */}
      {
        removeItemId && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[400]"
              onClick={() => {
                setRemoveItemId(null);
                setRemoveItemName('');
              }}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white dark:bg-gray-800 rounded-2xl z-[400] p-6 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
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
                  className="flex-1 h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="flex-1 h-12 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
}
