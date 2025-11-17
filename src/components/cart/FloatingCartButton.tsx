'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';

interface FloatingCartButtonProps {
  merchantCode: string;
  mode?: 'dinein' | 'takeaway';
}

/**
 * ✅ ENHANCED: Floating Cart Button
 * 
 * @improvements
 * - Item count badge animation
 * - Pulse on new item
 * - Better shadow/elevation
 * - Accessible (ARIA)
 */
export default function FloatingCartButton({ merchantCode, mode }: FloatingCartButtonProps) {
  const router = useRouter();
  const { cart, getItemCount, getTotal } = useCart();
  const [pulse, setPulse] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);

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
    <button
      onClick={handleClick}
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3
        px-6 py-3
        bg-orange-500 hover:bg-orange-600 text-white
        rounded-full
        shadow-[0_8px_30px_rgb(249,115,22,0.3)]
        hover:shadow-[0_8px_40px_rgb(249,115,22,0.4)]
        hover:scale-105
        active:scale-95
        transition-all duration-200
        ${pulse ? 'animate-pulse' : ''}
      `}
      aria-label={`View cart: ${totalItems} items, total ${formatCurrency(totalPrice)}`}
    >
      {/* ✅ Cart Icon with Badge */}
      <div className="relative">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.1 15.9 4.5 17 5.4 17H17M17 17C15.9 17 15 17.9 15 19C15 20.1 15.9 21 17 21C18.1 21 19 20.1 19 19C19 17.9 18.1 17 17 17ZM9 19C9 20.1 8.1 21 7 21C5.9 21 5 20.1 5 19C5 17.9 5.9 17 7 17C8.1 17 9 17.9 9 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        
        {/* Item Count Badge */}
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-500 text-xs font-bold rounded-full flex items-center justify-center shadow-md">
          {totalItems}
        </span>
      </div>

      {/* Price */}
      <div className="flex flex-col items-start">
        <span className="text-xs font-medium opacity-90">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
        <span className="text-base font-bold">
          {formatCurrency(totalPrice)}
        </span>
      </div>

      {/* Arrow */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}


