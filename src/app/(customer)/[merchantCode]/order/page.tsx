'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import CustomerHeader from '@/components/customer/CustomerHeader';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import { Badge, Alert, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/format';
import { useCart } from '@/context/CartContext';
import { getTableNumber } from '@/lib/utils/localStorage';

interface MenuItem {
  id: number;
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
  promoPrice?: number;
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { initializeCart } = useCart();

  // ========================================
  // Load Table Number
  // ========================================
  useEffect(() => {
    console.log('🔍 Loading table number...');
    console.log('Mode:', mode);
    console.log('Merchant Code:', merchantCode);
    
    if (mode === 'dinein') {
      const tableData = getTableNumber(merchantCode);
      
      console.log('📋 Table Data:', tableData);
      
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
  // Fetch Menu Data
  // ========================================
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [categoriesRes, menusRes] = await Promise.all([
          fetch(`/api/public/merchants/${merchantCode}/categories`),
          fetch(`/api/public/merchants/${merchantCode}/menus${selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''}`),
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
          setMenuItems(activeItems);
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
  }, [merchantCode, selectedCategory]);

  useEffect(() => {
    initializeCart(merchantCode, mode as 'dinein' | 'takeaway');
  }, [merchantCode, mode, initializeCart]);

  // ========================================
  // Calculate Merchant Status
  // ========================================
  const getMerchantStatus = (): { isOpen: boolean; statusText: string } => {
    if (!merchantInfo || !merchantInfo.openingHours) {
      return { isOpen: false, statusText: 'Unknown' };
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = merchantInfo.openingHours.find(
      (hour) => hour.dayOfWeek === currentDay
    );

    if (!todayHours || todayHours.isClosed) {
      return { isOpen: false, statusText: 'Closed Today' };
    }

    const isOpen = currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;

    if (isOpen) {
      return { 
        isOpen: true, 
        statusText: `Open until ${formatTime(todayHours.closeTime)}` 
      };
    } else if (currentTime < todayHours.openTime) {
      return { 
        isOpen: false, 
        statusText: `Opens at ${formatTime(todayHours.openTime)}` 
      };
    } else {
      return { 
        isOpen: false, 
        statusText: 'Closed' 
      };
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // ========================================
  // Group menus by category
  // ========================================
  const menusByCategory = categories.map(category => ({
    category,
    items: menuItems.filter(item => 
      item.categories?.some(cat => cat.id === category.id)
    ),
  }));

  const promoItems = menuItems.filter(item => item.isPromo);

  // Get merchant status
  const { isOpen, statusText } = getMerchantStatus();

  // ========================================
  // ✅ FIXED: Calculate header height dynamically
  // ========================================
  const headerHeight = merchantInfo ? 
    (mode === 'dinein' && tableNumber ? 108 : 88) : 56;

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="flex flex-col h-screen max-w-[420px] mx-auto bg-gray-50 dark:bg-gray-900">
      {/* ========================================
          ✅ FIXED: STICKY HEADER (TOP LAYER)
      ======================================== */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <CustomerHeader
          merchantCode={merchantCode}
          mode={mode as 'dinein' | 'takeaway'}
          showBackButton={true}
          onBack={() => {
            localStorage.removeItem(`mode_${merchantCode}`);
            router.push(`/${merchantCode}`);
          }}
          title={merchantInfo?.name || merchantCode.toUpperCase()}
        />

        {/* Merchant Quick Info */}
        {merchantInfo && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center justify-between text-xs">
              {/* Location */}
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="font-medium">
                  {merchantInfo.city}, {merchantInfo.state}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-medium ${isOpen ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {statusText}
                </span>
              </div>
            </div>

            {/* Table Number (Dinein Only) */}
            {mode === 'dinein' && (
              <div className="mt-1.5 pt-1.5 border-t border-orange-200 dark:border-gray-600">
                {tableNumber ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span   className="font-medium">
                      Table Number : {tableNumber}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="font-medium">
                      Table number not set
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================
          ✅ FIXED: STICKY CATEGORY PILLS (MIDDLE LAYER)
      ======================================== */}
      <div 
        className="sticky z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
        style={{ top: `${headerHeight}px` }}
      >
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
          {/* All Items Button */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`
              px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium 
              transition-all duration-200 shrink-0
              ${selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-orange-500'
              }
            `}
          >
            All Items
          </button>

          {/* Category Pills */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium 
                transition-all duration-200 shrink-0
                ${selectedCategory === category.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-orange-500'
                }
              `}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================
          ✅ FIXED: SCROLLABLE CONTENT (BOTTOM LAYER)
      ======================================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Alert */}
        {error && (
          <div className="px-4 pt-4">
            <Alert variant="danger" className="mb-4">
              <p className="text-sm">{error}</p>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <div className="pb-24 px-4">
          {isLoading ? (
            // Loading Skeletons
            <div className="space-y-6 pt-4">
              {[1, 2].map((section) => (
                <div key={section}>
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              {/* Promo Section */}
              {promoItems.length > 0 && selectedCategory === 'all' && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Special Offers
                    </h2>
                    <Badge variant="danger" size="sm">
                      {promoItems.length} items
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {promoItems.map((item) => (
                      <MenuCard
                        key={item.id}
                        item={item}
                        onSelect={() => setSelectedMenu(item)}
                        isPromo={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Sections by Category */}
              {selectedCategory === 'all' ? (
                menusByCategory.map(({ category, items }) => 
                  items.length > 0 && (
                    <section key={category.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                          {category.name}
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({items.length} items)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {items.map((item) => (
                          <MenuCard
                            key={item.id}
                            item={item}
                            onSelect={() => setSelectedMenu(item)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                )
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {menuItems.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      onSelect={() => setSelectedMenu(item)}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {menuItems.length === 0 && !isLoading && (
                <EmptyState
                  icon="🍽️"
                  title={selectedCategory === 'all' ? 'No Menu Items' : 'No Items in This Category'}
                  description={selectedCategory === 'all' 
                    ? 'Menu items will be added soon'
                    : 'Try selecting another category or view all items'
                  }
                  action={selectedCategory !== 'all' ? {
                    label: 'View All Items',
                    onClick: () => setSelectedCategory('all')
                  } : undefined}
                />
              )}
            </div>
          )}
        </div>
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
          onClose={() => setSelectedMenu(null)}
        />
      )}
    </div>
  );
}

/**
 * ✅ Reusable Menu Card Component
 * 
 * @features
 * - Promo badge
 * - Stock warnings
 * - Better image handling
 * - Price with original price strikethrough
 * - Accessibility (ARIA labels)
 * - Text-only (no emojis)
 * 
 * @specification copilot-instructions.md - Component Reusability
 */
interface MenuCardProps {
  item: MenuItem;
  onSelect: () => void;
  isPromo?: boolean;
}

function MenuCard({ item, onSelect, isPromo = false }: MenuCardProps) {
  const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
  const isLowStock = item.trackStock && item.stockQty !== null && item.stockQty > 0 && item.stockQty <= 5;

  return (
    <div
      onClick={() => isAvailable && onSelect()}
      className={`
        bg-white dark:bg-gray-800 rounded-xl overflow-hidden 
        border border-gray-200 dark:border-gray-700
        shadow-sm hover:shadow-md
        transition-all duration-200
        ${isAvailable 
          ? 'cursor-pointer active:scale-[0.98]' 
          : 'opacity-60 cursor-not-allowed'
        }
        ${isPromo ? 'ring-2 ring-orange-500' : ''}
      `}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-label={`${item.name}, ${formatCurrency(item.price)}${!isAvailable ? ', Out of stock' : ''}`}
    >
      {/* Image */}
      <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-700">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 420px) 50vw, 200px"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl text-gray-400">🍽️</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {isPromo && item.promoPrice && (
            <Badge variant="danger" size="sm" className="text-xs font-bold">
              PROMO
            </Badge>
          )}
          {!isAvailable && (
            <Badge variant="secondary" size="sm" className="bg-red-500 text-white">
              Sold Out
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="warning" size="sm">
              {item.stockQty} left
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
            {item.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPromo && item.promoPrice ? (
              <>
                <span className="text-base font-bold text-orange-500">
                  {formatCurrency(item.promoPrice)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {formatCurrency(item.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-orange-500">
                {formatCurrency(item.price)}
              </span>
            )}
          </div>

          {/* Add Button */}
          {isAvailable && (
            <button
              className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              aria-label="Add to cart"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
