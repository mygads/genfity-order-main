'use client';

import { useState } from 'react';
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';

interface MenuInCartModalProps {
  menuName: string;
  currency: string;
  items: CartItem[];
  onClose: () => void;
  onEditItem: (item: CartItem) => void;
  onCreateAnother: () => void;
  onIncreaseQty: (item: CartItem) => void;
  onDecreaseQty: (item: CartItem) => void;
}

function groupAddons(addons: CartItem['addons']): Array<{ name: string; count: number; unitPrice: number }> {
  const grouped = new Map<string, { name: string; count: number; unitPrice: number }>();

  for (const addon of addons || []) {
    const key = `${addon.id}::${addon.name}::${addon.price}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(key, { name: addon.name, count: 1, unitPrice: addon.price });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getItemTotal(item: CartItem): number {
  const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);
  return (item.price + addonsTotal) * item.quantity;
}

export default function MenuInCartModal({
  menuName,
  currency,
  items,
  onClose,
  onEditItem,
  onCreateAnother,
  onIncreaseQty,
  onDecreaseQty,
}: MenuInCartModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  // ✅ Handle smooth close
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  return (
    <>
      <style>{`
        @keyframes menuInCartSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes menuInCartSlideDown {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0;
          }
        }
        @keyframes menuInCartFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes menuInCartFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .menu-in-cart-slide-up {
          animation: menuInCartSlideUp 0.3s ease-out forwards;
        }
        .menu-in-cart-slide-down {
          animation: menuInCartSlideDown 0.25s ease-in forwards;
        }
        .menu-in-cart-fade-in {
          animation: menuInCartFadeIn 0.2s ease-out;
        }
        .menu-in-cart-fade-out {
          animation: menuInCartFadeOut 0.25s ease-in forwards;
        }
      `}</style>
      <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 300 }}>
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 ${isClosing ? 'menu-in-cart-fade-out' : 'menu-in-cart-fade-in'}`}
          onClick={handleClose}
        />

        <div className={`relative w-full max-w-[500px] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl ${isClosing ? 'menu-in-cart-slide-down' : 'menu-in-cart-slide-up'} flex flex-col max-h-[80vh]`}>
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{menuName}</h3>
            <button
              onClick={handleClose}
              className="shrink-0 w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-3 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No items in cart for this menu</p>
              </div>
            ) : items.map((item) => {
              const groupedAddons = groupAddons(item.addons);
              const hasNotes = Boolean(item.notes && item.notes.trim());

              return (
                <div
                  key={item.cartItemId}
                  className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Addon Details */}
                    <div className="min-w-0 flex-1">
                      {groupedAddons.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No addons selected</div>
                      ) : (
                        <div className="space-y-0.5">
                          {groupedAddons.map((a, idx) => (
                            <div key={`${a.name}-${idx}`} className="text-sm text-gray-900 dark:text-white">
                              x{a.count} {a.name}
                              {a.unitPrice > 0 && (
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  {formatCurrency(a.unitPrice * a.count, currency)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      <div className="flex items-center gap-1.5 mt-2 text-gray-500 dark:text-gray-400">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs">
                          {hasNotes ? item.notes : 'No notes'}
                        </span>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => onEditItem(item)}
                      className="shrink-0 h-7 px-2 border border-black dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Edit
                    </button>
                  </div>

                  {/* Price and Quantity - Single Row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {formatCurrency(getItemTotal(item), currency)}
                    </div>

                    {/* Quantity Controls - Single Row */}
                    <div className="flex items-center">
                      <button
                        onClick={() => onDecreaseQty(item)}
                        className="w-6 h-6 rounded-full border border-black dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                      <span className="w-12 text-center text-base font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onIncreaseQty(item)}
                        className="w-6 h-6 rounded-full border border-black dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Button */}
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={onCreateAnother}
              className="w-full h-12 text-white font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: '#F05A28' }}
            >
              Make Another
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
