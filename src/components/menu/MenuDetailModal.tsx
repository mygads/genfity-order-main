'use client';

import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import { isFavorite, toggleFavorite } from '@/lib/utils/localStorage';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import { customerOrderUrl } from '@/lib/utils/customerRoutes';
import { FaHeart, FaRegHeart, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

interface Addon {
  id: string; // ✅ String from API (BigInt serialized)
  name: string;
  price: number;
  categoryId: string; // ✅ String from API
  isAvailable: boolean;
  inputType: 'SELECT' | 'QTY'; // SELECT = checkbox/radio, QTY = quantity input
}

interface AddonCategory {
  id: string; // ✅ String from API (BigInt serialized)
  name: string;
  type: 'required' | 'optional';
  minSelections: number;
  maxSelections: number;
  addons: Addon[];
}

interface MenuItem {
  id: string; // ✅ String from API (BigInt serialized)
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  isActive: boolean;
  trackStock: boolean;
  isPromo?: boolean;
  promoPrice?: number;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
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
  prefetchedAddons?: Array<{
    id?: string | number;
    name: string;
    type?: 'required' | 'optional' | string;
    isRequired?: boolean;
    minSelection?: number;
    maxSelection?: number;
    minSelections?: number;
    maxSelections?: number;
    addons?: unknown[];
    addonItems?: unknown[];
  }>; // Prefetched addon data from parent (flexible shape)
  storeOpen?: boolean; // Whether store is open (hide Add button when closed)
  skipCartInit?: boolean; // Avoid touching cart state (useful for admin previews)
  /**
   * Where to render the modal. Default is full viewport.
   * Use 'parent' to render inside a positioned container (admin preview device frame).
   */
  container?: 'viewport' | 'parent';
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
  onClose,
  prefetchedAddons,
  storeOpen = true,
  skipCartInit = false,
  container = 'viewport'
}: MenuDetailModalProps) {
  const { addItem, updateItem, initializeCart, cart } = useCart();

  // Initialize cart if not exists
  useEffect(() => {
    if (skipCartInit) return;
    if (!cart || cart.merchantCode !== merchantCode || cart.mode !== mode) {
      initializeCart(merchantCode, mode as 'dinein' | 'takeaway' | 'delivery');
    }
  }, [cart, merchantCode, mode, initializeCart, skipCartInit]);

  const [quantity, setQuantity] = useState(editMode && existingCartItem ? existingCartItem.quantity : 1);
  const [notes, setNotes] = useState(editMode && existingCartItem ? existingCartItem.notes || '' : '');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [missingCategoryId, setMissingCategoryId] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // ✅ Smooth close animation
  const [showCopied, setShowCopied] = useState(false); // Share link copy feedback
  const [isFav, setIsFav] = useState(false); // Favorite state
  const addonCategoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isAddingRef = useRef(false);

  // Initialize favorite state
  useEffect(() => {
    setIsFav(isFavorite(merchantCode, menu.id));
  }, [merchantCode, menu.id]);

  // Handle favorite toggle
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavorite(merchantCode, menu.id);
    setIsFav(newState);
  };

  // Generate shareable menu item URL
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${customerOrderUrl(merchantCode, { mode, menu: menu.id })}`;
  };

  // Handle share menu item
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getShareUrl();
    const shareData = {
      title: menu.name,
      text: `Check out ${menu.name}!`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled or error - try clipboard fallback
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch {
        console.error('Failed to share:', err);
      }
    }
  };

  // ✅ Handle smooth close
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  const scrollToAddonCategory = (categoryId: string) => {
    const element = addonCategoryRefs.current[categoryId];
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Fetch addon categories
  useEffect(() => {
    const fetchAddons = async () => {
      // ✅ Use prefetched data if available (including empty arrays)
      // Array.isArray handles both populated arrays AND empty arrays
      if (Array.isArray(prefetchedAddons)) {
        console.log('✅ [PREFETCH] Using prefetched addon data for menu:', menu.id, 'count:', prefetchedAddons.length);

        // ✅ FIX: Transform API field names to component expected field names
        // API uses: minSelection, maxSelection, isRequired, addonItems, isActive
        // Component expects: minSelections, maxSelections, type, addons, isAvailable
        const sanitized = prefetchedAddons.map((category: { id?: string | number; name: string; type?: string; isRequired?: boolean; minSelection?: number; maxSelection?: number; minSelections?: number; maxSelections?: number; addons?: unknown[]; addonItems?: unknown[] }) => {
          // Get addons from either 'addons' or 'addonItems' field
          const rawAddons = (category.addons || category.addonItems || []) as Array<{ id?: string | number; name: string; price?: string | number; categoryId?: string | number; isAvailable?: boolean; isActive?: boolean; inputType?: string }>;

          return {
            id: String(category.id || ''),
            name: category.name,
            // Transform isRequired (boolean) to type ('required' | 'optional')
            type: (category.type || (category.isRequired ? 'required' : 'optional')) as 'required' | 'optional',
            // Handle both minSelection and minSelections
            minSelections: category.minSelections ?? category.minSelection ?? 0,
            // Handle both maxSelection and maxSelections  
            maxSelections: category.maxSelections ?? category.maxSelection ?? 0,
            // Transform addons with proper field mapping
            addons: rawAddons.map((addon) => ({
              id: String(addon.id || ''),
              name: addon.name,
              price: typeof addon.price === 'string' ? parseFloat(addon.price) : (addon.price || 0),
              categoryId: addon.categoryId?.toString() || category.id?.toString() || '',
              // Transform isActive (from API) to isAvailable (component expects)
              isAvailable: addon.isAvailable !== undefined ? addon.isAvailable : (addon.isActive !== false),
              inputType: (addon.inputType || 'SELECT') as 'SELECT' | 'QTY',
            })),
          };
        });

        console.log('📋 [PREFETCH] Sanitized categories:', sanitized.map((c: { name: string; type: string; minSelections: number; maxSelections: number; addons: unknown[] }) => ({
          name: c.name, type: c.type, min: c.minSelections, max: c.maxSelections, addonsCount: c.addons.length
        })));

        setAddonCategories(sanitized);

        // Pre-fill addons in edit mode
        if (editMode && existingCartItem && existingCartItem.addons) {
          const addonQtyMap: Record<string, number> = {};
          existingCartItem.addons.forEach((addon: { id: string; name: string; price: number }) => {
            addonQtyMap[addon.id] = (addonQtyMap[addon.id] || 0) + 1;
          });
          console.log('🔄 [EDIT MODE] Pre-filled addons:', addonQtyMap);
          setSelectedAddons(addonQtyMap);
        }

        setIsLoading(false);
        return;
      }

      // Fallback: Fetch from API if not prefetched
      console.log('🔄 [FETCH] Fetching addon data from API for menu:', menu.id);
      setIsLoading(true);
      try {
        const response = await fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}/menus/${menu.id}/addons`));
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
            const addonQtyMap: Record<string, number> = {};
            existingCartItem.addons.forEach((addon: { id: string; name: string; price: number }) => {
              // Aggregate quantities (duplicate entries represent quantity > 1)
              addonQtyMap[addon.id] = (addonQtyMap[addon.id] || 0) + 1;
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
  }, [merchantCode, menu.id, editMode, existingCartItem, prefetchedAddons]);

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
  const handleAddonQtyChange = (addonId: string, delta: number) => {
    if (errorMessage) setErrorMessage('');
    if (missingCategoryId !== null) setMissingCategoryId(null);

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

  // Handle radio button selection (single choice - maxSelections = 1)
  const handleRadioSelect = (categoryId: string, addonId: string) => {
    if (errorMessage) setErrorMessage('');
    if (missingCategoryId !== null) setMissingCategoryId(null);

    const category = addonCategories.find(c => c.id === categoryId);
    if (!category) return;

    setSelectedAddons(prev => {
      // Check if this addon is already selected
      const isCurrentlySelected = prev[addonId] === 1;

      // Remove all selections from this category first
      const newState = { ...prev };
      category.addons.forEach(a => {
        delete newState[a.id];
      });

      // If it was not selected before, add it (toggle behavior)
      // If it was selected, leave it unselected (allows deselection)
      if (!isCurrentlySelected) {
        newState[addonId] = 1;
      }

      return newState;
    });
  };

  // Handle checkbox toggle (multiple choice)
  const handleCheckboxToggle = (categoryId: string, addonId: string) => {
    if (errorMessage) setErrorMessage('');
    if (missingCategoryId !== null) setMissingCategoryId(null);

    const category = addonCategories.find(c => c.id === categoryId);
    if (!category) return;

    setSelectedAddons(prev => {
      const currentQty = prev[addonId] || 0;

      if (currentQty > 0) {
        // Uncheck - remove this addon
        const { [addonId]: _, ...rest } = prev;
        return rest;
      } else {
        // Check - add this addon (if max not reached)
        const totalInCategory = category.addons.reduce((sum, a) => {
          return sum + (prev[a.id] || 0);
        }, 0);

        if (category.maxSelections > 0 && totalInCategory >= category.maxSelections) {
          console.warn(`⚠️ [MODAL] Max selections (${category.maxSelections}) reached for ${category.name}`);
          return prev;
        }

        return { ...prev, [addonId]: 1 };
      }
    });
  };

  // Validate required addons before adding to cart
  const validateRequiredAddons = (): { valid: boolean; message?: string; missingCategoryId?: string } => {
    for (const category of addonCategories) {
      if (category.type === 'required') {
        // Count total selections in this category
        const totalSelected = category.addons.reduce((sum, addon) => {
          return sum + (selectedAddons[addon.id] || 0);
        }, 0);

        if (totalSelected < category.minSelections) {
          return {
            valid: false,
            message: `Please select required add-ons in "${category.name}"`,
            missingCategoryId: category.id,
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
      // Don't show error modal, just scroll to missing category
      if (validation.missingCategoryId) {
        setMissingCategoryId(validation.missingCategoryId);
        // Scroll to the incomplete category
        setTimeout(() => scrollToAddonCategory(validation.missingCategoryId as string), 50);
      }
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
      }

      console.log(`✅ [MODAL] Adding addon: ${addon.name} x${qty} (+${formatCurrency(addon.price * qty, currency)})`, {
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

  // ✅ FIX: Handle undefined fields from cached data with safe defaults
  // isActive defaults to true (assume available unless explicitly set to false)
  // trackStock defaults to false (don't track stock unless explicitly enabled)
  const menuIsActive = menu.isActive !== false; // true unless explicitly false
  const menuTrackStock = menu.trackStock === true; // false unless explicitly true
  const menuStockQty = menu.stockQty ?? null;

  const isAvailable = menuIsActive && (!menuTrackStock || (menuStockQty !== null && menuStockQty > 0));

  const isContained = container === 'parent';
  const rootPositionClass = isContained ? 'absolute inset-0' : 'fixed inset-0';
  const bottomBarPositionClass = isContained
    ? 'absolute bottom-0 left-0 w-full'
    : 'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px]';

  return (
    <div className={`${rootPositionClass} z-1000 flex justify-center`}>
      {/* Overlay background */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Modal Container - Constrained to 500px like layout */}
      <div
        className={`relative w-full ${isContained ? '' : 'max-w-[500px]'} h-full bg-white flex flex-col overflow-hidden transition-transform duration-250 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
        style={{ animation: isClosing ? 'none' : 'slideUp 0.3s ease-out' }}
      >
        {/* Full Screen Modal within 500px container - Burjo ESB Style */}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
          {/* Image Banner with Buttons */}
          <div
            className={`relative w-full h-[250px] bg-gray-200 ${menu.imageUrl ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => menu.imageUrl && setIsImageZoomed(true)}
          >
            <Image
              src={menu.imageUrl || '/images/default-menu.png'}
              alt={menu.name}
              fill
              quality={90}
              className="object-cover"
              sizes="(max-width: 500px) 100vw, 500px"
              priority
            />

            {/* Gradient Overlay - Top 1/5 of image */}
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{
                height: '50px',
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%)',
                zIndex: 1
              }}
            />

            {/* Close Button - absolute within modal container */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
              aria-label="Close"
            >
              <FaTimes className="w-4 h-4 text-gray-700" />
            </button>

            {/* Expand Button - Only show if has image */}
            {menu.imageUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageZoomed(true);
                }}
                className="absolute top-3 left-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                style={{ zIndex: 2 }}
                aria-label="Expand image"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 3L8 3M3 3L3 8M3 3L8 8M17 17L12 17M17 17L17 12M17 17L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className={`absolute top-3 ${menu.imageUrl ? 'left-14' : 'left-3'} w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors`}
              style={{ zIndex: 2 }}
              aria-label="Share menu item"
              title={showCopied ? 'Link copied!' : 'Share'}
            >
              {showCopied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              )}
            </button>

            {/* Unavailable Badge */}
            {!isAvailable && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg">
                Sold Out
              </div>
            )}
          </div>

          {/* Menu Info Section - Overlaps image with rounded top */}
          <section className="px-4 py-3 bg-white rounded-t-2xl relative -mt-4 z-10">
            {/* Menu Badges (Recommended, Best Seller, Spicy, Signature) */}
            {(menu.isRecommended || menu.isBestSeller || menu.isSpicy || menu.isSignature || menu.isPromo) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {menu.isPromo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                    </svg>
                    Promo
                  </span>
                )}
                {menu.isRecommended && (
                  <div
                    className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1"
                    title="Recommended"
                  >
                    <Image
                      src="/images/menu-badges/recommended.png"
                      alt="Recommended"
                      fill
                      className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                    />
                  </div>
                )}
                {menu.isBestSeller && (
                  <div
                    className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1"
                    title="Best Seller"
                  >
                    <Image
                      src="/images/menu-badges/best-seller.png"
                      alt="Best Seller"
                      fill
                      className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                    />
                  </div>
                )}
                {menu.isSignature && (
                  <div
                    className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1"
                    title="Signature"
                  >
                    <Image
                      src="/images/menu-badges/signature.png"
                      alt="Signature"
                      fill
                      className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                    />
                  </div>
                )}
                {menu.isSpicy && (
                  <div
                    className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-orange-300 hover:ring-offset-1"
                    title="Spicy"
                  >
                    <Image
                      src="/images/menu-badges/spicy.png"
                      alt="Spicy"
                      fill
                      className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Menu Name Row with Favorite Button */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900 flex-1">
                {menu.name}
              </h1>
              {/* Favorite Button */}
              <button
                onClick={handleToggleFavorite}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFav ? (
                  <FaHeart className="w-5 h-5 text-red-500" />
                ) : (
                  <FaRegHeart className="w-5 h-5 text-gray-400 hover:text-red-400" />
                )}
              </button>
            </div>

            {/* Price Display - Show promo price with strikethrough if available */}
            {menu.isPromo && menu.promoPrice ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(menu.promoPrice, currency)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(menu.price, currency)}
                </span>
              </div>
            ) : (
              <div className="text-base font-semibold text-gray-900 mb-2">
                {formatCurrency(menu.price, currency)}
              </div>
            )}

            {/* Description */}
            {menu.description && (
              <p className="text-[13px] text-gray-500 leading-relaxed">
                {menu.description}
              </p>
            )}
          </section>

          {/* Thin Divider */}
          <hr className="border-t-2 border-gray-200" style={{ margin: 0 }} />

          {/* Add-ons Section */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : addonCategories.length > 0 ? (
            <section className="addon-categories">
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
                      ref={(el) => {
                        addonCategoryRefs.current[category.id] = el;
                      }}
                      id={`addon-category-${category.id}`}
                      className={`px-4 py-3 ${missingCategoryId === category.id ? 'bg-orange-50' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {/* Category Header */}
                      <div className="w-full mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-base font-bold text-gray-900 m-0">
                            {category.name}
                          </h2>
                          {category.type === 'required' ? (
                            <p className={`text-xs font-medium ${isIncomplete ? 'text-orange-600' : 'text-gray-900'}`}>
                              Required
                              {category.maxSelections > 0 ? ` • max ${category.maxSelections}` : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-900">
                              Optional
                              {category.maxSelections > 0 ? ` • max ${category.maxSelections}` : ''}
                            </p>
                          )}
                        </div>
                        {/* Checkmark icon when required category is complete */}
                        {category.type === 'required' && !isIncomplete && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 shrink-0 ml-2">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Addon Items - Different UI based on input type and maxSelections */}
                      <div className="space-y-1">
                        {category.addons.map((addon) => {
                          const addonQty = selectedAddons[addon.id] || 0;
                          const isSelected = addonQty > 0;

                          // Calculate total selections in this category
                          const totalInCategory = category.addons.reduce((sum, a) => {
                            return sum + (selectedAddons[a.id] || 0);
                          }, 0);
                          const isSingleChoice = category.maxSelections === 1;
                          const isQuantityType = addon.inputType === 'QTY';

                          // Disable checkbox if max reached and not already selected
                          const isMaxReached = category.maxSelections > 0 &&
                            totalInCategory >= category.maxSelections && !isSelected;

                          return (
                            <div key={addon.id} className="flex items-center justify-between py-2">
                              {/* Left side: Name + Price - Clickable to toggle selection */}
                              <div
                                className={`flex flex-1 cursor-pointer select-none ${addon.isAvailable && !isMaxReached ? 'hover:opacity-80' : ''}`}
                                onClick={() => {
                                  if (!addon.isAvailable) return;
                                  if (isSingleChoice) {
                                    handleRadioSelect(category.id, addon.id);
                                  } else if (isQuantityType) {
                                    // For QTY type: increment by 1 if not max reached
                                    if (!isMaxReached || isSelected) {
                                      handleAddonQtyChange(addon.id, isSelected ? 0 : 1); // Toggle: add 1 if not selected
                                    }
                                  } else {
                                    // Checkbox type
                                    if (!isMaxReached || isSelected) {
                                      handleCheckboxToggle(category.id, addon.id);
                                    }
                                  }
                                }}
                              >
                                <span className={`text-sm ${!addon.isAvailable ? 'text-gray-400 line-through' : isSelected ? 'text-gray-800 font-semibold' : 'text-gray-800'}`}>
                                  {addon.name}
                                </span>
                                {addon.price > 0 && (
                                  <span className={`text-sm font-bold ml-1 ${!addon.isAvailable ? 'text-gray-400' : 'text-gray-900'}`}>
                                    (+ {formatCurrency(addon.price, currency)})
                                  </span>
                                )}
                              </div>

                              {/* Right side: Input controls */}
                              {!addon.isAvailable ? (
                                /* Sold Out */
                                <span className="text-xs font-semibold text-red-500 px-2 py-1 bg-red-50 rounded">
                                  Sold out
                                </span>
                              ) : isSingleChoice ? (
                                /* Single Choice (maxSelections = 1) - checkbox style but exclusive behavior */
                                <button
                                  type="button"
                                  onClick={() => handleRadioSelect(category.id, addon.id)}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected
                                    ? 'border-orange-500 bg-orange-500'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  aria-label={`Select ${addon.name}`}
                                >
                                  {isSelected ? (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : null}
                                </button>
                              ) : isQuantityType ? (
                                /* Quantity Input - Can add multiple of same item */
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleAddonQtyChange(addon.id, -1)}
                                    disabled={addonQty === 0}
                                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Decrease quantity"
                                  >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                  </button>
                                  <span className="text-sm font-semibold text-gray-900 min-w-6 text-center">
                                    {addonQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddonQtyChange(addon.id, 1)}
                                    disabled={isMaxReached}
                                    className="w-7 h-7 rounded-full border border-orange-500 text-orange-500 flex items-center justify-center hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    aria-label="Increase quantity"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                /* Checkbox - Multiple Choice (inputType = SELECT, maxSelections > 1) */
                                <button
                                  type="button"
                                  onClick={() => handleCheckboxToggle(category.id, addon.id)}
                                  disabled={isMaxReached}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected
                                    ? 'border-orange-500 bg-orange-500'
                                    : isMaxReached
                                      ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                      : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${addon.name}`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider between categories */}
                    {index < addonCategories.length - 1 && (
                      <hr className="border-t border-gray-200" style={{ margin: 0 }} />
                    )}
                  </div>
                );
              })}

              {/* Thick Divider after all addons */}
              <hr className="border-t-2 border-gray-200" style={{ margin: 0 }} />
            </section>
          ) : null}

          {/* Notes Section */}
          <div className="px-4 py-3">
            <div className="flex flex-col items-start mb-2">
              <h2 className="text-base font-bold text-gray-900 m-0">
                Notes
              </h2>
              <span className="text-sm text-gray-900">Optional</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 100))}
              placeholder="Example: Dont add onions!"
              maxLength={100}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Spacer for fixed footer */}
          <div className="h-14" />
        </div>

        {/* Fixed Bottom Bar - Burjo ESB Style */}
        {/* Hide entire bottom bar when store is closed */}
        {storeOpen && (
          <div className={`${bottomBarPositionClass} bg-white border-t border-gray-200 rounded-t-2xl z-1010`} style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            {/* Total Order Row */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm font-medium text-gray-700">
                Total Order
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity === 1}
                  className="w-6 h-6 rounded-full border border-black flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Decrease order quantity"
                >
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                </button>

                <span className="text-base font-semibold text-gray-900 min-w-6 text-center">
                  {quantity}
                </span>

                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-6 h-6 rounded-full border border-black flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-all"
                  aria-label="Increase order quantity"
                >
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center px-5"
              >
                <span className="text-md">{editMode ? 'Update Order ' : 'Add Orders '}</span>

                <span className="flex items-center gap-2 text-md gap-2 mx-2">-</span>
                <span className="flex items-center gap-2 text-md gap-2">
                  <strong>{formatCurrency(calculateTotal(), currency)}</strong>
                </span>
              </button>
            </div>
          </div>
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

      {/* Image Zoom Modal - Full quality with click outside to close */}
      {isImageZoomed && (
        <div
          className={`${isContained ? 'absolute' : 'fixed'} inset-0 z-1100 flex items-center justify-center bg-black/95 cursor-pointer`}
          onClick={() => setIsImageZoomed(false)} // Click outside image to close
        >
          {/* Zoomed Image Container - Max 500px */}
          <div
            className="relative w-full max-w-[500px] h-auto cursor-default"
            onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
          >
            {/* Gradient Overlay - Top 1/5 of image */}
            <div
              className="absolute top-0 left-0 right-0 z-1105 pointer-events-none"
              style={{
                height: '20%',
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%)'
              }}
            />

            {/* Close Button for Zoom - positioned relative to container */}
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-1110"
              aria-label="Close zoom"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" />
              </svg>
            </button>

            {/* Zoomed Image - Full quality, no blur */}
            <Image
              src={menu.imageUrl || '/images/default-menu.png'}
              alt={menu.name}
              width={1000}
              height={1000}
              quality={100}
              className="w-full h-auto object-contain"
              priority
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
