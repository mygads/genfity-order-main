'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import MenuInCartModal from '@/components/menu/MenuInCartModal';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils/format';
import { useCustomerData } from '@/context/CustomerDataContext';
import type { CachedAddonCategory } from '@/lib/utils/addonExtractor';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import { useStoreStatus } from '@/hooks/useStoreStatus';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  categoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  isActive: boolean;
  trackStock: boolean;
  isPromo?: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  promoPrice?: number;
}

interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  currency: string;
}

// Sort options
type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'popular';

// Sort options will be translated inside component
const SORT_OPTION_KEYS: { value: SortOption; key: TranslationKeys }[] = [
  { value: 'name-asc', key: 'customer.menu.sortNameAZ' },
  { value: 'name-desc', key: 'customer.menu.sortNameZA' },
  { value: 'price-asc', key: 'customer.menu.sortPriceLow' },
  { value: 'price-desc', key: 'customer.menu.sortPriceHigh' },
  { value: 'popular', key: 'customer.menu.sortPopular' },
];

// Dietary/Tag filters with translation keys
const DIETARY_FILTER_KEYS: Array<{ key: string; labelKey: TranslationKeys; emoji: string; color: string }> = [
  { key: 'isSpicy', labelKey: 'customer.menu.spicy', emoji: '🌶️', color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'isBestSeller', labelKey: 'customer.menu.bestSeller', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { key: 'isSignature', labelKey: 'customer.menu.signature', emoji: '👨‍🍳', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'isRecommended', labelKey: 'customer.menu.recommended', emoji: '👍', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'isPromo', labelKey: 'customer.menu.promo', emoji: '🏷️', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

export default function SearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const mode = searchParams.get('mode') || 'takeaway';
  const refUrl = searchParams.get('ref') || `/${merchantCode}/order?mode=${mode}`;

  // ✅ Check store status (open/closed)
  const { storeOpen } = useStoreStatus(merchantCode, { refreshInterval: 30000 });

  // ✅ Use CustomerData Context for instant data access
  const { 
    merchantInfo: contextMerchantInfo, 
    menus: contextMenus, 
    addonCache: contextAddonCache,
    isInitialized,
    initializeData 
  } = useCustomerData();

  const [searchQuery, setSearchQuery] = useState('');
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [menuAddonsCache, setMenuAddonsCache] = useState<Record<string, CachedAddonCategory[]>>({});
  const [merchantInfo, setMerchantInfo] = useState<{ id: string; code: string; name: string; currency: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [cartOptionsMenu, setCartOptionsMenu] = useState<MenuItem | null>(null);

  // ✅ NEW: Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDietaryFilters, setSelectedDietaryFilters] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);

  const { initializeCart, cart, updateItem, removeItem } = useCart();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
  }, [merchantCode, mode, initializeCart]);

  // ✅ Initialize data from Context (instant if available from Order page)
  useEffect(() => {
    // Ensure context is initialized for this merchant
    initializeData(merchantCode);
  }, [merchantCode, initializeData]);

  // ✅ Use Context data when available (instant navigation)
  useEffect(() => {
    if (isInitialized && contextMenus.length > 0) {
      console.log('✅ [SEARCH] Using CustomerData Context - instant load');
      const activeItems = contextMenus.filter((item) => item.isActive) as MenuItem[];
      setAllMenuItems(activeItems);
      setMenuAddonsCache(contextAddonCache);
      
      if (contextMerchantInfo) {
        setMerchantInfo({
          id: contextMerchantInfo.id,
          code: contextMerchantInfo.code,
          name: contextMerchantInfo.name,
          currency: contextMerchantInfo.currency,
        });
      }
      
      // Calculate max price
      const prices = activeItems.map((m) => m.isPromo && m.promoPrice ? m.promoPrice : m.price);
      const calculatedMax = Math.ceil(Math.max(...prices, 100));
      setMaxPrice(calculatedMax);
      setPriceRange([0, calculatedMax]);
      
      setIsLoading(false);
    }
  }, [isInitialized, contextMenus, contextAddonCache, contextMerchantInfo]);

  // ✅ Get unique categories from menu items
  const availableCategories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    allMenuItems.forEach(item => {
      item.categories?.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });
    });
    return Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allMenuItems]);

  // ✅ Enhanced filtering with all filters
  const filteredItems = useMemo(() => {
    let items = [...allMenuItems];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      items = items.filter(item =>
        item.categories?.some(cat => selectedCategories.includes(cat.id))
      );
    }

    // Dietary/Tag filters
    if (selectedDietaryFilters.length > 0) {
      items = items.filter(item =>
        selectedDietaryFilters.every(filter => item[filter as keyof MenuItem])
      );
    }

    // Price range filter
    items = items.filter(item => {
      const effectivePrice = item.isPromo && item.promoPrice ? item.promoPrice : item.price;
      return effectivePrice >= priceRange[0] && effectivePrice <= priceRange[1];
    });

    // Sorting
    switch (sortBy) {
      case 'name-asc':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        items.sort((a, b) => {
          const priceA = a.isPromo && a.promoPrice ? a.promoPrice : a.price;
          const priceB = b.isPromo && b.promoPrice ? b.promoPrice : b.price;
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        items.sort((a, b) => {
          const priceA = a.isPromo && a.promoPrice ? a.promoPrice : a.price;
          const priceB = b.isPromo && b.promoPrice ? b.promoPrice : b.price;
          return priceB - priceA;
        });
        break;
      case 'popular':
        // Sort by best seller, then signature, then recommended
        items.sort((a, b) => {
          const scoreA = (a.isBestSeller ? 4 : 0) + (a.isSignature ? 2 : 0) + (a.isRecommended ? 1 : 0);
          const scoreB = (b.isBestSeller ? 4 : 0) + (b.isSignature ? 2 : 0) + (b.isRecommended ? 1 : 0);
          return scoreB - scoreA;
        });
        break;
    }

    return items;
  }, [allMenuItems, searchQuery, selectedCategories, selectedDietaryFilters, priceRange, sortBy]);

  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || selectedDietaryFilters.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedDietaryFilters([]);
    setPriceRange([0, maxPrice]);
    setSortBy('name-asc');
  };

  const getMenuCartItems = (menuId: string): CartItem[] => {
    if (!cart) return [];
    return cart.items.filter((item) => item.menuId === menuId);
  };

  const getMenuQuantityInCart = (menuId: string): number => {
    if (!cart) return 0;
    return cart.items.filter((item) => item.menuId === menuId).reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleOpenMenu = (item: MenuItem) => {
    const quantityInCart = getMenuQuantityInCart(item.id);
    if (quantityInCart > 0) { setCartOptionsMenu(item); return; }
    setEditingCartItem(null);
    setSelectedMenu(item);
  };

  const handleCloseMenuDetail = () => { setSelectedMenu(null); setEditingCartItem(null); };
  const handleBack = () => { router.push(decodeURIComponent(refUrl)); };
  const isAvailable = (item: MenuItem) => item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));

  return (
    <div className="min-h-screen bg-white">
      {/* Search Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" aria-label={t('common.back')}>
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><Search className="w-5 h-5 text-gray-400" /></div>
            <input ref={inputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('customer.menu.searchPlaceholder')} className="w-full h-9 pl-10 pr-10 bg-white border rounded-lg text-sm text-gray-900 border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label={t('common.clear')}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>)}
          </div>
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showFilters ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-700'}`}
            aria-label={t('common.filter')}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border-b-2 border-gray-300 px-4 py-4 space-y-4">
          {/* Sort Dropdown */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">{t('customer.menu.sortBy')}</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full h-10 pl-3 pr-10 bg-white border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {SORT_OPTION_KEYS.map(option => (
                  <option key={option.value} value={option.value}>{t(option.key)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              {t('customer.menu.priceRange')} {formatCurrency(priceRange[0], merchantInfo?.currency || 'AUD')} - {formatCurrency(priceRange[1], merchantInfo?.currency || 'AUD')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={maxPrice}
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1] - 1), priceRange[1]])}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <input
                type="range"
                min={0}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 1)])}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>

          {/* Category Filters */}
          {availableCategories.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">{t('customer.menu.categories')}</label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategories(prev =>
                        prev.includes(cat.id)
                          ? prev.filter(id => id !== cat.id)
                          : [...prev, cat.id]
                      );
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${selectedCategories.includes(cat.id)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dietary / Tag Filters */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">{t('customer.menu.tags')}</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_FILTER_KEYS.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => {
                    setSelectedDietaryFilters(prev =>
                      prev.includes(filter.key)
                        ? prev.filter(k => k !== filter.key)
                        : [...prev, filter.key]
                    );
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${selectedDietaryFilters.includes(filter.key)
                    ? filter.color + ' border-current'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {filter.emoji} {t(filter.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="w-full h-10 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              {t('customer.menu.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="pb-24">
        {isLoading ? (
          /* Search Page Skeleton */
          <div className="px-4 py-3">
            <div className="mb-4">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', paddingTop: '16px', paddingBottom: '16px', borderBottom: i < 7 ? '2px solid #e4e2e2ff' : 'none' }}>
                  <div style={{ width: '70px', height: '70px', flexShrink: 0, borderRadius: '8px', backgroundColor: '#e5e7eb' }} className="animate-pulse" />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {searchQuery ? t('customer.search.searchResults', { count: filteredItems.length }) : t('customer.menu.mustTryThisWeek')}
              </h2>
            </div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12"><p className="text-gray-500">{t('customer.search.noResults')}</p></div>
            ) : (
              <div className="bg-white px-4">
                {filteredItems.map((item, index) => {
                  const available = isAvailable(item);
                  const quantityInCart = getMenuQuantityInCart(item.id);
                  const isInCart = quantityInCart > 0;
                  return (
                    <div key={item.id} style={{ position: 'relative', display: 'flex', gap: '12px', paddingTop: '16px', paddingBottom: '16px', borderBottom: index < filteredItems.length - 1 ? '2px solid #e4e2e2ff' : 'none' }}>
                      {isInCart && (<div style={{ position: 'absolute', left: '-16px', top: '10px', bottom: '10px', width: '4px', backgroundColor: '#F05A28', borderRadius: '0 2px 2px 0' }} />)}
                      <div onClick={() => available && handleOpenMenu(item)} style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f3f4f6', cursor: available ? 'pointer' : 'default', filter: available ? 'none' : 'grayscale(100%)', opacity: available ? 1 : 0.6 }}>
                        <Image src={item.imageUrl || '/images/default-menu.png'} alt={item.name} fill className="object-cover" sizes="70px" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <h4 onClick={() => available && handleOpenMenu(item)} className="line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, color: available ? '#000000' : '#9CA3AF', lineHeight: '1.4', margin: 0, cursor: available ? 'pointer' : 'default' }}>{item.name}</h4>
                        {item.description && (<p onClick={() => available && handleOpenMenu(item)} className="line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 400, color: available ? '#222222ff' : '#9CA3AF', lineHeight: '1.5', margin: '4px 0 0 0', cursor: available ? 'pointer' : 'default' }}>{item.description}</p>)}
                        {(item.isSpicy || item.isBestSeller || item.isSignature || item.isRecommended) && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            {item.isBestSeller && (<div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}><Image src="/images/menu-badges/best-seller.png" alt={t('customer.menu.bestSeller')} fill className="object-contain" /></div>)}
                            {item.isSignature && (<div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}><Image src="/images/menu-badges/signature.png" alt={t('customer.menu.signature')} fill className="object-contain" /></div>)}
                            {item.isSpicy && (<div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}><Image src="/images/menu-badges/spicy.png" alt={t('customer.menu.spicy')} fill className="object-contain" /></div>)}
                            {item.isRecommended && (<div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}><Image src="/images/menu-badges/recommended.png" alt={t('customer.menu.recommended')} fill className="object-contain" /></div>)}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                          <div onClick={() => available && handleOpenMenu(item)} style={{ cursor: available ? 'pointer' : 'default' }}>
                            {item.isPromo && item.promoPrice ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: available ? '#000000' : '#9CA3AF' }}>{formatCurrency(item.promoPrice, merchantInfo?.currency || 'AUD')}</span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF', textDecoration: 'line-through' }}>{formatCurrency(item.price, merchantInfo?.currency || 'AUD')}</span>
                              </div>
                            ) : (<span style={{ fontSize: '14px', fontWeight: 700, color: available ? '#000000' : '#9CA3AF' }}>{formatCurrency(item.price, merchantInfo?.currency || 'AUD')}</span>)}
                          </div>
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            {/* Low Stock Indicator - hide when store closed */}
                            {available && storeOpen && item.trackStock && item.stockQty !== null && item.stockQty <= 10 && (
                              <span style={{ fontSize: '12px', fontWeight: 500, color: '#f97316' }}>{t('customer.menu.onlyLeft', { count: item.stockQty })}</span>
                            )}
                            {!storeOpen ? (
                              /* Store closed - no add button */
                              null
                            ) : !available ? (<span style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>{t('customer.menu.soldOut')}</span>
                            ) : isInCart ? (
                              <div style={{ display: 'flex', alignItems: 'center', height: '32px', border: '1px solid #F05A28', borderRadius: '8px' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenMenu(item); }} style={{ width: '32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', color: '#F05A28', cursor: 'pointer', fontSize: '16px' }}>−</button>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#000000', minWidth: '20px', textAlign: 'center' }}>{quantityInCart}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenMenu(item); }} style={{ width: '32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', color: '#F05A28', cursor: 'pointer', fontSize: '16px' }}>+</button>
                              </div>
                            ) : (<button onClick={(e) => { e.stopPropagation(); handleOpenMenu(item); }} style={{ height: '32px', padding: '0 20px', border: '1px solid #F05A28', borderRadius: '8px', backgroundColor: 'transparent', color: '#F05A28', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>{t('common.add')}</button>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <FloatingCartButton merchantCode={merchantCode} mode={mode as 'dinein' | 'takeaway'} storeOpen={storeOpen} />

      {selectedMenu && (
        <MenuDetailModal menu={selectedMenu} merchantCode={merchantCode} mode={mode} currency={merchantInfo?.currency || 'AUD'} editMode={Boolean(editingCartItem)} existingCartItem={editingCartItem} onClose={handleCloseMenuDetail} prefetchedAddons={menuAddonsCache[selectedMenu.id]} storeOpen={storeOpen} />
      )}

      {cartOptionsMenu && (
        <MenuInCartModal menuName={cartOptionsMenu.name} currency={merchantInfo?.currency || 'AUD'} items={getMenuCartItems(cartOptionsMenu.id)} onClose={() => setCartOptionsMenu(null)} onCreateAnother={() => { setEditingCartItem(null); setSelectedMenu(cartOptionsMenu); setCartOptionsMenu(null); }} onEditItem={(item) => { setEditingCartItem(item); setSelectedMenu(cartOptionsMenu); setCartOptionsMenu(null); }} onIncreaseQty={(item) => { updateItem(item.cartItemId, { quantity: item.quantity + 1 }); }} onDecreaseQty={(item) => { const nextQty = item.quantity - 1; if (nextQty <= 0) { removeItem(item.cartItemId); return; } updateItem(item.cartItemId, { quantity: nextQty }); }} />
      )}
    </div>
  );
}
