'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/utils/localStorage';
import type { Cart } from '@/lib/types/customer';

interface FloatingCartButtonProps {
  merchantCode: string;
}

/**
 * Floating Cart Button - Bottom Right
 * 
 * Based on FRONTEND_SPECIFICATION.md:
 * - Position: fixed bottom-right
 * - Size: 110x64px
 * - Background: #FF6B35 with box-shadow
 * - Content: cart icon + item count + total price
 * - Hide if cart empty
 * - Pulsing animation on item add
 */
export default function FloatingCartButton({ merchantCode }: FloatingCartButtonProps) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Load cart from localStorage
    const loadCart = () => {
      const cartData = getCart(merchantCode);
      setCart(cartData);
    };

    loadCart();

    // Listen for storage changes (cart updates)
    const handleStorageChange = () => {
      loadCart();
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom cart update event
    window.addEventListener('cartUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, [merchantCode]);

  // Don't show if cart is empty
  if (!cart || cart.items.length === 0) {
    return null;
  }

  // Calculate total items and price
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce((sum, item) => {
    const addOnsTotal = item.addons?.reduce((addOnSum: number, addOn: { price: number }) => addOnSum + addOn.price, 0) || 0;
    return sum + ((item.price + addOnsTotal) * item.quantity);
  }, 0);

  const handleClick = () => {
    router.push(`/${merchantCode}/view-order`);
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-4 w-[110px] h-16 bg-[#FF6B35] rounded-[32px] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 z-50 flex flex-col items-center justify-center text-white ${
        pulse ? 'animate-pulse' : ''
      }`}
      style={{
        boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
      }}
    >
      {/* Cart Icon with Badge */}
      <div className="relative mb-1">
        <span className="text-2xl">🛒</span>
        {/* Item Count Badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#1A1A1A] rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">
            {totalItems}
          </span>
        </div>
      </div>

      {/* Total Price - 14px/700 */}
      <span className="text-sm font-bold">
        Rp{totalPrice.toLocaleString('id-ID')}
      </span>
    </button>
  );
}
