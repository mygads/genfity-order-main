'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';
import TableNumberCard from '@/components/customer/TableNumberCard';
import HorizontalMenuSection from '@/components/customer/HorizontalMenuSection';
import PromoMenuSection from '@/components/customer/PromoMenuSection';
import DetailedMenuSection from '@/components/customer/DetailedMenuSection';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import { Alert, EmptyState } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { getTableNumber } from '@/lib/utils/localStorage';
import TableNumberModal from '@/components/customer/TableNumberModal';

interface MenuItem {
  id: number;
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
  is24Hours: boolean;
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
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all' = show all sections
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false); // Track scroll position
  const [showTableModal, setShowTableModal] = useState(false); // Table number modal state
  const [showOutletInfo, setShowOutletInfo] = useState(false); // Outlet info modal state
  const { initializeCart, cart } = useCart();

  /**
   * Get total quantity of a menu item in cart (including all variants with different addons)
   */
  const getMenuQuantityInCart = (menuId: number): number => {
    if (!cart) return 0;
    return cart.items
      .filter(item => parseInt(item.menuId) === menuId)
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

  useEffect(() => {
    initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
  }, [merchantCode, mode, initializeCart]);

  // ========================================
  // Scroll Detection for Sticky Header Effect
  // ========================================
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.getElementById('scroll-container');
      if (scrollContainer) {
        // Show sticky header when scrolled more than 50px
        setIsScrolled(scrollContainer.scrollTop > 50);
      }
    };

    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Filter items by selected category
  const displayedItems = selectedCategory === 'all'
    ? allMenuItems
    : allMenuItems.filter(item =>
      item.categories?.some(cat => cat.id === selectedCategory)
    );

  // Get promo items
  const promoItems = allMenuItems.filter(item => item.isPromo && item.promoPrice);

  // Get "New Menu" items (first 6 items)
  const newMenuItems = allMenuItems.slice(0, 6);

  // Get "Best Seller" items (items with high stock or featured)
  const bestSellerItems = allMenuItems.filter(item =>
    item.trackStock && item.stockQty && item.stockQty > 50
  ).slice(0, 6);

  // ========================================
  // RENDER - NEW LAYOUT
  // ========================================
  return (
    <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900">
      {/* ========================================
          HEADER (STICKY)
      ======================================== */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-gray-50 dark:bg-gray-800 shadow-md'
        : 'bg-gray-50 dark:bg-gray-800'
        }`}>
        {/* Table Number Badge (Shown when scrolled in dinein mode) */}
        {isScrolled && mode === 'dinein' && tableNumber && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-60">
            <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
              Table {tableNumber}
            </div>
          </div>
        )}

        <CustomerHeader
          merchantCode={merchantCode}
          mode={mode as 'dinein' | 'takeaway'}
          showBackButton={true}
          onBack={() => {
            localStorage.removeItem(`mode_${merchantCode}`);
            router.push(`/${merchantCode}`);
          }}
        />

        {/* ========================================
            STICKY CATEGORY TABS (Below Header)
        ======================================== */}
        {!isLoading && categories.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide px-4">
              {/* ALL MENU Tab */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === 'all'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                ALL MENU
              </button>

              {/* Category Tabs */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-2 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === category.id
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {category.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          SCROLLABLE CONTENT
      ======================================== */}
      <div id="scroll-container" className="flex-1 overflow-y-auto">
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
          <LoadingState type="inline" message={LOADING_MESSAGES.MENU} />
        ) : (
          <div className="pb-24">
            {/* Restaurant Banner */}
            <RestaurantBanner
              imageUrl={merchantInfo?.logoUrl}
              merchantName={merchantInfo?.name || merchantCode}
            />

            {/* Divider */}
            <div className="px-4 mt-4">
              <hr className="border-gray-200 dark:border-gray-700" />
            </div>

            {/* Restaurant Info Card */}
            <div className="px-4 mt-4">
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

            {/* Divider */}
            <div className="px-4 mt-4">
              <hr className="border-gray-200 dark:border-gray-700" />
            </div>

            {/* Table Number (Dinein Only) */}
            {mode === 'dinein' && tableNumber && (
              <>
                <div className="px-4 mt-4">
                  <TableNumberCard tableNumber={tableNumber} />
                </div>
                {/* Divider */}
                <div className="px-4 mt-4">
                  <hr className="border-gray-200 dark:border-gray-700" />
                </div>
              </>
            )}

            {/* Show ALL sections when 'all' is selected */}
            {selectedCategory === 'all' ? (
              <>
                {/* Promo Section */}
                {promoItems.length > 0 && (
                  <>
                    <div className="mt-4">
                      <PromoMenuSection
                        items={promoItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        // Promo items have a smaller shape. Convert to the page's MenuItem
                        // shape before setting as selected menu so MenuDetailModal receives
                        // the expected properties.
                        onItemClick={(item) => {
                          const menuLike = {
                            id: item.id,
                            name: item.name,
                            description: '',
                            price: item.price,
                            imageUrl: item.imageUrl,
                            stockQty: null,
                            categoryId: null,
                            categories: [] as { id: string; name: string }[],
                            isActive: true,
                            trackStock: false,
                            isPromo: !!item.promoPrice,
                            promoPrice: item.promoPrice,
                          };

                          setSelectedMenu(menuLike as unknown as MenuItem);
                        }}
                        getItemQuantityInCart={getMenuQuantityInCart}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200 dark:border-gray-700" />
                    </div>
                  </>
                )}

                {/* New Menu Section */}
                {newMenuItems.length > 0 && (
                  <>
                    <div className="mt-4">
                      <HorizontalMenuSection
                        title="New Menu"
                        items={newMenuItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        onItemClick={(item) =>
                          setSelectedMenu({
                            id: item.id,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            imageUrl: item.imageUrl,
                            stockQty: item.stockQty ?? null,
                            categoryId: null,
                            categories: [],
                            isActive: item.isActive,
                            trackStock: item.trackStock,
                            isPromo: item.isPromo,
                            promoPrice: item.promoPrice,
                          })
                        }
                        getItemQuantityInCart={getMenuQuantityInCart}
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
                        onItemClick={(item) =>
                          setSelectedMenu({
                            id: item.id,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            imageUrl: item.imageUrl,
                            stockQty: item.stockQty ?? null,
                            categoryId: null,
                            categories: [],
                            isActive: item.isActive,
                            trackStock: item.trackStock,
                            isPromo: item.isPromo,
                            promoPrice: item.promoPrice,
                          })
                        }
                        getItemQuantityInCart={getMenuQuantityInCart}
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
                    <div key={category.id}>
                      <div className="mt-4">
                        <DetailedMenuSection
                          title={category.name.toUpperCase()}
                          items={categoryItems}
                          currency={merchantInfo?.currency || 'AUD'}
                          onAddItem={(item) => setSelectedMenu({
                            id: item.id,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            imageUrl: item.imageUrl,
                            stockQty: item.stockQty ?? null,
                            categoryId: null,
                            categories: [],
                            isActive: item.isActive,
                            trackStock: item.trackStock,
                            isPromo: item.isPromo,
                            promoPrice: item.promoPrice,
                          })}
                          getItemQuantityInCart={getMenuQuantityInCart}
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
                    onAddItem={(item) => setSelectedMenu({
                      id: item.id,
                      name: item.name,
                      description: item.description || '',
                      price: item.price,
                      imageUrl: item.imageUrl,
                      stockQty: item.stockQty ?? null,
                      categoryId: null,
                      categories: [],
                      isActive: item.isActive,
                      trackStock: item.trackStock,
                      isPromo: item.isPromo,
                      promoPrice: item.promoPrice,
                    })}
                    getItemQuantityInCart={getMenuQuantityInCart}
                  />
                </div>
              </>
            )}

            {/* Empty State */}
            {displayedItems.length === 0 && !isLoading && selectedCategory !== 'all' && (
              <div className="px-4 mt-6">
                <EmptyState
                  illustration={<span className="text-4xl">🍽️</span>}
                  title="No Menu Items"
                  description="No items available in this category"
                />
              </div>
            )}
          </div>
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
          onClose={() => setSelectedMenu(null)}
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
          merchant={{
            name: merchantInfo.name,
            address: merchantInfo.address,
            phone: merchantInfo.phone,
            openingHours: merchantInfo.openingHours,
          }}
        />
      )}
    </div>
  );
}
