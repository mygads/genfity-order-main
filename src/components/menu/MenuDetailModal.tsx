'use client';

import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import Image from 'next/image';

interface Addon {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  isAvailable: boolean;
}

interface AddonCategory {
  id: number;
  name: string;
  type: 'required' | 'optional';
  minSelections: number;
  maxSelections: number;
  addons: Addon[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number;
  isActive: boolean;
  trackStock: boolean;
  isPromo?: boolean;
  promoPrice?: number;
  addonCategories?: AddonCategory[];
}

interface MenuDetailModalProps {
  menu: MenuItem;
  merchantCode: string;
  mode: string;
  currency?: string;
  editMode?: boolean;
  existingCartItem?: CartItem | null;
  onClose: () => void;
}

/**
 * GENFITY - Menu Detail Modal
 * Mobile-first bottom sheet matching reference design
 * 
 * @specification copilot-instructions.md - Mobile First Design
 * 
 * Layout Structure (max-w-[420px]):
 * - Image banner with close/expand buttons
 * - Menu info section (name, price, description, icons)
 * - Add-ons section with quantity controls
 * - Notes textarea
 * - Fixed bottom bar with total order quantity and add button
 */
export default function MenuDetailModal({
  menu,
  merchantCode,
  mode,
  currency = 'AUD',
  editMode = false,
  existingCartItem = null,
  onClose
}: MenuDetailModalProps) {
  const { addItem, updateItem, initializeCart, cart } = useCart();

  // Initialize cart if not exists
  useEffect(() => {
    if (!cart || cart.merchantCode !== merchantCode || cart.mode !== mode) {
      initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
    }
  }, [cart, merchantCode, mode, initializeCart]);

  const [quantity, setQuantity] = useState(editMode && existingCartItem ? existingCartItem.quantity : 1);
  const [notes, setNotes] = useState(editMode && existingCartItem ? existingCartItem.notes || '' : '');
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const isAddingRef = useRef(false);

  // Fetch addon categories
  useEffect(() => {
    const fetchAddons = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}/menus/${menu.id}/addons`);
        const data = await response.json();

        if (data.success) {
          const sanitized = (data.data || []).map((category: AddonCategory) => ({
            ...category,
            addons: category.addons.map((addon: Addon) => ({
              ...addon,
              price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price,
            })),
          }));

          console.log('📋 [FETCH ADDONS] Categories loaded:', {
            categoriesCount: sanitized.length,
            categories: sanitized.map((cat: AddonCategory) => ({
              id: cat.id,
              name: cat.name,
              addonsCount: cat.addons.length,
              addonIds: cat.addons.map((a: Addon) => a.id),
            })),
          });

          setAddonCategories(sanitized);

          // Pre-fill addons in edit mode
          if (editMode && existingCartItem && existingCartItem.addons) {
            const addonQtyMap: Record<number, number> = {};
            existingCartItem.addons.forEach((addon: { id: string; name: string; price: number }) => {
              const addonIdNum = parseInt(addon.id); // Convert string id to number
              // Aggregate quantities (duplicate entries represent quantity > 1)
              addonQtyMap[addonIdNum] = (addonQtyMap[addonIdNum] || 0) + 1;
            });
            console.log('🔄 [EDIT MODE] Pre-filled addons:', addonQtyMap);
            setSelectedAddons(addonQtyMap);
          }
        }
      } catch (err) {
        console.error('Error fetching addons:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddons();
  }, [merchantCode, menu.id, editMode, existingCartItem]);

  // Calculate total price - Use promoPrice if available
  const calculateTotal = () => {
    // ✅ Use promo price if item is on promo, otherwise use regular price
    const basePrice = menu.isPromo && menu.promoPrice
      ? (typeof menu.promoPrice === 'string' ? parseFloat(menu.promoPrice) : menu.promoPrice)
      : (typeof menu.price === 'string' ? parseFloat(menu.price) : menu.price);

    let addonsTotal = 0;

    addonCategories.forEach(category => {
      category.addons.forEach(addon => {
        const qty = selectedAddons[addon.id] || 0;
        addonsTotal += addon.price * qty;
      });
    });

    return (basePrice + addonsTotal) * quantity;
  };

  // Handle addon quantity change with validation
  const handleAddonQtyChange = (addonId: number, delta: number) => {
    setSelectedAddons(prev => {
      const currentQty = prev[addonId] || 0;
      const newQty = Math.max(0, currentQty + delta);

      // Find addon's category to check maxSelections
      const addon = addonCategories
        .flatMap(cat => cat.addons.map(a => ({ ...a, category: cat })))
        .find(a => a.id === addonId);

      if (!addon) return prev;

      // Calculate total selections in this category (excluding current addon)
      const categoryAddons = addonCategories
        .find(cat => cat.id === addon.category.id)
        ?.addons.map(a => a.id) || [];

      const totalInCategory = categoryAddons.reduce((sum, id) => {
        if (id === addonId) return sum; // Exclude current addon
        return sum + (prev[id] || 0);
      }, 0);

      // Check maxSelections limit when increasing
      if (delta > 0 && addon.category.maxSelections > 0) {
        const totalAfterChange = totalInCategory + newQty;
        if (totalAfterChange > addon.category.maxSelections) {
          console.warn(`⚠️ [MODAL] Max selections (${addon.category.maxSelections}) reached for ${addon.category.name}`);
          return prev; // Don't allow increase
        }
      }

      if (newQty === 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [addonId]: newQty };
    });
  };

  // Validate required addons before adding to cart
  const validateRequiredAddons = (): { valid: boolean; message?: string } => {
    for (const category of addonCategories) {
      if (category.type === 'required') {
        // Count total selections in this category
        const totalSelected = category.addons.reduce((sum, addon) => {
          return sum + (selectedAddons[addon.id] || 0);
        }, 0);

        if (totalSelected < category.minSelections) {
          return {
            valid: false,
            message: `Please select at least ${category.minSelections} option(s) from "${category.name}"`,
          };
        }

        if (category.maxSelections > 0 && totalSelected > category.maxSelections) {
          return {
            valid: false,
            message: `Please select at most ${category.maxSelections} option(s) from "${category.name}"`,
          };
        }
      }
    }

    return { valid: true };
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (isAddingRef.current) {
      console.warn('⚠️ [MODAL] Add to cart already in progress, skipping');
      return;
    }

    // Validate required addons
    const validation = validateRequiredAddons();
    if (!validation.valid) {
      setErrorMessage(validation.message || 'Please complete required selections');
      return;
    }

    isAddingRef.current = true;

    console.log('🛒 [MODAL] Building cart item...', {
      menuId: menu.id,
      menuName: menu.name,
      quantity,
      selectedAddons,
    });

    // Build addons array - duplicate entries for quantity > 1
    const addons: Array<{ id: string; name: string; price: number }> = [];

    console.log('🔍 [MODAL] Available addon categories:', {
      categoriesCount: addonCategories.length,
      allAddonIds: addonCategories.flatMap(cat => cat.addons.map(a => a.id)),
    });

    Object.entries(selectedAddons).forEach(([addonId, qty]) => {
      if (qty <= 0) return;

      const addonIdNum = parseInt(addonId);
      console.log(`🔎 [MODAL] Searching for addon ID: ${addonIdNum} (qty: ${qty})`);

      // ✅ FIX: Convert addon.id to number for comparison (API returns strings)
      const addon = addonCategories
        .flatMap(cat => cat.addons)
        .find(a => {
          const numericAddonId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
          return numericAddonId === addonIdNum;
        });

      if (!addon) {
        console.error(`❌ [MODAL] Addon not found: ${addonIdNum}`, {
          searchedIn: addonCategories.flatMap(cat => cat.addons.map(a => ({ id: a.id, name: a.name }))),
          selectedAddons,
        });
        return;
      } console.log(`✅ [MODAL] Adding addon: ${addon.name} x${qty} (+${formatCurrency(addon.price * qty, currency)})`, {
        addonId: addon.id,
        name: addon.name,
        price: addon.price,
        priceType: typeof addon.price,
        qty,
      });

      // Add addon multiple times based on quantity
      // This matches the CartItem interface which doesn't have quantity field per addon
      for (let i = 0; i < qty; i++) {
        addons.push({
          id: addon.id.toString(), // CartContext expects string
          name: addon.name,
          price: addon.price, // Make sure this is number, not string
        });
      }
    });

    console.log('📦 [MODAL] Final addons array:', {
      totalAddons: addons.length,
      addons: addons.map(a => `${a.name} (${formatCurrency(a.price, currency)})`),
    });

    if (editMode && existingCartItem) {
      // Update existing cart item
      console.log('✏️ [MODAL] Updating cart item:', existingCartItem.cartItemId);
      updateItem(existingCartItem.cartItemId, {
        quantity,
        addons,
        notes: notes.trim() || undefined,
      });
    } else {
      // Add new cart item - ✅ Use promo price if available
      const effectivePrice = menu.isPromo && menu.promoPrice ? menu.promoPrice : menu.price;
      const newItem = {
        menuId: menu.id.toString(),
        menuName: menu.name,
        price: effectivePrice, // ✅ Use promo price if item is on promo
        quantity,
        addons: addons,
        notes: notes.trim() || undefined,
      };
      console.log('➕ [MODAL] Adding new cart item:', {
        ...newItem,
        isPromo: menu.isPromo,
        originalPrice: menu.price,
        effectivePrice,
        totalAddons: addons.length,
        addonPrice: addons.reduce((sum, a) => sum + a.price, 0),
      });
      addItem(newItem);
    }

    setTimeout(() => {
      isAddingRef.current = false;
      onClose();
    }, 100);
  };

  const isAvailable = menu.isActive && (!menu.trackStock || menu.stockQty > 0);

  return (
    <div className="fixed inset-0 z-300 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal Container - Mobile First max-w-[420px] */}
      <div className="relative w-full max-w-[420px] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Image Banner with Buttons */}
          <div className="relative w-full h-[200px] bg-gray-200 dark:bg-gray-700">
            {menu.imageUrl ? (
              <Image
                src={menu.imageUrl}
                alt={menu.name}
                fill
                className="object-cover"
                sizes="420px"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-7xl">🍽️</span>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Expand Button (optional) */}
            <button
              className="absolute top-3 left-3 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
              aria-label="Expand image"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 3L8 3M3 3L3 8M3 3L8 8M17 17L12 17M17 17L17 12M17 17L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Unavailable Badge */}
            {!isAvailable && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg">
                Sold Out
              </div>
            )}
          </div>

          {/* Menu Info Section */}
          <section className="px-4 py-3">
            {/* Menu Icons (e.g., Recommended badge) */}
            <div className="flex gap-2 mb-2">
              {/* Placeholder for menu icons/badges */}
            </div>

            {/* Menu Name */}
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {menu.name}
            </h1>

            {/* Price Display - Show promo price with strikethrough if available */}
            {menu.isPromo && menu.promoPrice ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                  {formatCurrency(menu.promoPrice, currency)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(menu.price, currency)}
                </span>
                <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded">
                  PROMO
                </span>
              </div>
            ) : (
              <div className="text-base font-bold text-orange-500 dark:text-orange-400 mb-2">
                {formatCurrency(menu.price, currency)}
              </div>
            )}

            {/* Description */}
            {menu.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed m-0">
                {menu.description}
              </p>
            )}
          </section>

          {/* Thin Divider */}
          <hr className="border-t-4 border-gray-200 dark:border-gray-700" style={{ margin: 0 }} />

          {/* Add-ons Section */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : addonCategories.length > 0 ? (
            <section>
              {addonCategories.map((category, index) => {
                // Calculate total selections in this category
                const totalSelected = category.addons.reduce((sum, addon) => {
                  return sum + (selectedAddons[addon.id] || 0);
                }, 0);

                // Check if required category is incomplete
                const isIncomplete = category.type === 'required' && totalSelected < category.minSelections;

                return (
                  <div key={category.id}>
                    <div
                      className={`px-4 py-3 ${isIncomplete ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {/* Category Header */}
                      <div className="flex flex-row justify-content-between align-items-start w-full mb-2">
                        <div className="grow">
                          <h2 className="text-base font-bold text-gray-900 dark:text-white m-0">
                            {category.name}
                          </h2>
                          <div className={`text-xs mt-1 ${isIncomplete ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {category.type === 'required' ? (
                              <span className="font-semibold">Must be selected</span>
                            ) : (
                              <span>Optional</span>
                            )}
                            {category.minSelections > 0 && category.maxSelections > 0 && (
                              <>
                                <span className="mx-1">•</span>
                                <span>max {category.maxSelections}</span>
                              </>
                            )}
                            {category.minSelections === 0 && category.maxSelections > 0 && (
                              <>
                                <span className="mx-1">•</span>
                                <span>max {category.maxSelections}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Checkmark icon if complete */}
                        {category.type === 'required' && !isIncomplete && (
                          <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Addon Items with Quantity Controls */}
                      <div>
                        {category.addons.map((addon) => {
                          const addonQty = selectedAddons[addon.id] || 0;

                          // Calculate total selections in this category
                          const totalInCategory = category.addons.reduce((sum, a) => {
                            return sum + (selectedAddons[a.id] || 0);
                          }, 0);

                          // Disable plus button if max reached
                          const isMaxReached = category.maxSelections > 0 && totalInCategory >= category.maxSelections && addonQty === 0;

                          return (
                            <div key={addon.id} className="flex items-center justify-between px-4 py-2">
                              {/* Addon Name & Price */}
                              <div className="flex-1">
                                <div className={`text-sm ${!addon.isAvailable ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                  {addon.name}{' '}
                                  {addon.price > 0 && (
                                    <strong className="text-orange-500 dark:text-orange-400">
                                      (+{formatCurrency(addon.price, currency)})
                                    </strong>
                                  )}
                                </div>
                              </div>

                              {/* Quantity Counter or Sold Out */}
                              {!addon.isAvailable ? (
                                <span className="text-xs font-bold text-red-500 dark:text-red-400 text-center" style={{ width: '88px' }}>
                                  Sold out
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleAddonQtyChange(addon.id, -1)}
                                    disabled={addonQty === 0}
                                    className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Decrease quantity"
                                  >
                                    <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                  </button>

                                  <span className="text-base font-semibold text-gray-900 dark:text-white min-w-6 text-center">
                                    {addonQty}
                                  </span>

                                  <button
                                    onClick={() => handleAddonQtyChange(addon.id, 1)}
                                    disabled={isMaxReached}
                                    className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Increase quantity"
                                    title={isMaxReached ? `Max ${category.maxSelections} selections reached` : undefined}
                                  >
                                    <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dashed Divider between categories */}
                    {index < addonCategories.length - 1 && (
                      <hr className="border-t border-dashed border-gray-300 dark:border-gray-600" style={{ margin: 0 }} />
                    )}
                  </div>
                );
              })}

              {/* Thick Divider after all addons */}
              <hr className="border-t-4 border-gray-200 dark:border-gray-700" style={{ margin: 0 }} />
            </section>
          ) : null}

          {/* Notes Section */}
          <div className="px-4 py-3">
            <div className="flex flex-col items-start mb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white m-0">
                Notes
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">Optional</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 100))}
              placeholder="Example: Make my dish delicious!"
              maxLength={100}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Spacer for fixed footer */}
          <div className="h-24" />
        </div>

        {/* Fixed Bottom Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          {/* Total Order Row */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
              Total Order
            </div>

            {/* Quantity Counter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
                className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Decrease order quantity"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>

              <span className="text-base font-semibold text-gray-900 dark:text-white min-w-6 text-center">
                {quantity}
              </span>

              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 transition-all"
                aria-label="Increase order quantity"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add Order Button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-between px-5"
            >
              <span className="text-sm">{editMode ? 'Update Order' : 'Add Orders'}</span>
              <span className="flex items-center gap-2 text-sm">
                <span>-</span>
                <strong>{formatCurrency(calculateTotal(), currency)}</strong>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {errorMessage && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[400]"
            onClick={() => setErrorMessage('')}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl z-[400] p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Required Selection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="w-full h-11 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            >
              OK
            </button>
          </div>
        </>
      )}

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
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}
