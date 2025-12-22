'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import OrderPageHeader from '@/components/customer/OrderPageHeader';
import CategoryTabs from '@/components/customer/CategoryTabs';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';
import TableNumberCard from '@/components/customer/TableNumberCard';
import HorizontalMenuSection from '@/components/customer/HorizontalMenuSection';
import DetailedMenuSection from '@/components/customer/DetailedMenuSection';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import MenuInCartModal from '@/components/menu/MenuInCartModal';
import { Alert, EmptyState } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import { CustomerOrderSkeleton } from '@/components/common/SkeletonLoaders';
import { getTableNumber } from '@/lib/utils/localStorage';
import TableNumberModal from '@/components/customer/TableNumberModal';

interface MenuItem {
  id: string; // ✅ String from API (BigInt serialized)
  name: string;
  description: string;
  price: number; // ✅ From API: decimalToNumber(Decimal) → number with 2 decimal precision
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
  promoPrice?: number; // ✅ From API: decimalToNumber(Decimal) → number with 2 decimal precision
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

/**
 * ✅ NEW: Opening Hours Interface
 * @specification copilot-instructions.md - Database Schema
 */
interface OpeningHour {
  id: string;
  merchantId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ✅ NEW: Merchant Info Interface
 * @specification copilot-instructions.md - Database Schema
 */
interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isActive: boolean;
  currency: string;
  enableTax: boolean;
  taxPercentage: number;
  openingHours: OpeningHour[];
}

/**
 * ✅ FIXED: Menu Browse Page with Proper Sticky Positioning
 * 
 * @improvements
 * - Fixed sticky category pills scrolling issue
 * - Proper scroll container hierarchy
 * - Header + Category pills stay fixed
 * - Only content section scrolls
 * - Mobile-optimized layout
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */
export default function MenuBrowsePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const merchantCode = params.merchantCode as string;
  const mode = searchParams.get('mode') || 'takeaway';

  const [categories, setCategories] = useState<Category[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]); // Store all items
  const [menuAddonsCache, setMenuAddonsCache] = useState<Record<string, any>>({}); // Cache for menu addons
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all' = show all sections (for filtering)
  const [activeScrollTab, setActiveScrollTab] = useState<string>('all'); // Active tab based on scroll position (for highlight only)
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [cartOptionsMenu, setCartOptionsMenu] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState(false); // Table number modal state
  const [showOutletInfo, setShowOutletInfo] = useState(false); // Outlet info modal state
  const [isSticky, setIsSticky] = useState(false); // Track if header should be sticky
  const [isCategoryTabsSticky, setIsCategoryTabsSticky] = useState(false); // Track if category tabs should be sticky
  const [showTableBadge, setShowTableBadge] = useState(false); // Track if table badge should be shown in header
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({}); // References to category sections
  const { initializeCart, cart, updateItem, removeItem } = useCart();

  const getMenuCartItems = (menuId: string): CartItem[] => {
    if (!cart) return [];
    return cart.items.filter((item) => item.menuId === menuId);
  };

  const handleOpenMenu = (item: MenuItem) => {
    const quantityInCart = getMenuQuantityInCart(item.id);
    if (quantityInCart > 0) {
      setCartOptionsMenu(item);
      return;
    }

    setEditingCartItem(null);
    setSelectedMenu(item);
  };

  const handleCloseMenuDetail = () => {
    setSelectedMenu(null);
    setEditingCartItem(null);
  };

  /**
   * Handle increasing quantity for a menu from horizontal card
   * Opens the cart options modal since there might be multiple configurations
   */
  const handleIncreaseQtyFromCard = (menuId: string) => {
    const menuItem = allMenuItems.find(m => m.id === menuId);
    if (menuItem) {
      setCartOptionsMenu(menuItem);
    }
  };

  /**
   * Handle decreasing quantity for a menu from horizontal card
   * Opens the cart options modal to choose which configuration to decrease
   */
  const handleDecreaseQtyFromCard = (menuId: string) => {
    const menuItem = allMenuItems.find(m => m.id === menuId);
    if (menuItem) {
      setCartOptionsMenu(menuItem);
    }
  };

  /**
   * Get total quantity of a menu item in cart (including all variants with different addons)
   */
  const getMenuQuantityInCart = (menuId: string): number => {
    if (!cart) return 0;
    return cart.items
      .filter(item => item.menuId === menuId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // ========================================
  // Load Table Number & Always Show Modal for Dinein
  // ========================================
  useEffect(() => {
    console.log('🔍 Loading table number...');
    console.log('Mode:', mode);
    console.log('Merchant Code:', merchantCode);

    if (mode === 'dinein') {
      const tableData = getTableNumber(merchantCode);

      console.log('📋 Table Data:', tableData);

      // Always show modal for dinein mode (even if table number exists)
      // This allows users to check/change their table number
      setShowTableModal(true);

      if (tableData?.tableNumber) {
        setTableNumber(tableData.tableNumber);
        console.log('✅ Table number set:', tableData.tableNumber);
      } else {
        console.warn('⚠️ No table number found in localStorage');
      }
    } else {
      console.log('⚠️ Not dinein mode, skipping table number');
    }
  }, [merchantCode, mode]);

  // ========================================
  // Handle Outlet Info Modal via URL
  // ========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const showInfo = params.get('outlet-info') === 'true';
    setShowOutletInfo(showInfo);
  }, [searchParams]);

  // ========================================
  // Fetch Merchant Info
  // ========================================
  useEffect(() => {
    const fetchMerchantInfo = async () => {
      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}`);
        const data = await response.json();

        if (data.success) {
          console.log('✅ Merchant info loaded:', data.data);
          setMerchantInfo(data.data);
        } else {
          console.error('❌ Failed to fetch merchant info:', data.message);
        }
      } catch (err) {
        console.error('❌ Error fetching merchant info:', err);
      }
    };

    fetchMerchantInfo();
  }, [merchantCode]);

  // ========================================
  // Fetch Menu Data (Once, all items)
  // ========================================
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [categoriesRes, menusRes] = await Promise.all([
          fetch(`/api/public/merchants/${merchantCode}/categories`),
          fetch(`/api/public/merchants/${merchantCode}/menus`), // Fetch all menus once
        ]);

        const categoriesData = await categoriesRes.json();
        const menusData = await menusRes.json();

        if (categoriesData.success) {
          const sorted = categoriesData.data.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder);
          setCategories(sorted);
        }

        if (menusData.success) {
          const activeItems = menusData.data
            .filter((item: MenuItem) => item.isActive)
            .map((item: MenuItem) => ({
              ...item,
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            }));
          setAllMenuItems(activeItems);
        } else {
          setError(menusData.message || 'Failed to load menu');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load menu. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [merchantCode]); // Only run once on mount

  // ========================================
  // Prefetch Addon Data in Background
  // ========================================
  useEffect(() => {
    if (allMenuItems.length === 0) return;

    const prefetchAddons = async () => {
      console.log('🔄 [PREFETCH] Starting addon prefetch for', allMenuItems.length, 'menus');

      // Prefetch addons for all menu items in background
      const promises = allMenuItems.map(async (menu) => {
        try {
          const response = await fetch(`/api/public/merchants/${merchantCode}/menus/${menu.id}/addons`);
          const data = await response.json();

          if (data.success) {
            return { menuId: menu.id, addons: data.data };
          }
          return null;
        } catch (err) {
          console.error(`Failed to prefetch addons for menu ${menu.id}:`, err);
          return null;
        }
      });

      const results = await Promise.all(promises);

      // Build cache object
      const cache: Record<string, any> = {};
      results.forEach((result) => {
        if (result) {
          cache[result.menuId] = result.addons;
        }
      });

      setMenuAddonsCache(cache);
      console.log('✅ [PREFETCH] Addon prefetch complete. Cached', Object.keys(cache).length, 'menus');
    };

    // Run prefetch in background (non-blocking)
    prefetchAddons();
  }, [allMenuItems, merchantCode]);

  useEffect(() => {
    initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
  }, [merchantCode, mode, initializeCart]);

  // ========================================
  // Sticky Header & Tabs Logic (Matches Reference Exactly)
  // ========================================
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('[data-header]') as HTMLElement;
      if (header) {
        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    const handleScroll = () => {
      // Header height is 55px + optional 40px table bar
      const stickyHeaderHeight = mode === 'dinein' && tableNumber ? 95 : 55;
      // Category tabs are 48px when sticky
      const totalStickyHeight = stickyHeaderHeight + 48;

      // Check if 75% of banner has been scrolled past (for header)
      const bannerElement = document.querySelector('[data-banner]');
      if (bannerElement) {
        const rect = bannerElement.getBoundingClientRect();
        const bannerHeight = rect.height;
        const scrolledPastBanner = rect.top + (bannerHeight * 0.75);

        // Header becomes sticky when 75% of banner has been scrolled past
        setIsSticky(scrolledPastBanner <= 0);
      }

      // Check if CategoryTabs should be sticky (separate detection)
      const categoryTabsElement = document.querySelector('[data-category-tabs-trigger]');
      if (categoryTabsElement) {
        const rect = categoryTabsElement.getBoundingClientRect();
        // CategoryTabs become sticky when top of trigger reaches header bottom
        setIsCategoryTabsSticky(rect.top <= stickyHeaderHeight);
      }

      // Check if TableNumberCard has been scrolled past (for showing table badge in header)
      const tableNumberElement = document.querySelector('[data-table-number-card]');
      if (tableNumberElement) {
        const rect = tableNumberElement.getBoundingClientRect();
        // Show table badge when TableNumberCard starts being covered by header OR has scrolled past
        setShowTableBadge(rect.top <= 55);
      }

      // Update active tab based on scroll position (scroll spy)
      // This only affects tab highlight, not menu filtering
      // Only runs when selectedCategory is 'all' (showing all sections)
      if (selectedCategory === 'all') {
        let currentCategory = 'all';
        for (const [categoryId, element] of Object.entries(sectionRefs.current)) {
          if (element) {
            const rect = element.getBoundingClientRect();
            // Section is active when its top is at or above the sticky area 
            // and its bottom is still visible
            if (rect.top <= totalStickyHeight + 50 && rect.bottom > totalStickyHeight) {
              currentCategory = categoryId;
            }
          }
        }

        // Only update if different to avoid unnecessary re-renders
        if (activeScrollTab !== currentCategory) {
          setActiveScrollTab(currentCategory);
        }
      }
    };    // Update header height on mount and window resize
    updateHeaderHeight();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [mode, tableNumber, selectedCategory, activeScrollTab]);

  // Filter items by selected category
  const displayedItems = selectedCategory === 'all'
    ? allMenuItems
    : allMenuItems.filter(item =>
      item.categories?.some(cat => cat.id === selectedCategory)
    );

  // Get promo items
  const promoItems = allMenuItems.filter(item => item.isPromo && item.promoPrice);

  // Get "Best Seller" items (items with isBestSeller = true)
  const bestSellerItems = allMenuItems.filter(item => item.isBestSeller);

  // Get "Recommendation" items (items with isRecommended = true)
  const recommendationItems = allMenuItems.filter(item => item.isRecommended);

  // ========================================
  // RENDER - NEW LAYOUT
  // ========================================
  return (
    <>
      {/* ======================================== 
          ORDER PAGE HEADER (New Component - Matches Reference)
          Positioned absolutely above banner when not sticky
      ======================================== */}
      <OrderPageHeader
        merchantName={merchantInfo?.name || merchantCode}
        merchantLogo={merchantInfo?.logoUrl || null}
        isSticky={isSticky}
        tableNumber={tableNumber}
        mode={mode as 'dinein' | 'takeaway'}
        showTableBadge={showTableBadge}
        onBackClick={() => {
          localStorage.removeItem(`mode_${merchantCode}`);
          router.push(`/${merchantCode}`);
        }}
        onSearchClick={() => {
          router.push(`/${merchantCode}/search?mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/order?mode=${mode}`)}`);
        }}
      />

      {/* Hero Section (Restaurant Banner) - Header overlays on top */}
      <div className="relative" data-banner>
        {isLoading ? (
          /* Banner Loading Skeleton */
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ) : (
          <RestaurantBanner
            imageUrl={merchantInfo?.logoUrl}
            bannerUrl={merchantInfo?.bannerUrl}
            merchantName={merchantInfo?.name || merchantCode}
          />
        )}
      </div>

      {/* ========================================
          MAIN CONTENT
      ======================================== */}
      <div className="pb-24">
        {/* Error Alert */}
        {error && (
          <div className="px-4 pt-4">
            <Alert
              variant="error"
              title="Error Loading Menu"
              message={error}
            />
          </div>
        )}

        {isLoading ? (
          <CustomerOrderSkeleton />
        ) : (
          <>
            {/* Restaurant Info Card - No divider above, floating style like Burjo */}
            <div className="px-4 -mt-6 relative z-10">
              {merchantInfo && (
                <RestaurantInfoCard
                  name={merchantInfo.name}
                  openingHours={merchantInfo.openingHours}
                  onClick={() => {
                    // Update URL without page reload
                    const params = new URLSearchParams(window.location.search);
                    params.set('outlet-info', 'true');
                    window.history.pushState({}, '', `?${params.toString()}`);
                    setShowOutletInfo(true);
                  }}
                />
              )}
            </div>

            {/* Table Number (Dinein Only) - No divider between components like Burjo */}
            {mode === 'dinein' && tableNumber && (
              <div className="px-4 my-2" data-table-number-card>
                <TableNumberCard tableNumber={tableNumber} />
              </div>
            )}

            {/* ========================================
                CATEGORY TABS (Sticky independently when scrolled to)
            ======================================== */}
            {/* Trigger point for CategoryTabs sticky detection */}
            <div data-category-tabs-trigger className="h-0" />

            {/* Placeholder spacer - shown when CategoryTabs is fixed to prevent content jump */}
            {isCategoryTabsSticky && (
              <div className="h-[48px]" aria-hidden="true" />
            )}

            {/* CategoryTabs - Always rendered, positioned based on its own sticky state */}
            <div
              data-category-tabs
              className={`transition-all duration-300 ${isCategoryTabsSticky
                ? 'fixed left-0 right-0 z-40'
                : 'relative'
                } max-w-[500px] mx-auto bg-white`}
              style={{
                top: isCategoryTabsSticky
                  ? (mode === 'dinein' && tableNumber ? '95px' : '55px') // 55px header + optional 40px table bar
                  : 'auto',
              }}
            >
              <CategoryTabs
                categories={categories}
                activeTab={selectedCategory === 'all' ? activeScrollTab : selectedCategory}
                onTabClick={(categoryId: string) => {
                  if (categoryId === 'all') {
                    // Reset to all mode - show all sections
                    setSelectedCategory('all');
                    setActiveScrollTab('all');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else if (selectedCategory === 'all') {
                    // User clicked a category while viewing all - just scroll to it
                    setActiveScrollTab(categoryId);
                    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    // User is in single category mode - switch to that category
                    setSelectedCategory(categoryId);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
            </div>

            {/* Show ALL sections when 'all' is selected */}
            {selectedCategory === 'all' ? (
              <>
                {/* Promo Section */}
                {promoItems.length > 0 && (
                  <>
                    <div className="mt-4">
                      <HorizontalMenuSection
                        title="Promo"
                        items={promoItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                        isPromoSection={true}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200 dark:border-gray-700" />
                    </div>
                  </>
                )}

                {/* Best Seller Section */}
                {bestSellerItems.length > 0 && (
                  <>
                    <div className="mt-4">
                      <HorizontalMenuSection
                        title="Best Seller"
                        items={bestSellerItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200 dark:border-gray-700" />
                    </div>
                  </>
                )}

                {/* Recommendation Section */}
                {recommendationItems.length > 0 && (
                  <>
                    <div className="mt-4">
                      <HorizontalMenuSection
                        title="Recommendation"
                        items={recommendationItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200 dark:border-gray-700" />
                    </div>
                  </>
                )}

                {/* All Categories Detailed Sections */}
                {categories.map((category, index) => {
                  const categoryItems = allMenuItems.filter(item =>
                    item.categories?.some(cat => cat.id === category.id)
                  );

                  if (categoryItems.length === 0) return null;

                  return (
                    <div
                      key={category.id}
                      ref={(el) => {
                        sectionRefs.current[category.id] = el;
                      }}
                      data-category-section={category.id}
                    >
                      <div className="mt-4">
                        <DetailedMenuSection
                          title={category.name.toUpperCase()}
                          items={categoryItems}
                          currency={merchantInfo?.currency || 'AUD'}
                          onAddItem={(item) => handleOpenMenu(item as MenuItem)}
                          getItemQuantityInCart={getMenuQuantityInCart}
                          onIncreaseQty={handleIncreaseQtyFromCard}
                          onDecreaseQty={handleDecreaseQtyFromCard}
                        />
                      </div>
                      {/* Divider between categories */}
                      {index < categories.length - 1 && (
                        <div className="px-4 mt-6">
                          <hr className="border-gray-200 dark:border-gray-700" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              /* Show single category when specific category selected */
              <>
                <div className="px-4 mt-4">
                  <hr className="border-gray-200 dark:border-gray-700" />
                </div>
                <div className="mt-4">
                  <DetailedMenuSection
                    title={categories.find(c => c.id === selectedCategory)?.name.toUpperCase() || ''}
                    items={displayedItems}
                    currency={merchantInfo?.currency || 'AUD'}
                    onAddItem={(item) => handleOpenMenu(item as MenuItem)}
                    getItemQuantityInCart={getMenuQuantityInCart}
                    onIncreaseQty={handleIncreaseQtyFromCard}
                    onDecreaseQty={handleDecreaseQtyFromCard}
                  />
                </div>
              </>
            )}

            {/* Empty State */}
            {displayedItems.length === 0 && !isLoading && selectedCategory !== 'all' && (
              <div className="px-4 mt-6">
                <EmptyState
                  title="No Menu Items"
                  description="No items available in this category"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================
          FLOATING CART BUTTON
      ======================================== */}
      <FloatingCartButton merchantCode={merchantCode} mode={mode as 'dinein' | 'takeaway'} />

      {/* ========================================
          MENU DETAIL MODAL
      ======================================== */}
      {selectedMenu && (
        <MenuDetailModal
          menu={selectedMenu}
          merchantCode={merchantCode}
          mode={mode}
          currency={merchantInfo?.currency || 'AUD'}
          editMode={Boolean(editingCartItem)}
          existingCartItem={editingCartItem}
          onClose={handleCloseMenuDetail}
          prefetchedAddons={menuAddonsCache[selectedMenu.id]}
        />
      )}

      {cartOptionsMenu && (
        <MenuInCartModal
          menuName={cartOptionsMenu.name}
          currency={merchantInfo?.currency || 'AUD'}
          items={getMenuCartItems(cartOptionsMenu.id)}
          onClose={() => setCartOptionsMenu(null)}
          onCreateAnother={() => {
            setEditingCartItem(null);
            setSelectedMenu(cartOptionsMenu);
            setCartOptionsMenu(null);
          }}
          onEditItem={(item) => {
            setEditingCartItem(item);
            setSelectedMenu(cartOptionsMenu);
            setCartOptionsMenu(null);
          }}
          onIncreaseQty={(item) => {
            updateItem(item.cartItemId, { quantity: item.quantity + 1 });
          }}
          onDecreaseQty={(item) => {
            const nextQty = item.quantity - 1;
            if (nextQty <= 0) {
              removeItem(item.cartItemId);
              return;
            }
            updateItem(item.cartItemId, { quantity: nextQty });
          }}
        />
      )}

      {/* ========================================
          TABLE NUMBER MODAL (Dinein Only)
      ======================================== */}
      <TableNumberModal
        merchantCode={merchantCode}
        isOpen={showTableModal}
        onClose={() => {
          // Allow closing modal - user can cancel if they want
          setShowTableModal(false);
        }}
        onConfirm={(number: string) => {
          setTableNumber(number);
          setShowTableModal(false);
          console.log('✅ Table number confirmed:', number);
        }}
      />

      {/* ========================================
          OUTLET INFO MODAL
      ======================================== */}
      {merchantInfo && (
        <OutletInfoModal
          isOpen={showOutletInfo}
          onClose={() => {
            // Remove URL param when closing
            const params = new URLSearchParams(window.location.search);
            params.delete('outlet-info');
            const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
            window.history.pushState({}, '', newUrl);
            setShowOutletInfo(false);
          }}
          merchantCode={merchantCode}
          merchant={{
            name: merchantInfo.name,
            address: merchantInfo.address,
            phone: merchantInfo.phone,
            logoUrl: merchantInfo.logoUrl || undefined,
            openingHours: merchantInfo.openingHours.map(h => ({ ...h, is24Hours: (h as { is24Hours?: boolean }).is24Hours ?? false })),
          }}
        />
      )}
    </>
  );
}
