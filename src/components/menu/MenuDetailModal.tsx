'use client';

import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import Image from 'next/image';

interface Addon {
  id: number;
  name: string;
  price: number;
  category_id: number;
}

interface AddonCategory {
  id: number;
  name: string;
  type: 'required' | 'optional';
  min_selections: number;
  max_selections: number;
  addons: Addon[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number; // ✅ Sudah benar
  image_url: string | null;
  stockQty: number;
}

interface MenuDetailModalProps {
  menu: MenuItem;
  merchantCode: string;
  mode: string;
  onClose: () => void;
}

/**
 * GENFITY - Menu Detail Modal
 * BottomSheet presentation for menu details with addons
 * 
 * Features:
 * - Menu image, name, description, base price
 * - Addon categories (required vs optional)
 * - Min/max selection enforcement
 * - Quantity stepper
 * - Notes textarea
 * - Real-time price calculation: (basePrice + addons) * quantity
 */
export default function MenuDetailModal({ menu, merchantCode, mode, onClose }: MenuDetailModalProps) {
  const { addItem, initializeCart, cart } = useCart();

  // Initialize cart if not exists
  useEffect(() => {
    if (!cart || cart.merchantCode !== merchantCode || cart.mode !== mode) {
      initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
    }
  }, [cart, merchantCode, mode, initializeCart]);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch addon categories
  useEffect(() => {
    const fetchAddons = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}/menus/${menu.id}/addons`);
        const data = await response.json();

        if (data.success) {
          // ✅ Sanitize addon prices
          const sanitized = (data.data || []).map((category: AddonCategory) => ({
            ...category,
            addons: category.addons.map((addon) => ({
              ...addon,
              price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price,
            })),
          }));
          setAddonCategories(sanitized);
        }
      } catch (err) {
        console.error('Error fetching addons:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddons();
  }, [merchantCode, menu.id]);

  // Calculate total price
  const calculateTotal = () => {
    // ✅ FORCE menu.price to number
    const basePrice = typeof menu.price === 'string' ? parseFloat(menu.price) : menu.price;
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return (basePrice + addonsTotal) * quantity;
  };

  // Handle addon selection
  const handleAddonToggle = (addon: Addon, category: AddonCategory) => {
    const isSelected = selectedAddons.some(a => a.id === addon.id);

    if (isSelected) {
      // Remove addon
      setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
    } else {
      // Check max selections for this category
      const currentCategoryAddons = selectedAddons.filter(a => a.category_id === category.id);

      if (currentCategoryAddons.length >= category.max_selections) {
        // Replace first one if radio (max = 1)
        if (category.max_selections === 1) {
          setSelectedAddons(prev => [
            ...prev.filter(a => a.category_id !== category.id),
            addon
          ]);
        }
        return;
      }

      // Add addon
      setSelectedAddons(prev => [...prev, addon]);
    }
  };

  // Validate selections
  const validateSelections = (): string | null => {
    for (const category of addonCategories) {
      const categoryAddons = selectedAddons.filter(a => a.category_id === category.id);

      if (category.type === 'required' && categoryAddons.length < category.min_selections) {
        return `Pilih minimal ${category.min_selections} ${category.name}`;
      }
    }
    return null;
  };

  // ✅ NEW: Prevent double-add in React Strict Mode
  const isAddingRef = useRef(false);

  /**
   * ✅ FIXED: Prevent double-add in React Strict Mode
   * 
   * @description
   * React Strict Mode intentionally double-invokes functions in development.
   * Use ref flag to prevent addItem from being called twice.
   * 
   * @specification copilot-instructions.md - React Development Best Practices
   */
  const handleAddToCart = () => {
    // ✅ Guard against double-invocation
    if (isAddingRef.current) {
      console.warn('⚠️ [MODAL] Add to cart already in progress, skipping');
      return;
    }

    isAddingRef.current = true;

    console.log('🛒 [MODAL] Adding to cart:', {
      menuName: menu.name,
      price: menu.price,
      priceType: typeof menu.price,
      quantity,
      addons: selectedAddons.length,
    });

    addItem({
      menuId: menu.id.toString(),
      menuName: menu.name,
      price: menu.price, // ✅ Pass as number
      quantity,
      addons: selectedAddons,
      notes: notes.trim() || undefined,
    });

    console.log('✅ [MODAL] Item added successfully');

    // ✅ Reset flag after 500ms (enough time for state update)
    setTimeout(() => {
      isAddingRef.current = false;
      onClose();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-h-[90vh] bg-white rounded-t-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="relative w-full h-[200px] bg-secondary">
            {menu.image_url ? (
              <Image
                src={menu.image_url}
                alt={menu.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-6xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4">
            <h2 className="text-xl font-bold text-primary-dark mb-2">
              {menu.name}
            </h2>
            <p className="text-lg font-bold text-primary mb-3">
              {formatCurrency(menu.price)}
            </p>
            {menu.description && (
              <p className="text-sm text-secondary leading-relaxed mb-4">
                {menu.description}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 mb-4 p-3 bg-danger/10 border-l-4 border-danger rounded text-sm text-danger">
              {error}
            </div>
          )}

          {/* Addon Categories */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : addonCategories.length > 0 ? (
            <div className="px-4 pb-4 space-y-6">
              {addonCategories.map((category) => (
                <div key={category.id} className="border-t border-neutral-200 pt-4">
                  {/* Category Header */}
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-primary-dark">
                      {category.name}
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      {category.type === 'required' ? '(Wajib)' : '(Opsional)'}
                      {category.max_selections > 1 && ` - Pilih maksimal ${category.max_selections}`}
                    </p>
                  </div>

                  {/* Addon Items */}
                  <div className="space-y-2">
                    {category.addons.map((addon) => {
                      const isSelected = selectedAddons.some(a => a.id === addon.id);
                      const inputType = category.max_selections === 1 ? 'radio' : 'checkbox';

                      return (
                        <label
                          key={addon.id}
                          className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0 cursor-pointer"
                        >
                          <input
                            type={inputType}
                            name={`category-${category.id}`}
                            checked={isSelected}
                            onChange={() => handleAddonToggle(addon, category)}
                            className="w-5 h-5 text-primary focus:ring-primary border-neutral-300 rounded"
                          />
                          <span className="flex-1 text-sm text-primary-dark">
                            {addon.name}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            + {formatCurrency(addon.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Notes */}
          <div className="px-4 pb-4">
            <label className="block text-sm font-semibold text-primary-dark mb-2">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="Contoh: Sedikit gula, tidak pedas"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 ring-primary/20 focus:border-primary resize-none"
            />
            <p className="text-xs text-tertiary text-right mt-1">
              {notes.length}/200
            </p>
          </div>

          {/* Quantity */}
          <div className="px-4 pb-6">
            <label className="block text-sm font-semibold text-primary-dark mb-3">
              Jumlah Pesanan
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
                className="w-10 h-10 flex items-center justify-center border border-neutral-200 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <span className="w-16 text-center text-base font-semibold text-primary-dark">
                {quantity}
              </span>

              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center border border-neutral-200 rounded-lg hover:bg-secondary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Button */}
        <div className="sticky bottom-0 p-4 bg-white border-t border-neutral-200 shadow-lg">
          <button
            onClick={handleAddToCart}
            className="w-full h-12 bg-primary text-white text-base font-semibold rounded-lg hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-between px-6"
          >
            <span>Tambah Pesanan</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
