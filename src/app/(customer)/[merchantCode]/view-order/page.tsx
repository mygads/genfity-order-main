'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCart,
  updateCartItemQuantity,
  removeFromCart,
} from '@/lib/utils/localStorage';
import type { Cart, OrderMode } from '@/lib/types/customer';

/**
 * Cart Review Page - Redesigned
 * 
 * Based on FRONTEND_SPECIFICATION.md (Tasks 16-20):
 * - Fixed header 56px: back button, "Keranjang" title
 * - Order mode badge: emoji + mode name, table number for dine-in
 * - Cart items list: 70x70px image, name 14px/600, addons 12px, price 16px/700
 * - Quantity controls: minus/plus buttons 32x32px, number display
 * - Delete button: trash icon, red color
 * - Notes display: read-only, 12px/400
 * - Summary card: Subtotal + Total, 16px/700
 * - Bottom action button: "Lanjut Bayar" 48px #FF6B35
 */
export default function ViewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [cart, setCart] = useState<Cart | null>(null);

  const loadCart = () => {
    const cartData = getCart(merchantCode);
    if (!cartData || cartData.items.length === 0) {
      router.push(`/${merchantCode}/home?mode=${mode}`);
      return;
    }
    setCart(cartData);
  };

  useEffect(() => {
    loadCart();
    
    // Listen for cart updates
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode]);

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartItemQuantity(merchantCode, index, newQuantity);
    loadCart();
  };

  const handleRemoveItem = (index: number) => {
    if (confirm('Hapus item ini dari keranjang?')) {
      removeFromCart(merchantCode, index);
      loadCart();
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID')}`;
  };

  if (!cart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-[#666666]">Memuat keranjang...</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cart.items.reduce((sum: number, item) => sum + item.subtotal, 0);
  const total = subtotal; // No service fee for MVP

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Fixed Header - 56px */}
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-[100]">
        {/* Left: Back Button */}
        <Link href={`/${merchantCode}/home?mode=${mode}`} className="flex items-center gap-2 text-[#1A1A1A]">
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">Kembali</span>
        </Link>

        {/* Center: Title */}
        <h1 className="text-base font-bold text-[#1A1A1A]">Keranjang</h1>

        {/* Right: Placeholder for symmetry */}
        <div className="w-16" />
      </header>

      {/* Order Mode Badge */}
      <div className="px-4 pt-4 pb-3">
        <div className="p-3 bg-[#FFF5F0] border border-[#FF6B35] rounded-lg flex items-center gap-3">
          <span className="text-2xl">{mode === 'dinein' ? '🍽️' : '🛍️'}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {mode === 'dinein' ? 'Makan di Tempat' : 'Ambil Sendiri'}
            </p>
            {cart.tableNumber && (
              <p className="text-xs text-[#666666]">Meja #{cart.tableNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      <main className="px-4 pb-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[#1A1A1A]">
            Item ({cart.items.length})
          </h2>
        </div>

        <div className="space-y-3">
          {cart.items.map((item, index) => (
            <div
              key={index}
              className="border border-[#E0E0E0] rounded-lg p-3 bg-white"
            >
              {/* Item Header */}
              <div className="flex gap-3 mb-3">
                {/* Image - 70x70px */}
                <div className="flex-shrink-0 w-[70px] h-[70px] bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-3xl">
                  🍜
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name - 14px/600 */}
                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">
                    {item.menuName}
                  </h3>

                  {/* Base Price - 12px/400 */}
                  <p className="text-xs text-[#666666] mb-1">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>

                  {/* Addons - 12px/400 */}
                  {item.addons.length > 0 && (
                    <div className="space-y-0.5 mb-2">
                      {item.addons.map((addon, addonIndex) => (
                        <p key={addonIndex} className="text-xs text-[#999999]">
                          + {addon.name} ({formatCurrency(addon.price)})
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Notes - 12px/400 */}
                  {item.notes && (
                    <div className="mt-2 p-2 bg-[#F9F9F9] rounded border border-[#E0E0E0]">
                      <p className="text-xs text-[#666666]">
                        📝 {item.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="flex-shrink-0 self-start w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors"
                  aria-label="Hapus item"
                >
                  🗑️
                </button>
              </div>

              {/* Item Footer: Price + Quantity Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E0E0E0]">
                {/* Subtotal - 16px/700 */}
                <span className="text-base font-bold text-[#FF6B35]">
                  {formatCurrency(item.subtotal)}
                </span>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3">
                  {/* Minus Button - 32x32px */}
                  <button
                    onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 rounded-full border-2 border-[#E0E0E0] flex items-center justify-center text-lg text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    −
                  </button>

                  {/* Quantity Display - 14px/700 */}
                  <span className="text-sm font-bold text-[#1A1A1A] w-8 text-center">
                    {item.quantity}
                  </span>

                  {/* Plus Button - 32x32px */}
                  <button
                    onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                    disabled={item.quantity >= 99}
                    className="w-8 h-8 rounded-full border-2 border-[#FF6B35] bg-[#FF6B35] flex items-center justify-center text-lg text-white hover:bg-[#E55A2B] hover:border-[#E55A2B] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="mt-6 p-4 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0]">
          <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">
            Ringkasan Pembayaran
          </h3>

          <div className="space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm text-[#666666]">
              <span>Subtotal ({cart.items.length} item)</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-[#E0E0E0] flex justify-between items-center">
              <span className="text-base font-bold text-[#1A1A1A]">Total</span>
              <span className="text-xl font-bold text-[#FF6B35]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Button - 48px + padding */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] px-4 py-3 z-[90]">
        <Link
          href={`/${merchantCode}/payment?mode=${mode}`}
          className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg flex items-center justify-between px-5 hover:bg-[#E55A2B] transition-all active:scale-[0.98]"
        >
          <span>Lanjut Bayar</span>
          <span>{formatCurrency(total)}</span>
        </Link>
      </div>
    </div>
  );
}
