'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';

interface FloatingCartButtonProps {
  merchantCode: string;
  mode?: 'dinein' | 'takeaway';
}

export default function FloatingCartButton({ merchantCode, mode }: FloatingCartButtonProps) {
  const router = useRouter();
  const { cart, getItemCount, getTotal } = useCart();
  const [pulse, setPulse] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);

  // ✅ Pulse animation on item count change
  useEffect(() => {
    if (!cart) return;

    const currentCount = getItemCount();

    console.log('🔔 [FLOAT BTN] Cart updated:', {
      currentCount,
      prevCount: prevItemCount,
      items: cart.items.map(i => ({
        name: i.menuName,
        price: i.price,
        qty: i.quantity,
        subtotal: i.price * i.quantity,
      })),
    });

    if (currentCount > prevItemCount) {
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }

    setPrevItemCount(currentCount);
  }, [cart, getItemCount, prevItemCount]);

  if (!cart || cart.items.length === 0) {
    console.log('👻 [FLOAT BTN] Hidden (cart empty)');
    return null;
  }

  const totalItems = getItemCount();
  const totalPrice = getTotal();

  console.log('🎈 [FLOAT BTN] Displayed:', {
    totalItems,
    totalPrice,
    formattedPrice: formatCurrency(totalPrice),
  });

  const handleClick = () => {
    const modeParam = mode || cart.mode || 'takeaway';
    console.log('🎯 [FLOAT BTN] Navigating to view-order:', {
      merchantCode,
      mode: modeParam,
      url: `/${merchantCode}/view-order?mode=${modeParam}`,
    });
    router.push(`/${merchantCode}/view-order?mode=${modeParam}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed bottom-4 right-4 z-50
        flex flex-col items-center justify-center
        w-[110px] h-16
        bg-primary text-white
        rounded-xl
        shadow-floating
        hover:bg-primary-hover
        hover:scale-105
        active:scale-95
        transition-all duration-200
        ${pulse ? 'animate-pulse' : ''}
      `}
      aria-label={`View cart: ${totalItems} items, total ${formatCurrency(totalPrice)}`}
    >
      <span className="text-xs font-medium text-white/80">
        {totalItems} Item
      </span>

      <span className="text-sm font-bold text-white mt-0.5">
        {formatCurrency(totalPrice)}
      </span>
    </button>
  );
}


