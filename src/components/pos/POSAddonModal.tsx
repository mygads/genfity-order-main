/**
 * POS Addon Modal Component
 * 
 * Modal for selecting addons when adding item to cart
 * Features:
 * - Proper single selection (radio) for maxSelection=1
 * - Multiple selection (checkbox) for maxSelection > 1
 * - Quantity input support for multi-select
 * - Shows "FREE" for 0 price addons
 * - Auto-scroll to required categories when Add to Cart with missing selection
 * - Entire addon row is clickable
 * - Brand primary color theme
 */

'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FaTimes,
  FaMinus,
  FaPlus,
  FaStickyNote,
  FaCheck,
  FaExclamationCircle,
  FaUtensils
} from 'react-icons/fa';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';

export interface AddonItem {
  id: number | string;
  name: string;
  price: number;
  isActive: boolean;
  trackStock?: boolean;
  stockQty?: number | null;
  inputType?: 'SELECT' | 'QTY'; // SELECT = toggle, QTY = quantity input
}

export interface AddonCategory {
  id: number | string;
  name: string;
  description?: string;
  minSelection: number;
  maxSelection: number | null;
  addonItems: AddonItem[];
}

export interface SelectedAddon {
  addonItemId: number | string;
  addonName: string;
  addonPrice: number;
  quantity: number;
}

interface POSAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (addons: SelectedAddon[], notes: string, quantity: number) => void;
  menuItem: {
    id: number | string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  addonCategories: AddonCategory[];
  currency: string;
}

export const POSAddonModal: React.FC<POSAddonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  menuItem,
  addonCategories,
  currency,
}) => {
  const { t, locale } = useTranslation();
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(null);
  
  // Refs for scrolling to categories
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const formatMoney = useCallback(
    (amount: number): string => {
      if (amount === 0) return t('pos.free') || 'FREE';
      return formatCurrency(amount, currency, locale);
    },
    [currency, locale, t]
  );

  // Calculate total
  const total = useMemo(() => {
    let addonTotal = 0;
    selectedAddons.forEach((qty, addonId) => {
      for (const category of addonCategories) {
        const addon = category.addonItems.find(a => String(a.id) === addonId);
        if (addon) {
          addonTotal += addon.price * qty;
          break;
        }
      }
    });
    return (menuItem.price + addonTotal) * quantity;
  }, [menuItem.price, selectedAddons, addonCategories, quantity]);

  // Check if addon is out of stock
  const isAddonOutOfStock = (addon: AddonItem): boolean => {
    return addon.trackStock === true && (addon.stockQty === null || addon.stockQty === undefined || addon.stockQty <= 0);
  };

  // Check if addon has low stock
  const isAddonLowStock = (addon: AddonItem): boolean => {
    return addon.trackStock === true && addon.stockQty !== null && addon.stockQty !== undefined && addon.stockQty > 0 && addon.stockQty <= 5;
  };

  // Get addon stock label
  const getAddonStockLabel = (addon: AddonItem): { text: string; className: string } | null => {
    if (!addon.trackStock || addon.stockQty === null || addon.stockQty === undefined) return null;
    
    if (addon.stockQty <= 0) {
      return { text: t('pos.outOfStock') || 'Out of stock', className: 'text-red-500' };
    }
    if (addon.stockQty <= 3) {
      return { text: `${addon.stockQty} ${t('pos.left') || 'left'}`, className: 'text-red-500 font-medium' };
    }
    if (addon.stockQty <= 5) {
      return { text: `${addon.stockQty} ${t('pos.left') || 'left'}`, className: 'text-yellow-600 dark:text-yellow-400' };
    }
    return null; // Don't show for normal stock levels
  };

  // Determine if category is single-select (radio button behavior)
  const isSingleSelect = (category: AddonCategory): boolean => {
    return category.maxSelection === 1;
  };

  // Determine if addon uses QTY input type
  const isQtyInput = (addon: AddonItem, category: AddonCategory): boolean => {
    // QTY input is only for multi-select categories with maxSelection > 1 or null
    if (isSingleSelect(category)) return false;
    return addon.inputType === 'QTY';
  };

  // Get selection count for a category
  const getCategorySelectionCount = (categoryId: string): number => {
    const category = addonCategories.find(c => String(c.id) === categoryId);
    if (!category) return 0;
    
    let count = 0;
    category.addonItems.forEach(addon => {
      count += selectedAddons.get(String(addon.id)) || 0;
    });
    return count;
  };

  // Check if category meets minimum selection
  const isCategoryValid = (category: AddonCategory): boolean => {
    const count = getCategorySelectionCount(String(category.id));
    return count >= category.minSelection;
  };

  // Check if all required categories are valid
  const isFormValid = useMemo(() => {
    return addonCategories.every(cat => isCategoryValid(cat));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addonCategories, selectedAddons]);

  // Get first invalid category (for scrolling)
  const getFirstInvalidCategory = useCallback((): AddonCategory | null => {
    for (const category of addonCategories) {
      if (!isCategoryValid(category)) {
        return category;
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addonCategories, selectedAddons]);

  // Scroll to category
  const scrollToCategory = useCallback((categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle single-select addon (radio button behavior)
  const handleSingleSelect = (addonId: string, category: AddonCategory) => {
    // Clear highlight when user selects
    if (highlightedCategoryId === String(category.id)) {
      setHighlightedCategoryId(null);
    }

    const newMap = new Map(selectedAddons);
    
    // Check if already selected - allow toggle off for optional categories
    const isCurrentlySelected = newMap.get(addonId) === 1;
    
    // Remove all selections from this category
    category.addonItems.forEach(addon => {
      newMap.delete(String(addon.id));
    });
    
    // If not previously selected, add it
    if (!isCurrentlySelected) {
      newMap.set(addonId, 1);
    }
    
    setSelectedAddons(newMap);
  };

  // Handle multi-select addon toggle (checkbox behavior)
  const handleMultiSelect = (addonId: string, category: AddonCategory) => {
    // Clear highlight when user selects
    if (highlightedCategoryId === String(category.id)) {
      setHighlightedCategoryId(null);
    }

    const currentQty = selectedAddons.get(addonId) || 0;
    const categoryCount = getCategorySelectionCount(String(category.id));

    if (currentQty > 0) {
      // Remove addon
      const newMap = new Map(selectedAddons);
      newMap.delete(addonId);
      setSelectedAddons(newMap);
    } else {
      // Add addon (if max not reached)
      if (category.maxSelection === null || categoryCount < category.maxSelection) {
        const newMap = new Map(selectedAddons);
        newMap.set(addonId, 1);
        setSelectedAddons(newMap);
      }
    }
  };

  // Handle addon row click (entire row is clickable)
  const handleAddonRowClick = (addon: AddonItem, category: AddonCategory) => {
    if (isAddonOutOfStock(addon)) return;
    
    const addonId = String(addon.id);
    
    if (isSingleSelect(category)) {
      handleSingleSelect(addonId, category);
    } else if (isQtyInput(addon, category)) {
      // For QTY type, clicking adds 1 if not selected, otherwise do nothing (use +/- buttons)
      const currentQty = selectedAddons.get(addonId) || 0;
      if (currentQty === 0) {
        const categoryCount = getCategorySelectionCount(String(category.id));
        if (category.maxSelection === null || categoryCount < category.maxSelection) {
          const newMap = new Map(selectedAddons);
          newMap.set(addonId, 1);
          setSelectedAddons(newMap);
        }
      }
    } else {
      handleMultiSelect(addonId, category);
    }
  };

  // Handle addon quantity change (for QTY input type)
  const handleAddonQtyChange = (addonId: string, category: AddonCategory, delta: number, e?: React.MouseEvent) => {
    // Prevent row click when clicking +/- buttons
    if (e) {
      e.stopPropagation();
    }

    // Clear highlight when user interacts
    if (highlightedCategoryId === String(category.id)) {
      setHighlightedCategoryId(null);
    }

    const currentQty = selectedAddons.get(addonId) || 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      const newMap = new Map(selectedAddons);
      newMap.delete(addonId);
      setSelectedAddons(newMap);
    } else {
      // Check max selection
      const categoryCount = getCategorySelectionCount(String(category.id));
      const difference = newQty - currentQty;
      
      if (category.maxSelection === null || categoryCount + difference <= category.maxSelection) {
        const newMap = new Map(selectedAddons);
        newMap.set(addonId, newQty);
        setSelectedAddons(newMap);
      }
    }
  };

  // Handle confirm - with validation and auto-scroll
  const handleConfirm = () => {
    // Check for invalid categories first
    const invalidCategory = getFirstInvalidCategory();
    if (invalidCategory) {
      // Highlight the invalid category
      setHighlightedCategoryId(String(invalidCategory.id));
      // Scroll to it
      setTimeout(() => scrollToCategory(String(invalidCategory.id)), 50);
      return;
    }

    // Build addons list
    const addons: SelectedAddon[] = [];
    
    selectedAddons.forEach((qty, addonId) => {
      for (const category of addonCategories) {
        const addon = category.addonItems.find(a => String(a.id) === addonId);
        if (addon) {
          addons.push({
            addonItemId: addon.id,
            addonName: addon.name,
            addonPrice: addon.price,
            quantity: qty,
          });
          break;
        }
      }
    });

    onConfirm(addons, notes, quantity);
    
    // Reset state
    setSelectedAddons(new Map());
    setNotes('');
    setQuantity(1);
    setHighlightedCategoryId(null);
  };

  // Handle close
  const handleClose = () => {
    setSelectedAddons(new Map());
    setNotes('');
    setQuantity(1);
    setHighlightedCategoryId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('pos.customizeItem')}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {/* Item Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              {menuItem.imageUrl ? (
                <div className="w-20 h-20 relative rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={menuItem.imageUrl}
                    alt={menuItem.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <FaUtensils className="text-gray-300 dark:text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {menuItem.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatMoney(menuItem.price)}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('pos.quantity')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors"
                >
                  <FaMinus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors"
                >
                  <FaPlus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Addon Categories */}
          {addonCategories.map((category) => {
            const categoryId = String(category.id);
            const categoryCount = getCategorySelectionCount(categoryId);
            const isValid = isCategoryValid(category);
            const singleSelect = isSingleSelect(category);
            const isHighlighted = highlightedCategoryId === categoryId;
            
            return (
              <div 
                key={category.id} 
                ref={el => { categoryRefs.current[categoryId] = el; }}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 transition-colors ${
                  isHighlighted 
                    ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h4>
                      {isHighlighted && (
                        <FaExclamationCircle className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      isHighlighted 
                        ? 'text-red-500 font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {category.minSelection > 0 && (
                        <span className={!isValid && !isHighlighted ? 'text-brand-500 font-medium' : ''}>
                          {singleSelect 
                            ? t('pos.selectOne') || 'Select one'
                            : t('pos.minSelection', { min: category.minSelection })
                          }
                        </span>
                      )}
                      {category.maxSelection && category.maxSelection > 1 && (
                        <span>
                          {category.minSelection > 0 ? ' • ' : ''}
                          {t('pos.maxSelection', { max: category.maxSelection })}
                        </span>
                      )}
                      {category.minSelection === 0 && !category.maxSelection && (
                        <span className="text-gray-400">{t('common.optional')}</span>
                      )}
                    </p>
                  </div>
                  {category.minSelection > 0 && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      isHighlighted
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                        : isValid
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                    }`}>
                      {singleSelect 
                        ? (isValid ? '✓' : t('pos.required') || 'Required')
                        : `${categoryCount}/${category.minSelection}`
                      }
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {category.addonItems.filter(a => a.isActive).map((addon) => {
                    const addonId = String(addon.id);
                    const isSelected = selectedAddons.has(addonId);
                    const addonQty = selectedAddons.get(addonId) || 0;
                    const outOfStock = isAddonOutOfStock(addon);
                    const useQtyInput = isQtyInput(addon, category);

                    return (
                      <div
                        key={addon.id}
                        onClick={() => !outOfStock && handleAddonRowClick(addon, category)}
                        className={`
                          flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer
                          ${isSelected
                            ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                            : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                          ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                          ${isHighlighted && !isSelected ? 'ring-1 ring-red-300 dark:ring-red-700' : ''}
                        `}
                      >
                        {/* Left side - Radio/Checkbox + Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Radio button for single select, Checkbox for multi select */}
                          {singleSelect ? (
                            // Radio button
                            <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-brand-500 bg-brand-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          ) : (
                            // Checkbox
                            <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && (
                                <FaCheck className="w-3 h-3 text-white" />
                              )}
                            </div>
                          )}
                          
                          {/* Name and stock status */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {addon.name}
                            </span>
                            {outOfStock && (
                              <span className="ml-2 text-xs text-red-500 font-medium">
                                ({t('pos.outOfStock')})
                              </span>
                            )}
                            {!outOfStock && (() => {
                              const stockLabel = getAddonStockLabel(addon);
                              if (!stockLabel) return null;
                              return (
                                <span className={`ml-2 text-xs ${stockLabel.className}`}>
                                  ({stockLabel.text})
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right side - Quantity controls + Price */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Quantity controls for QTY type or multi-select when selected */}
                          {!singleSelect && isSelected && (useQtyInput || addonQty > 0) && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleAddonQtyChange(addonId, category, -1, e)}
                                className="w-7 h-7 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors"
                              >
                                <FaMinus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                {addonQty}
                              </span>
                              <button
                                onClick={(e) => handleAddonQtyChange(addonId, category, 1, e)}
                                disabled={category.maxSelection !== null && categoryCount >= category.maxSelection && !isSelected}
                                className="w-7 h-7 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                <FaPlus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                          
                          {/* Price */}
                          <span className={`text-sm min-w-[70px] text-right ${
                            addon.price === 0 
                              ? 'text-green-600 dark:text-green-400 font-medium'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {addon.price === 0 ? (t('pos.free') || 'FREE') : `+${formatMoney(addon.price)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaStickyNote className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('pos.itemNotes')}
              </span>
              <span className="text-xs text-gray-400">({t('common.optional')})</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('pos.itemNotesPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
          >
            <span>{t('pos.addToCart')}</span>
            <span>•</span>
            <span>{formatMoney(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSAddonModal;
