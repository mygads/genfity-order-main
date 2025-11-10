'use client';

import { useState, useEffect } from 'react';
import type { MenuItem, CartAddon } from '@/lib/types/customer';

/**
 * Menu Detail Modal Component
 * 
 * Based on FRONTEND_SPECIFICATION.md:
 * - Bottom sheet: slide from bottom 0.3s, max-height 85vh
 * - Image banner: 200px height, gradient overlay
 * - Menu name: 20px/700 #1A1A1A
 * - Description: 14px/400 #666, line-height 1.5
 * - Base price: 16px/700 #FF6B35
 * - Add-ons section: checkbox list, 14px, +Rp{price}
 * - Notes: textarea 48px min-height, 200 char max
 * - Quantity: plus/minus buttons 40x40px, number display 16px/700
 * - Total: 20px/700 #1A1A1A, Rp{total}
 * - Add to cart: 48px #FF6B35, full width
 */
interface MenuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu: MenuItem | null;
  onAddToCart: (menuId: bigint, quantity: number, notes: string, addons: CartAddon[]) => void;
}

export default function MenuDetailModal({
  isOpen,
  onClose,
  menu,
  onAddToCart,
}: MenuDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Set<bigint>>(new Set());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes('');
      setSelectedAddons(new Set());
    }
  }, [isOpen]);

  if (!isOpen || !menu) return null;

  const handleToggleAddon = (addonId: bigint) => {
    const newSet = new Set(selectedAddons);
    if (newSet.has(addonId)) {
      newSet.delete(addonId);
    } else {
      newSet.add(addonId);
    }
    setSelectedAddons(newSet);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setNotes(value);
    }
  };

  const calculateTotal = (): number => {
    let total = menu.price * quantity;
    
    // Add addons price
    if (menu.addonCategories && menu.addonCategories.length > 0) {
      let addonsPrice = 0;
      menu.addonCategories.forEach((category) => {
        category.items.forEach((item) => {
          if (selectedAddons.has(item.id)) {
            addonsPrice += item.price;
          }
        });
      });
      total += addonsPrice * quantity;
    }
    
    return total;
  };

  const handleSubmit = () => {
    if (!menu.isAvailable) return;

    // Build addons array
    const cartAddons: CartAddon[] = [];
    if (menu.addonCategories && menu.addonCategories.length > 0) {
      menu.addonCategories.forEach((category) => {
        category.items.forEach((item) => {
          if (selectedAddons.has(item.id)) {
            cartAddons.push({
              id: BigInt(0), // Will be set by localStorage utility
              addonItemId: item.id,
              name: item.name,
              price: item.price,
              quantity: 1,
            });
          }
        });
      });
    }

    onAddToCart(menu.id, quantity, notes.trim(), cartAddons);
    onClose();
  };

  const total = calculateTotal();
  const hasAddons = menu.addonCategories && menu.addonCategories.length > 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-[250] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[250] max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[#666666] hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-[#E0E0E0] rounded-full" />
        </div>

        {/* Image Banner - 200px */}
        <div className="relative w-full h-[200px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-20" />
          <span className="text-7xl z-10">🍜</span>
          
          {/* Unavailable Badge */}
          {!menu.isAvailable && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full">
              Tidak Tersedia
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-6">
          {/* Menu Name - 20px/700 */}
          <h2 className="text-xl font-bold text-[#1A1A1A] mt-4 mb-2">
            {menu.name}
          </h2>

          {/* Description - 14px/400 */}
          {menu.description && (
            <p className="text-sm text-[#666666] leading-relaxed mb-3">
              {menu.description}
            </p>
          )}

          {/* Base Price - 16px/700 */}
          <div className="mb-6">
            <span className="text-base font-bold text-[#FF6B35]">
              Rp{menu.price.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Add-ons Section */}
          {hasAddons && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">
                Tambahan (Opsional)
              </h3>
              <div className="space-y-4">
                {menu.addonCategories!.map((category) => (
                  <div key={category.id.toString()}>
                    {/* Category Name */}
                    <h4 className="text-sm font-medium text-[#666666] mb-2">
                      {category.name}
                      {category.maxSelection > 0 && (
                        <span className="ml-2 text-xs text-[#999999]">
                          (Maks. {category.maxSelection})
                        </span>
                      )}
                    </h4>
                    
                    {/* Addon Items */}
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <label
                          key={item.id.toString()}
                          className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg cursor-pointer hover:border-[#FF6B35] transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedAddons.has(item.id)}
                              onChange={() => handleToggleAddon(item.id)}
                              disabled={!item.isAvailable}
                              className="w-5 h-5 text-[#FF6B35] border-[#E0E0E0] rounded focus:ring-[#FF6B35] focus:ring-offset-0 disabled:opacity-30"
                            />
                            {/* Item Name - 14px/400 */}
                            <span className={`text-sm ${!item.isAvailable ? 'text-[#999999] line-through' : 'text-[#1A1A1A]'}`}>
                              {item.name}
                            </span>
                          </div>
                          {/* Item Price - 14px/600 */}
                          <span className="text-sm font-semibold text-[#FF6B35]">
                            +Rp{item.price.toLocaleString('id-ID')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-6">
            <label className="block text-base font-semibold text-[#1A1A1A] mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Contoh: Tidak pakai cabe, kuah banyak..."
              className="w-full min-h-[48px] px-4 py-3 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] resize-none"
              rows={3}
            />
            <div className="text-xs text-[#999999] text-right mt-1">
              {notes.length}/200 karakter
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="mb-6">
            <label className="block text-base font-semibold text-[#1A1A1A] mb-3">
              Jumlah
            </label>
            <div className="flex items-center gap-4">
              {/* Minus Button - 40x40px */}
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-full border-2 border-[#E0E0E0] flex items-center justify-center text-xl text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                −
              </button>

              {/* Quantity Display - 16px/700 */}
              <span className="text-base font-bold text-[#1A1A1A] w-12 text-center">
                {quantity}
              </span>

              {/* Plus Button - 40x40px */}
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                className="w-10 h-10 rounded-full border-2 border-[#FF6B35] bg-[#FF6B35] flex items-center justify-center text-xl text-white hover:bg-[#E55A2B] hover:border-[#E55A2B] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Total Price - 20px/700 */}
          <div className="flex items-center justify-between p-4 bg-[#F9F9F9] rounded-lg mb-4">
            <span className="text-base font-semibold text-[#666666]">Total Harga</span>
            <span className="text-xl font-bold text-[#1A1A1A]">
              Rp{total.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Add to Cart Button - 48px */}
          <button
            onClick={handleSubmit}
            disabled={!menu.isAvailable}
            className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] disabled:bg-[#E0E0E0] disabled:text-[#999999] disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {menu.isAvailable ? 'Tambahkan ke Keranjang' : 'Menu Tidak Tersedia'}
          </button>
        </div>
      </div>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
