/**
 * POS Product Grid Component
 * 
 * Right side panel showing menu items
 * - Category tabs with orange-500 theme
 * - Search functionality
 * - Product cards with images
 * - Adjustable grid columns 1-12 (image size changes, name/price fixed)
 * - Uses image badges from /images/menu-badges/ like customer pages
 */

'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface MenuCategory {
  id: number | string;
  name: string;
}

export interface MenuItem {
  id: number | string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  categoryId?: number | string;
  trackStock?: boolean;
  stockQty?: number | null;
  hasAddons?: boolean;
  promoPrice?: number | null;
}

interface POSProductGridProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  currency: string;
  isLoading?: boolean;
  onAddItem: (item: MenuItem) => void;
  gridColumns?: number;
  popularMenuIds?: (number | string)[]; // IDs of frequently ordered items
}

// Special category IDs for virtual categories
const SPECIAL_CATEGORIES = {
  POPULAR: '__popular__',
  BEST_SELLER: '__bestseller__',
};

export const POSProductGrid: React.FC<POSProductGridProps> = ({
  categories,
  menuItems,
  currency,
  isLoading = false,
  onAddItem,
  gridColumns = 5,
  popularMenuIds = [],
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Format currency - A$ for AUD, Rp for IDR
  const formatCurrency = (amount: number): string => {
    if (currency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }
    if (currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp${formatted}`;
    }
    // Fallback for other currencies
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Filter menu items
  const filteredItems = useMemo(() => {
    let items = menuItems.filter(item => item.isActive);

    // Filter by special category (Popular)
    if (selectedCategory === SPECIAL_CATEGORIES.POPULAR) {
      items = items.filter(item => popularMenuIds.includes(item.id) || popularMenuIds.includes(String(item.id)));
    } 
    // Filter by special category (Best Sellers)
    else if (selectedCategory === SPECIAL_CATEGORIES.BEST_SELLER) {
      items = items.filter(item => item.isBestSeller);
    }
    // Filter by regular category
    else if (selectedCategory) {
      items = items.filter(item => 
        String(item.categoryId) === String(selectedCategory)
      );
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  // Check if item is out of stock
  const isOutOfStock = (item: MenuItem): boolean => {
    return item.trackStock === true && (item.stockQty === null || item.stockQty === undefined || item.stockQty <= 0);
  };

  // Check if item has low stock (5 or less)
  const isLowStock = (item: MenuItem): boolean => {
    return item.trackStock === true && item.stockQty !== null && item.stockQty !== undefined && item.stockQty > 0 && item.stockQty <= 5;
  };

  // Get stock status label
  const getStockLabel = (item: MenuItem): { text: string; className: string } | null => {
    if (!item.trackStock || item.stockQty === null || item.stockQty === undefined) return null;
    
    if (item.stockQty <= 0) {
      return { text: t('pos.soldOut') || 'SOLD OUT', className: 'bg-red-500 text-white' };
    }
    if (item.stockQty <= 3) {
      return { text: `${t('pos.stock') || 'Stock'}: ${item.stockQty}`, className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
    }
    if (item.stockQty <= 5) {
      return { text: `${t('pos.stock') || 'Stock'}: ${item.stockQty}`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
    return { text: `${t('pos.stock') || 'Stock'}: ${item.stockQty}`, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  };

  // Dynamic grid classes based on gridColumns prop (1-12 range)
  const getGridClasses = () => {
    const colClasses: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      6: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
      7: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
      8: 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8',
      9: 'grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9',
      10: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10',
      11: 'grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-11',
      12: 'grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12',
    };
    return colClasses[gridColumns] || colClasses[5];
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-gray-800 overflow-hidden">
      {/* Header - Search & Categories */}
      <div className="shrink-0 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 w-full max-w-full overflow-hidden">
        {/* Search Bar */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pos.searchMenu')}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('pos.allItems')}
          </button>
          
          {/* Popular Items (Frequently Bought) - Only show if there are popular items */}
          {popularMenuIds.length > 0 && (
            <button
              onClick={() => setSelectedCategory(SPECIAL_CATEGORIES.POPULAR)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === SPECIAL_CATEGORIES.POPULAR
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
              }`}
            >
              <span>🔥</span>
              {t('pos.frequentlyBought') || 'Frequently Bought'}
            </button>
          )}
          
          {/* Best Sellers - Only show if there are best seller items */}
          {menuItems.some(item => item.isBestSeller && item.isActive) && (
            <button
              onClick={() => setSelectedCategory(SPECIAL_CATEGORIES.BEST_SELLER)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === SPECIAL_CATEGORIES.BEST_SELLER
                  ? 'bg-orange-500 text-white'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <span>⭐</span>
              {t('pos.bestSellers') || 'Best Sellers'}
            </button>
          )}
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(String(category.id))}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                String(selectedCategory) === String(category.id)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          // Loading skeleton
          <div className={`grid ${getGridClasses()} gap-3`}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <FaSearch className="w-12 h-12 mb-3" />
            <p className="text-sm">{t('pos.noItemsFound')}</p>
            <p className="text-xs mt-1">{t('pos.tryDifferentSearch')}</p>
          </div>
        ) : (
          // Product Grid
          <div className={`grid ${getGridClasses()} gap-3`}>
            {filteredItems.map((item) => {
              const outOfStock = isOutOfStock(item);
              const hasPromo = item.promoPrice !== null && item.promoPrice !== undefined;
              
              return (
                <button
                  key={item.id}
                  onClick={() => !outOfStock && onAddItem(item)}
                  disabled={outOfStock}
                  className={`bg-white dark:bg-gray-900 rounded-lg overflow-hidden text-left transition-all hover:shadow-lg hover:scale-[1.02] focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 ${
                    outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {/* Image - scales with grid */}
                  <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30">
                        <div className="text-4xl">
                          🍽️
                        </div>
                      </div>
                    )}

                    {/* Badge Images - use same style as customer pages */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {item.isRecommended && (
                        <div
                          className="relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white"
                          title="Recommended"
                        >
                          <Image
                            src="/images/menu-badges/recommended.png"
                            alt="Recommended"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      {item.isBestSeller && (
                        <div
                          className="relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white"
                          title="Best Seller"
                        >
                          <Image
                            src="/images/menu-badges/best-seller.png"
                            alt="Best Seller"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      {item.isSignature && (
                        <div
                          className="relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white"
                          title="Signature"
                        >
                          <Image
                            src="/images/menu-badges/signature.png"
                            alt="Signature"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      {item.isSpicy && (
                        <div
                          className="relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white"
                          title="Spicy"
                        >
                          <Image
                            src="/images/menu-badges/spicy.png"
                            alt="Spicy"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Out of Stock Overlay */}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded uppercase shadow-lg">
                          {t('pos.soldOut') || 'HABIS'}
                        </span>
                      </div>
                    )}

                    {/* Promo Badge */}
                    {hasPromo && !outOfStock && (
                      <div className="absolute top-2 right-2">
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                          PROMO
                        </span>
                      </div>
                    )}

                    {/* Stock indicator - Enhanced */}
                    {(() => {
                      const stockLabel = getStockLabel(item);
                      if (!stockLabel || outOfStock) return null;
                      return (
                        <div className="absolute bottom-2 left-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stockLabel.className}`}>
                            {stockLabel.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Info - Fixed size regardless of grid */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {hasPromo ? (
                        <>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(item.promoPrice!)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(item.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSProductGrid;
