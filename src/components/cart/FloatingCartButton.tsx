'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useCustomerData } from '@/context/CustomerDataContext';

interface FloatingCartButtonProps {
  merchantCode: string;
  mode?: 'dinein' | 'takeaway';
}

/**
 * Floating Checkout Button - Group Order Aware
 * 
 * When in group order:
 * - Shows total from ALL participants (sum of subtotals)
 * - Host: Goes to view-order page with groupOrder=true
 * - Non-host: Shows modal that only host can checkout
 */
export default function FloatingCartButton({ merchantCode, mode }: FloatingCartButtonProps) {
  const router = useRouter();
  const { cart, getItemCount, getTotal } = useCart();
  const { isInGroupOrder, isHost, session } = useGroupOrder();
  const { t } = useTranslation();
  const { preloadViewOrder, preloadPayment } = useCustomerData();
  const [pulse, setPulse] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);
  const [showNonHostModal, setShowNonHostModal] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  /**
   * Preload data for next pages on hover
   * Uses SWR cache warming for instant navigation
   */
  const handleMouseEnter = useCallback(() => {
    if (!hasPreloaded) {
      preloadViewOrder();
      preloadPayment();
      setHasPreloaded(true);
    }
  }, [hasPreloaded, preloadViewOrder, preloadPayment]);

  // Format currency
  const formatPrice = (amount: number, currency: string = 'AUD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate group order totals from session
  const groupTotals = useMemo(() => {
    if (!session?.participants) {
      return { totalItems: 0, totalPrice: 0 };
    }

    let totalItems = 0;
    let totalPrice = 0;

    session.participants.forEach(participant => {
      // Sum subtotals
      totalPrice += participant.subtotal || 0;

      // Count items from cartItems
      const cartItems = participant.cartItems;
      if (Array.isArray(cartItems)) {
        cartItems.forEach((item) => {
          totalItems += (item as { quantity?: number }).quantity || 1;
        });
      }
    });

    return { totalItems, totalPrice };
  }, [session?.participants]);

  // Determine display data
  const displayData = useMemo(() => {
    if (isInGroupOrder && session) {
      return groupTotals;
    }
    return {
      totalItems: getItemCount(),
      totalPrice: getTotal()
    };
  }, [isInGroupOrder, session, groupTotals, getItemCount, getTotal]);

  // Pulse effect when items added
  useEffect(() => {
    const currentCount = displayData.totalItems;
    if (currentCount > prevItemCount && prevItemCount > 0) {
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }
    setPrevItemCount(currentCount);
  }, [displayData.totalItems, prevItemCount]);

  // Don't show if no items
  if (!isInGroupOrder && (!cart || cart.items.length === 0)) {
    return null;
  }

  if (isInGroupOrder && displayData.totalItems === 0) {
    return null;
  }

  const handleClick = () => {
    if (isInGroupOrder) {
      if (isHost) {
        // Host: Go to view-order with group order flag
        const modeParam = mode || (session?.orderType === 'DINE_IN' ? 'dinein' : 'takeaway');
        router.push(`/${merchantCode}/view-order?mode=${modeParam}&groupOrder=true`);
      } else {
        // Non-host: Show modal
        setShowNonHostModal(true);
      }
    } else {
      // Normal checkout
      const modeParam = mode || cart?.mode || 'takeaway';
      router.push(`/${merchantCode}/view-order?mode=${modeParam}`);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[450px] mx-auto px-4 pb-5">
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleMouseEnter}
          className={`
            w-full
            flex items-stretch justify-between
            bg-white
            rounded-xl
            shadow-lg hover:shadow-xl
            transition-all duration-200
            overflow-hidden
            ${pulse ? 'animate-pulse' : ''}
          `}
          aria-label={`Checkout: ${displayData.totalItems} items, total ${formatPrice(displayData.totalPrice)}`}
        >
          {/* LEFT: Cart Icon with Badge */}
          <div className="relative flex items-center justify-center w-14 bg-white py-2">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>

            {/* Badge */}
            <div className="absolute top-1 right-1 min-w-5 h-5 px-1.5 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {displayData.totalItems}
            </div>
          </div>

          {/* CENTER: Total */}
          <div className="flex flex-col items-start justify-center px-3 py-2.5 flex-1 bg-white">
            <span className="text-[10px] text-gray-500 font-medium">
              {isInGroupOrder ? 'Group Total' : t('customer.cart.total')}
            </span>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(displayData.totalPrice)}
            </span>
          </div>

          {/* RIGHT: CHECK OUT */}
          <div className="flex items-center justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 transition-colors">
            <span className="text-sm font-bold text-white whitespace-nowrap">
              {t('customer.cart.checkout')} ({displayData.totalItems})
            </span>
          </div>
        </button>
      </div>

      {/* Non-Host Modal */}
      {showNonHostModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setShowNonHostModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center animate-slideUp">
            <div className="w-full max-w-[500px] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Host Only Checkout
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Only the group host can submit the order and complete payment. Your items have been added to the group order.
                </p>
              </div>

              <button
                onClick={() => setShowNonHostModal(false)}
                className="w-full h-12 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                OK, Got It
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-slideUp { animation: slideUp 0.3s ease-out; }
          `}</style>
        </>
      )}
    </>
  );
}
