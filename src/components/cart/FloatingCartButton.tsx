'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

interface FloatingCartButtonProps {
  merchantCode: string;
  mode?: 'dinein' | 'takeaway';
}

/**
 * ✅ REDESIGNED: Floating Checkout Button
 * 
 * @description
 * Three-section layout matching reference design:
 * - Left: Cart icon with item count badge
 * - Center: Total label and price
 * - Right: CHECK OUT button with item count
 * 
 * @specification Based on "Burjo Ngegas Gombel" checkout footer
 */
export default function FloatingCartButton({ merchantCode, mode }: FloatingCartButtonProps) {
  const router = useRouter();
  const { cart, getItemCount, getTotal } = useCart();
  const [pulse, setPulse] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);

  // Format currency based on merchant settings
  const formatPrice = (amount: number, currency: string = 'AUD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    if (!cart) return;

    const currentCount = getItemCount();

    if (currentCount > prevItemCount) {
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }

    setPrevItemCount(currentCount);
  }, [cart, getItemCount, prevItemCount]);

  if (!cart || cart.items.length === 0) {
    return null;
  }

  const totalItems = getItemCount();
  const totalPrice = getTotal();

  const handleClick = () => {
    const modeParam = mode || cart.mode || 'takeaway';
    router.push(`/${merchantCode}/view-order?mode=${modeParam}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[450px] mx-auto px-4 pb-5 ">
      <button
        onClick={handleClick}
        className={`
          w-full
          flex items-stretch justify-between
          bg-white
          rounded-xl
          shadow-lg hover:shadow-xl
          transition-all duration-200
          overflow-hidden shadow-xl
          ${pulse ? 'animate-pulse' : ''}
        `}
        aria-label={`Checkout: ${totalItems} items, total ${formatPrice(totalPrice)}`}
      >
        {/* LEFT: Cart Icon with Badge - White Box */}
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

          {/* Orange Badge - Menempel di atas icon */}
          <div className="absolute top-1 right-1 min-w-5 h-5 px-1.5 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {totalItems}
          </div>
        </div>

        {/* CENTER: Total - White Background */}
        <div className="flex flex-col items-start justify-center px-3 py-2.5 flex-1 bg-white">
          <span className="text-[10px] text-gray-500 font-medium">
            Total
          </span>
          <span className="text-base font-bold text-gray-900">
            {formatPrice(totalPrice)}
          </span>
        </div>

        {/* RIGHT: CHECK OUT - Orange Box */}
        <div className="flex items-center justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 transition-colors">
          <span className="text-sm font-bold text-white whitespace-nowrap">
            CHECK OUT ({totalItems})
          </span>
        </div>
      </button>
    </div>
  );
}


