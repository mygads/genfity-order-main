'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OrderPageHeader from '@/components/customer/OrderPageHeader';
import CategoryTabs from '@/components/customer/CategoryTabs';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';
import TableNumberCard from '@/components/customer/TableNumberCard';
import HorizontalMenuSection from '@/components/customer/HorizontalMenuSection';
import DetailedMenuSection from '@/components/customer/DetailedMenuSection';
import ViewModeToggle, { ViewMode, getStoredViewMode } from '@/components/customer/ViewModeToggle';
import RecentOrdersSection from '@/components/customer/RecentOrdersSection';
import FavoritesSection from '@/components/customer/FavoritesSection';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import MenuInCartModal from '@/components/menu/MenuInCartModal';
import { Alert, EmptyState } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import { CustomerOrderSkeleton } from '@/components/common/SkeletonLoaders';
import { clearTableNumber, getReservationDetails, getTableNumber, saveTableNumber } from '@/lib/utils/localStorage';
import TableNumberModal from '@/components/customer/TableNumberModal';
import ReservationDetailsModal, { type ReservationDetails } from '@/components/customer/ReservationDetailsModal';
import ModeUnavailableModal from '@/components/modals/ModeUnavailableModal';
import ModeClosingBanner from '@/components/customer/ModeClosingBanner';
import { extractAddonDataFromMenus } from '@/lib/utils/addonExtractor';
import { throttle } from '@/lib/utils/throttle';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { FaUsers } from 'react-icons/fa';
import GroupSessionBanner from '@/components/customer/GroupSessionBanner';
import GroupDashboard from '@/components/customer/GroupDashboard';
import CreateGroupModal from '@/components/customer/CreateGroupModal';
import JoinGroupModal from '@/components/customer/JoinGroupModal';
import GroupOrderSubmitModal from '@/components/customer/GroupOrderSubmitModal';
import GroupOrderChoiceModal from '@/components/customer/GroupOrderChoiceModal';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import { useStockStream } from '@/hooks/useStockStream';
import type { OrderMode } from '@/lib/types/customer';

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
  orderCount?: number; // ✅ Number of times this item has been ordered (for popularity sorting)
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
  isOpen?: boolean; // Manual toggle from database
  timezone?: string; // Merchant timezone
  currency: string;
  enableTax: boolean;
  taxPercentage: number;
  // Subscription status (for showing "store suspended" to customers)
  subscriptionStatus?: string;
  subscriptionSuspendReason?: string | null;
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  isDeliveryEnabled?: boolean;
  requireTableNumberForDineIn?: boolean;
  latitude?: string | number | null;
  longitude?: string | number | null;
  dineInLabel?: string | null; // Custom label for Dine In button
  takeawayLabel?: string | null; // Custom label for Takeaway button
  deliveryLabel?: string | null; // Custom label for Delivery button
  dineInScheduleStart?: string | null;
  dineInScheduleEnd?: string | null;
  takeawayScheduleStart?: string | null;
  takeawayScheduleEnd?: string | null;
  deliveryScheduleStart?: string | null;
  deliveryScheduleEnd?: string | null;
  openingHours: OpeningHour[];
}

interface OrderClientPageProps {
  merchantCode: string;
  mode: string;
  flow?: string;
  scheduled?: string;
  initialMerchant: MerchantInfo | null;
  initialCategories: Category[];
  initialMenus: MenuItem[];
}

/**
 * ✅ ISR + Client Polling: Menu Browse Page
 * 
 * @architecture
 * - Server fetches initial data every 60 seconds (ISR)
 * - Client polls for updates every 15 seconds
 * - Instant render from server-provided initial data
 * - Store status fetched in real-time (not cached)
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */
export default function OrderClientPage({
  merchantCode,
  mode,
  flow,
  scheduled,
  initialMerchant,
  initialCategories,
  initialMenus,
}: OrderClientPageProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const urlSearchParams = useSearchParams();

  const isReservationFlow = flow === 'reservation';
  const isScheduledFlow = (scheduled === '1' || scheduled === 'true') || (urlSearchParams.get('scheduled') === '1' || urlSearchParams.get('scheduled') === 'true');

  // Use real-time store status hook (fetches from API, not cached ISR data)
  const {
    storeOpen,
    isDineInAvailable,
    isTakeawayAvailable,
    isDeliveryAvailable: isDeliveryAvailableBySchedule,
    minutesUntilClose,
    openingHours: liveOpeningHours,
    isLoading: isStatusLoading,
    todaySpecialHour,
    specialHourName,
  } = useStoreStatus(merchantCode, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });

  // Reservation flow is allowed even when the store is closed / schedules are unavailable.
  const customerOrderingAllowed = storeOpen || isReservationFlow;

  const isCustomerStoreClosed = !customerOrderingAllowed;

  const normalizedMode: OrderMode = (mode === 'dinein' || mode === 'takeaway' || mode === 'delivery')
    ? (mode as OrderMode)
    : 'takeaway';

  // Initialize state from server-provided props (instant render, no loading)

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>(initialMenus);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [menuAddonsCache, setMenuAddonsCache] = useState<Record<string, any>>(() => {
    // Extract addon cache from initial menus
    if (initialMenus.length > 0) {
      return extractAddonDataFromMenus(initialMenus);
    }
    return {};
  });
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(initialMerchant);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [selectedCategory] = useState<string>('all');
  const [activeScrollTab, setActiveScrollTab] = useState<string>('all');
  // No loading spinner if initial data provided
  const [isLoading, setIsLoading] = useState(initialMenus.length === 0);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [cartOptionsMenu, setCartOptionsMenu] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState(false); // Table number modal state
  const [showOutletInfo, setShowOutletInfo] = useState(false); // Outlet info modal state

  const isTableNumberEnabled = normalizedMode === 'dinein' && merchantInfo?.requireTableNumberForDineIn === true;

  // Reservation required details (party/date/time)
  const [showReservationDetailsModal, setShowReservationDetailsModal] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);

  useEffect(() => {
    if (!isReservationFlow) return;
    const saved = getReservationDetails(merchantCode);
    if (saved) {
      setReservationDetails({
        partySize: saved.partySize,
        reservationDate: saved.reservationDate,
        reservationTime: saved.reservationTime,
      });
    }
    // Same behavior as table-number: always show the modal again on refresh/back.
    setShowReservationDetailsModal(true);
  }, [isReservationFlow, merchantCode]);

  const hasTopInfoCard = normalizedMode === 'dinein' && (
    (isTableNumberEnabled && Boolean(tableNumber) && !isReservationFlow && !isScheduledFlow) ||
    (isReservationFlow && Boolean(reservationDetails))
  );
  const [showModeUnavailableModal, setShowModeUnavailableModal] = useState(false); // Mode unavailable modal
  const [isSticky, setIsSticky] = useState(false); // Track if header should be sticky
  const [isCategoryTabsSticky, setIsCategoryTabsSticky] = useState(false); // Track if category tabs should be sticky
  const [showTableBadge, setShowTableBadge] = useState(false); // Track if table badge should be shown in header
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Menu view mode: list, grid-2, grid-3

  // Load view mode preference from localStorage
  useEffect(() => {
    setViewMode(getStoredViewMode());
  }, []);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({}); // References to category sections
  const { initializeCart, cart, updateItem, removeItem } = useCart();

  // Group Order State
  const { isInGroupOrder, updateMyCart } = useGroupOrder();
  const [showGroupDashboard, setShowGroupDashboard] = useState(false);
  const [showGroupChoiceModal, setShowGroupChoiceModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showGroupSubmitModal, setShowGroupSubmitModal] = useState(false);
  const [prefilledGroupCode, setPrefilledGroupCode] = useState<string | undefined>(undefined);

  // Customer Data Context - Initialize with ISR data for instant navigation on other pages

  // If a menu gets archived/deleted, remove it from any stored carts so it doesn't keep showing.
  useEffect(() => {
    if (isLoading) return;
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) return;
    if (!Array.isArray(allMenuItems) || allMenuItems.length === 0) return;

    const availableMenuIds = new Set(allMenuItems.map((m) => m.id));
    const invalidCartItems = cart.items.filter((item) => !availableMenuIds.has(item.menuId));

    if (invalidCartItems.length === 0) return;
    invalidCartItems.forEach((item) => removeItem(item.cartItemId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, allMenuItems, cart?.items?.length]);
  const {
    initializeData: initializeCustomerData,
    menus: swrMenus,
    categories: swrCategories,
    addonCache: swrAddonCache,
    merchantInfo: swrMerchantInfo,
  } = useCustomerData();

  // Real-time stock updates via SSE
  const { isConnected: isStockStreamConnected } = useStockStream({
    merchantCode,
    enabled: true,
  });

  // URL params for auto-join
  const searchParams = useSearchParams();
  const groupCodeFromUrl = searchParams.get('group');

  // Use live opening hours or fallback to cached ones during loading
  const displayOpeningHours = liveOpeningHours.length > 0 ? liveOpeningHours : (merchantInfo?.openingHours || []);

  const merchantHasDeliveryCoords = merchantInfo?.latitude !== null && merchantInfo?.latitude !== undefined && merchantInfo?.longitude !== null && merchantInfo?.longitude !== undefined;
  const isDeliveryAvailable = isDeliveryAvailableBySchedule && merchantHasDeliveryCoords;

  const getMenuCartItems = (menuId: string): CartItem[] => {
    if (!cart || !Array.isArray(cart.items)) return [];
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
    if (!Array.isArray(allMenuItems)) return;
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
    if (!Array.isArray(allMenuItems)) return;
    const menuItem = allMenuItems.find(m => m.id === menuId);
    if (menuItem) {
      setCartOptionsMenu(menuItem);
    }
  };

  /**
   * Get total quantity of a menu item in cart (including all variants with different addons)
   */
  const getMenuQuantityInCart = (menuId: string): number => {
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items
      .filter(item => item.menuId === menuId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // ========================================
  // Validate Mode Availability (show modal instead of silent redirect)
  // ========================================
  useEffect(() => {
    if (!merchantInfo) return;
    if (isStatusLoading) return; // Wait for status to load

    if (isReservationFlow) {
      setShowModeUnavailableModal(false);
      return;
    }

    // Don't check when store is closed - just show modified UI

    // Only show modal if mode becomes unavailable while store is open
    if (storeOpen) {
      if (normalizedMode === 'dinein' && !isDineInAvailable) {
        // Show modal to let user choose
        setShowModeUnavailableModal(true);
        return;
      }

      if (normalizedMode === 'takeaway' && !isTakeawayAvailable) {
        // Show modal to let user choose
        setShowModeUnavailableModal(true);
        return;
      }

      if (normalizedMode === 'delivery' && !isDeliveryAvailable) {
        setShowModeUnavailableModal(true);
        return;
      }
    }

    // Close modal if mode becomes available again
    setShowModeUnavailableModal(false);
  }, [merchantInfo, normalizedMode, storeOpen, isStatusLoading, isDineInAvailable, isTakeawayAvailable, isDeliveryAvailable, isReservationFlow]);

  // ========================================
  // Mode Unavailable Modal Handlers
  // ========================================
  const handleSwitchMode = () => {
    setShowModeUnavailableModal(false);
    const candidates: OrderMode[] = ['takeaway', 'dinein', 'delivery'];
    const next = candidates.find((m) => {
      if (m === normalizedMode) return false;
      if (m === 'dinein') return isDineInAvailable;
      if (m === 'takeaway') return isTakeawayAvailable;
      return isDeliveryAvailable;
    });

    if (next) {
      const params = new URLSearchParams(window.location.search);
      params.set('mode', next);
      if (isReservationFlow) params.set('flow', 'reservation');
      else params.delete('flow');
      if (isScheduledFlow) params.set('scheduled', '1');
      else params.delete('scheduled');
      router.replace(`/${merchantCode}/order?${params.toString()}`);
    }
  };

  const handleModeModalGoBack = () => {
    setShowModeUnavailableModal(false);
    router.replace(`/${merchantCode}`);
  };

  // ========================================
  // Handle Auto Table Number from URL (tableno param)
  // ========================================
  useEffect(() => {
    if (normalizedMode !== 'dinein') return;

    // Merchant does not use table numbers for dine-in.
    if (!isTableNumberEnabled) {
      setShowTableModal(false);
      setTableNumber(null);
      clearTableNumber(merchantCode);
      return;
    }

    // Reservation / scheduled dine-in: table number is entered by cashier/admin.
    if (isReservationFlow || isScheduledFlow) {
      setShowTableModal(false);
      setTableNumber(null);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tablenoFromUrl = params.get('tableno');

    if (tablenoFromUrl) {
      // Auto-save table number from URL
      saveTableNumber(merchantCode, tablenoFromUrl);
      setTableNumber(tablenoFromUrl);

      // Remove tableno from URL without reload
      params.delete('tableno');
      const newUrl = `/${merchantCode}/order?${params.toString()}`;
      router.replace(newUrl);

      // Don't show modal since table is auto-filled
      setShowTableModal(false);
      return;
    }

    // Normal dinein flow - show table modal
    const tableData = getTableNumber(merchantCode);
    // If store is closed (manual/auto/override), do not prompt for table number.
    if (isCustomerStoreClosed) {
      setShowTableModal(false);
      if (tableData?.tableNumber) {
        setTableNumber(tableData.tableNumber);
      }
      return;
    }

    setShowTableModal(true);

    if (tableData?.tableNumber) {
      setTableNumber(tableData.tableNumber);
    }
  }, [merchantCode, normalizedMode, router, isReservationFlow, isScheduledFlow, isTableNumberEnabled, isCustomerStoreClosed]);

  // ========================================
  // Handle Outlet Info Modal via URL
  // ========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const showInfo = params.get('outlet-info') === 'true';
    setShowOutletInfo(showInfo);
  }, []);

  // ========================================
  // Handle Auto-Join Group Order from URL (?group=CODE)
  // ========================================
  useEffect(() => {
    if (groupCodeFromUrl && groupCodeFromUrl.length === 4 && !isInGroupOrder) {
      // Pre-fill the code and open join modal
      setPrefilledGroupCode(groupCodeFromUrl.toUpperCase());
      setShowJoinGroupModal(true);

      // Clean up URL
      const params = new URLSearchParams(window.location.search);
      params.delete('group');
      const newSearch = params.toString();
      const newUrl = `/${merchantCode}/order${newSearch ? `?${newSearch}` : `?mode=${mode}`}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [groupCodeFromUrl, merchantCode, mode, isInGroupOrder]);

  // ========================================
  // Initialize CustomerData Context with ISR Data
  // This enables instant navigation to other pages (search, view-order, etc.)
  // ========================================
  useEffect(() => {
    // Initialize context with ISR data for instant navigation
    if (initialMerchant || initialMenus.length > 0 || initialCategories.length > 0) {
      initializeCustomerData(merchantCode, {
        merchant: initialMerchant,
        menus: initialMenus,
        categories: initialCategories,
      });
      console.log('✅ [ORDER PAGE] Initialized CustomerData Context with ISR data');
    }
  }, [merchantCode, initialMerchant, initialMenus, initialCategories, initializeCustomerData]);

  // ========================================
  // Sync SWR data with local state (real-time updates)
  // SWR data includes stock updates from SSE via CustomerDataContext
  // ========================================
  useEffect(() => {
    // Sync menus from SWR - always update to get latest stock
    if (Array.isArray(swrMenus) && swrMenus.length > 0) {
      setAllMenuItems(swrMenus);
    }
  }, [swrMenus]);

  useEffect(() => {
    // Sync categories from SWR
    if (Array.isArray(swrCategories) && swrCategories.length > 0) {
      setCategories(swrCategories);
    }
  }, [swrCategories]);

  useEffect(() => {
    // Sync addon cache from SWR
    if (swrAddonCache && Object.keys(swrAddonCache).length > 0) {
      const currentKeys = Object.keys(menuAddonsCache).length;
      const newKeys = Object.keys(swrAddonCache).length;
      if (currentKeys !== newKeys || currentKeys === 0) {
        setMenuAddonsCache(swrAddonCache);
        console.log('📡 [SWR] Synced addon cache:', newKeys, 'menus');
      }
    }
  }, [swrAddonCache, menuAddonsCache]);

  // ========================================
  // Sync Merchant Info from SWR (auto-refresh handled by CustomerDataContext)
  // ========================================
  useEffect(() => {
    if (swrMerchantInfo) {
      setMerchantInfo(swrMerchantInfo);
    }
  }, [swrMerchantInfo]);

  // ========================================
  // Save ISR data to sessionStorage for SWR fallback
  // SWR in CustomerDataContext handles all fetching
  // ========================================
  useEffect(() => {
    // Save ISR data to sessionStorage when available
    if (initialMenus.length > 0) {
      sessionStorage.setItem(`menus_${merchantCode}`, JSON.stringify(initialMenus));
    }
    if (initialCategories.length > 0) {
      sessionStorage.setItem(`categories_${merchantCode}`, JSON.stringify(initialCategories));
    }
    if (Object.keys(menuAddonsCache).length > 0) {
      sessionStorage.setItem(`addons_cache_${merchantCode}`, JSON.stringify(menuAddonsCache));
    }

    // Set loading to false if we have ISR data
    if (initialMenus.length > 0 && initialCategories.length > 0) {
      setIsLoading(false);
    }
  }, [merchantCode, initialMenus, initialCategories, menuAddonsCache]);

  // ========================================
  // NOTE: Auto-refresh is handled by SWR in CustomerDataContext
  // - Menus: refresh every 15s
  // - Categories: refresh every 60s
  // - Merchant Info: refresh every 30s
  // No manual setInterval needed - SWR syncs via swrMenus/swrCategories useEffects above
  // ========================================

  useEffect(() => {
    initializeCart(merchantCode, normalizedMode);
  }, [merchantCode, normalizedMode, initializeCart]);

  // ========================================
  // Group Order Cart Sync - Update group cart when local cart changes
  // ========================================
  useEffect(() => {
    if (!isInGroupOrder || !cart || !Array.isArray(cart.items)) return;

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      const itemPrice = item.price * item.quantity;
      const addonsPrice = (Array.isArray(item.addons) ? item.addons : []).reduce((a, addon) => a + addon.price, 0) * item.quantity;
      return sum + itemPrice + addonsPrice;
    }, 0);

    // Sync cart to group order
    updateMyCart(cart.items, subtotal);
  }, [isInGroupOrder, cart, updateMyCart]);

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

    // ✅ THROTTLED: Scroll handler with 100ms throttle for better performance
    const handleScroll = throttle(() => {
      // Header height is 55px + optional 40px info bar (table number OR reservation summary)
      const stickyHeaderHeight = hasTopInfoCard ? 95 : 55;
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
        let currentCategory = '';

        // Check special sections first (in order: promo, best-seller, recommendation)
        const specialSections: string[] = ['promo', 'best-seller', 'recommendation'];
        for (const sectionId of (Array.isArray(specialSections) ? specialSections : [])) {
          const element = sectionRefs.current[sectionId];
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= totalStickyHeight + 50 && rect.bottom > totalStickyHeight) {
              currentCategory = sectionId;
            }
          }
        }

        // Then check regular categories
        const sectionEntries = Object.entries(sectionRefs.current || {});
        for (const [categoryId, element] of sectionEntries) {
          if (specialSections.includes(categoryId)) continue; // Skip special sections
          if (element) {
            const rect = element.getBoundingClientRect();
            // Section is active when its top is at or above the sticky area 
            // and its bottom is still visible
            if (rect.top <= totalStickyHeight + 50 && rect.bottom > totalStickyHeight) {
              currentCategory = categoryId;
            }
          }
        }

        // Default to first available special category or first category
        if (!currentCategory) {
          if (sectionRefs.current?.['promo']) currentCategory = 'promo';
          else if (sectionRefs.current?.['best-seller']) currentCategory = 'best-seller';
          else if (sectionRefs.current?.['recommendation']) currentCategory = 'recommendation';
          else if (Array.isArray(categories) && categories.length > 0) currentCategory = categories[0].id;
        }

        // Only update if different to avoid unnecessary re-renders
        if (currentCategory && activeScrollTab !== currentCategory) {
          setActiveScrollTab(currentCategory);
        }
      }
    }, 100); // 100ms throttle

    // Update header height on mount and window resize
    updateHeaderHeight();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [mode, tableNumber, selectedCategory, activeScrollTab, categories, isReservationFlow, isScheduledFlow]);

  // ✅ MEMOIZED: Filter items by selected category
  const displayedItems = useMemo(() => {
    if (!Array.isArray(allMenuItems)) return [];
    return selectedCategory === 'all'
      ? allMenuItems
      : allMenuItems.filter(item =>
        item.categories?.some(cat => cat.id === selectedCategory)
      );
  }, [allMenuItems, selectedCategory]);

  // ✅ MEMOIZED: Get promo items
  const promoItems = useMemo(() => {
    if (!Array.isArray(allMenuItems)) return [];
    return allMenuItems.filter(item => item.isPromo && item.promoPrice);
  }, [allMenuItems]);

  // ✅ MEMOIZED: Get "Best Seller" items - sorted by order count (most popular first)
  const bestSellerItems = useMemo(() => {
    if (!Array.isArray(allMenuItems)) return [];
    return allMenuItems
      .filter(item => item.isBestSeller)
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
  }, [allMenuItems]);

  // ✅ MEMOIZED: Get "Recommendation" items
  const recommendationItems = useMemo(() => {
    if (!Array.isArray(allMenuItems)) return [];
    return allMenuItems.filter(item => item.isRecommended);
  }, [allMenuItems]);

  // ✅ MEMOIZED: Build special categories for CategoryTabs
  const specialCategories = useMemo(() => {
    const result: { id: string; name: string }[] = [];
    if (Array.isArray(promoItems) && promoItems.length > 0) {
      result.push({ id: 'promo', name: 'Promo' });
    }
    if (Array.isArray(bestSellerItems) && bestSellerItems.length > 0) {
      result.push({ id: 'best-seller', name: 'Best Seller' });
    }
    if (Array.isArray(recommendationItems) && recommendationItems.length > 0) {
      result.push({ id: 'recommendation', name: 'Recommendation' });
    }
    return result;
  }, [promoItems, bestSellerItems, recommendationItems]);

  // ========================================
  // RENDER - NEW LAYOUT
  // ========================================
  return (
    <>
      {/* Special Hours Banner - Show when today has special hours */}
      {todaySpecialHour && !todaySpecialHour.isClosed && specialHourName && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">
          Today: {specialHourName}
          {todaySpecialHour.openTime && todaySpecialHour.closeTime && (
            <span className="ml-1">({todaySpecialHour.openTime} - {todaySpecialHour.closeTime})</span>
          )}
        </div>
      )}

      {/* Special Holiday Closed Banner */}
      {todaySpecialHour?.isClosed && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">
          Closed Today{specialHourName ? `: ${specialHourName}` : ''}
        </div>
      )}

      {/* Store Closing Soon Warning Banner */}
      {storeOpen && minutesUntilClose !== null && minutesUntilClose <= 30 && minutesUntilClose > 0 && (
        <div className={`bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium sticky ${todaySpecialHour ? '' : 'top-0'} z-50`}>
          Store closes in {minutesUntilClose} minute{minutesUntilClose !== 1 ? 's' : ''}
        </div>
      )}

      {/* Mode-Specific Closing Warning Banner */}
      {storeOpen && merchantInfo && (normalizedMode === 'dinein' || normalizedMode === 'takeaway' || normalizedMode === 'delivery') && (
        <ModeClosingBanner
          mode={normalizedMode}
          modeLabel={
            normalizedMode === 'dinein'
              ? merchantInfo.dineInLabel || undefined
              : normalizedMode === 'takeaway'
                ? merchantInfo.takeawayLabel || undefined
                    : merchantInfo.deliveryLabel || tOr(t, 'customer.mode.delivery', 'Delivery')
          }
          scheduleEnd={
            normalizedMode === 'dinein'
              ? merchantInfo.dineInScheduleEnd || null
              : normalizedMode === 'takeaway'
                ? merchantInfo.takeawayScheduleEnd || null
                : merchantInfo.deliveryScheduleEnd || null
          }
          showThresholdMinutes={30}
        />
      )}

      {/* ======================================== 
          ORDER PAGE HEADER (New Component - Matches Reference)
          Positioned absolutely above banner when not sticky
      ======================================== */}
      <OrderPageHeader
        merchantName={merchantInfo?.name || merchantCode}
        merchantLogo={merchantInfo?.logoUrl || null}
        isSticky={isSticky}
        tableNumber={tableNumber}
        reservationSummary={isReservationFlow ? reservationDetails : null}
        mode={normalizedMode}
        showTableBadge={showTableBadge}
        onBackClick={() => {
          localStorage.removeItem(`mode_${merchantCode}`);
          router.push(`/${merchantCode}`);
        }}
        onSearchClick={() => {
          router.push(`/${merchantCode}/search?mode=${normalizedMode}&ref=${encodeURIComponent(`/${merchantCode}/order?mode=${normalizedMode}`)}`);
        }}
        onGroupOrderClick={() => {
          if (isInGroupOrder) {
            // Already in group - go directly to dashboard
            setShowGroupDashboard(true);
          } else {
            // Not in group - show choice modal
            setShowGroupChoiceModal(true);
          }
        }}
        isInGroupOrder={isInGroupOrder}
      />

      {/* Hero Section (Restaurant Banner) - Header overlays on top - Gray when closed */}
      <div className="relative" data-banner>
        {isLoading ? (
          /* Banner Loading Skeleton */
          <div className="w-full h-48 bg-gray-200 animate-pulse" />
        ) : (
          <RestaurantBanner
            imageUrl={merchantInfo?.logoUrl}
            bannerUrl={merchantInfo?.bannerUrl}
            merchantName={merchantInfo?.name || merchantCode}
            isClosed={isCustomerStoreClosed}
          />
        )}
      </div>

      {/* ========================================
          MAIN CONTENT - Gray overlay when store is closed
      ======================================== */}
      <div className={`pb-24 ${isCustomerStoreClosed ? 'relative' : ''}`}>
        {/* Gray overlay for content when store is closed */}
        {isCustomerStoreClosed && (
          <div className="absolute inset-0 bg-gray-100/50 pointer-events-none z-0" />
        )}

        {/* Error Alert */}
        {error && (
          <div className="px-4 pt-4 relative z-10">
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
            {/* Restaurant Info Card - Shows CLOSED badge when closed, not affected by overlay */}
            <div className="px-4 -mt-6 relative z-20">
              {merchantInfo && (
                <RestaurantInfoCard
                  name={merchantInfo.name}
                  openingHours={(Array.isArray(displayOpeningHours) ? displayOpeningHours : []).map(h => ({
                    dayOfWeek: h.dayOfWeek,
                    openTime: h.openTime || '',
                    closeTime: h.closeTime || '',
                    isClosed: h.isClosed,
                  }))}
                  onClick={() => {
                    // Update URL without page reload
                    const params = new URLSearchParams(window.location.search);
                    params.set('outlet-info', 'true');
                    window.history.pushState({}, '', `?${params.toString()}`);
                    setShowOutletInfo(true);
                  }}
                  isClosed={isCustomerStoreClosed}
                  logoUrl={merchantInfo.logoUrl}
                />
              )}
            </div>

            {/* Store-closed helper (dine-in + table numbers) */}
            {normalizedMode === 'dinein' &&
            isTableNumberEnabled &&
            !isReservationFlow &&
            !isScheduledFlow &&
            isCustomerStoreClosed &&
            !tableNumber ? (
              <div className="px-4 my-2 relative z-20">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-700">
                    {tOr(t, 'customer.table.storeClosedNoPrompt', 'Store is closed — no need to enter table number right now.')}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Dine-in Info Card (Table Number OR Reservation Summary) */}
            {mode === 'dinein' && hasTopInfoCard && (
              <div className={`px-4 my-2 relative z-10 ${isCustomerStoreClosed ? 'opacity-50' : ''}`} data-table-number-card>
                {isReservationFlow && reservationDetails ? (
                  <div
                    className="text-center cursor-pointer"
                    onClick={() => setShowReservationDetailsModal(true)}
                    style={{
                      backgroundColor: '#fff7ed',
                      padding: '12px 16px',
                      borderRadius: '16px 16px 0 0',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    role="button"
                    aria-label="Edit reservation details"
                  >
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#212529',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {tOr(t, 'customer.reservationDetails.pillLabel', 'Reservation')}
                        <FaUsers className="h-4 w-4" />
                        <span style={{ fontWeight: 700 }}>{reservationDetails.partySize}</span>
                      </span>
                      <span>•</span>
                      <span>{reservationDetails.reservationDate}</span>
                      <span>•</span>
                      <span>{reservationDetails.reservationTime}</span>
                    </p>
                  </div>
                ) : (
                  <TableNumberCard tableNumber={tableNumber as string} />
                )}
              </div>
            )}

            {/* ========================================
                CATEGORY TABS (Sticky independently when scrolled to)
            ======================================== */}
            {/* Trigger point for CategoryTabs sticky detection */}
            <div data-category-tabs-trigger className="h-0" />

            {/* Placeholder spacer - shown when CategoryTabs is fixed to prevent content jump */}
            {isCategoryTabsSticky && (
              <div className="h-12" aria-hidden="true" />
            )}

            {/* CategoryTabs - Always rendered, positioned based on its own sticky state */}
            <div
              data-category-tabs
              className={`transition-all duration-300 ${isCategoryTabsSticky
                ? 'fixed left-0 right-0 z-40'
                : 'relative'
                } max-w-125 mx-auto bg-white`}
              style={{
                top: isCategoryTabsSticky
                  ? (hasTopInfoCard ? '95px' : '55px') // 55px header + optional 40px info bar
                  : 'auto',
              }}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex-1 overflow-x-auto">
                  <CategoryTabs
                    categories={categories}
                    specialCategories={specialCategories}
                    activeTab={selectedCategory === 'all' ? activeScrollTab : selectedCategory}
                    onTabClick={(categoryId: string) => {
                      // User clicked a category - scroll to it
                      setActiveScrollTab(categoryId);

                      // Since we're always in 'all' mode now, scroll to the section
                      const stickyHeaderHeight = hasTopInfoCard ? 95 : 55;
                      const totalStickyHeight = stickyHeaderHeight + 48; // Header + tabs
                      const element = sectionRefs.current[categoryId];

                      if (element) {
                        const elementTop = element.getBoundingClientRect().top + window.scrollY;
                        window.scrollTo({
                          top: elementTop - totalStickyHeight - 10, // 10px extra padding
                          behavior: 'smooth'
                        });
                      }
                    }}
                  />
                </div>
                <div className="shrink-0 ml-2">
                  <ViewModeToggle value={viewMode} onChange={setViewMode} />
                </div>
              </div>
            </div>

            {/* Show ALL sections when 'all' is selected */}
            {selectedCategory === 'all' ? (
              <>
                {/* ========================================
                    RECENT ORDERS SECTION (Order Again)
                    Only shows for logged-in customers with completed orders
                ======================================== */}
                <div className="mt-4">
                  <RecentOrdersSection
                    merchantCode={merchantCode}
                    currency={merchantInfo?.currency || 'AUD'}
                    onMenuClick={(menuId) => {
                      if (!Array.isArray(allMenuItems)) return;
                      const menuItem = allMenuItems.find(m => m.id === menuId);
                      if (menuItem) {
                        handleOpenMenu(menuItem);
                      }
                    }}
                    getItemQuantityInCart={getMenuQuantityInCart}
                    onIncreaseQty={handleIncreaseQtyFromCard}
                    onDecreaseQty={handleDecreaseQtyFromCard}
                  />
                </div>

                {/* Favorites Section */}
                <div className="mt-4">
                  <FavoritesSection
                    merchantCode={merchantCode}
                    currency={merchantInfo?.currency || 'AUD'}
                    allMenuItems={allMenuItems}
                    onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                    storeOpen={customerOrderingAllowed}
                  />
                </div>

                {/* Promo Section */}
                {promoItems.length > 0 && (
                  <>
                    <div
                      className="mt-4"
                      ref={(el) => { sectionRefs.current['promo'] = el; }}
                      data-category-section="promo"
                    >
                      <HorizontalMenuSection
                        title={t('customer.menu.promo')}
                        items={promoItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        merchantCode={merchantCode}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                        isPromoSection={true}
                        storeOpen={customerOrderingAllowed}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200" />
                    </div>
                  </>
                )}

                {/* Best Seller Section */}
                {bestSellerItems.length > 0 && (
                  <>
                    <div
                      className="mt-4"
                      ref={(el) => { sectionRefs.current['best-seller'] = el; }}
                      data-category-section="best-seller"
                    >
                      <HorizontalMenuSection
                        title={t('customer.menu.bestSeller')}
                        items={bestSellerItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        merchantCode={merchantCode}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                        storeOpen={customerOrderingAllowed}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200" />
                    </div>
                  </>
                )}

                {/* Recommendation Section */}
                {recommendationItems.length > 0 && (
                  <>
                    <div
                      className="mt-4"
                      ref={(el) => { sectionRefs.current['recommendation'] = el; }}
                      data-category-section="recommendation"
                    >
                      <HorizontalMenuSection
                        title={t('customer.menu.recommended')}
                        items={recommendationItems}
                        currency={merchantInfo?.currency || 'AUD'}
                        merchantCode={merchantCode}
                        onItemClick={(item) => handleOpenMenu(item as MenuItem)}
                        getItemQuantityInCart={getMenuQuantityInCart}
                        onIncreaseQty={handleIncreaseQtyFromCard}
                        onDecreaseQty={handleDecreaseQtyFromCard}
                        storeOpen={customerOrderingAllowed}
                      />
                    </div>
                    {/* Divider */}
                    <div className="px-4 mt-6">
                      <hr className="border-gray-200" />
                    </div>
                  </>
                )}

                {/* All Categories Detailed Sections */}
                {Array.isArray(categories) && categories.map((category, index) => {
                  const categoryItems = Array.isArray(allMenuItems)
                    ? allMenuItems.filter(item =>
                      item.categories?.some(cat => cat.id === category.id)
                    )
                    : [];

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
                          merchantCode={merchantCode}
                          onAddItem={(item) => handleOpenMenu(item as MenuItem)}
                          getItemQuantityInCart={getMenuQuantityInCart}
                          onIncreaseQty={handleIncreaseQtyFromCard}
                          onDecreaseQty={handleDecreaseQtyFromCard}
                          storeOpen={customerOrderingAllowed}
                          viewMode={viewMode}
                        />
                      </div>
                      {/* Divider between categories */}
                      {index < categories.length - 1 && (
                        <div className="px-4 mt-6">
                          <hr className="border-gray-200" />
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
                  <hr className="border-gray-200" />
                </div>
                <div className="mt-4">
                  <DetailedMenuSection
                    title={categories.find(c => c.id === selectedCategory)?.name.toUpperCase() || ''}
                    items={displayedItems}
                    currency={merchantInfo?.currency || 'AUD'}
                    merchantCode={merchantCode}
                    onAddItem={(item) => handleOpenMenu(item as MenuItem)}
                    getItemQuantityInCart={getMenuQuantityInCart}
                    onIncreaseQty={handleIncreaseQtyFromCard}
                    onDecreaseQty={handleDecreaseQtyFromCard}
                    viewMode={viewMode}
                  />
                </div>
              </>
            )}

            {/* Empty State */}
            {displayedItems.length === 0 && !isLoading && selectedCategory !== 'all' && (
              <div className="px-4 mt-6">
                <EmptyState
                  title={t('customer.menu.noItems')}
                  description={t('customer.menu.tryDifferentSearch')}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================
          FLOATING CART BUTTON
          Hidden when store is closed - prevents checkout attempt
      ======================================== */}
      <FloatingCartButton
        merchantCode={merchantCode}
        mode={normalizedMode}
        flow={isReservationFlow ? 'reservation' : undefined}
        scheduled={isScheduledFlow ? true : undefined}
        storeOpen={customerOrderingAllowed}
      />

      
      
      

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
          storeOpen={customerOrderingAllowed}
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
      {isTableNumberEnabled && (
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
      )}

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
            openingHours: (Array.isArray(displayOpeningHours) ? displayOpeningHours : []).map(h => ({ ...h, is24Hours: (h as { is24Hours?: boolean }).is24Hours ?? false })),
          }}
        />
      )}

      {/* ========================================
          MODE UNAVAILABLE MODAL
      ======================================== */}
      <ModeUnavailableModal
        isOpen={showModeUnavailableModal}
        currentMode={normalizedMode}
        alternativeMode={
          normalizedMode === 'dinein' && isTakeawayAvailable ? 'takeaway' :
            normalizedMode === 'takeaway' && isDineInAvailable ? 'dinein' :
              normalizedMode !== 'delivery' && isDeliveryAvailable ? 'delivery' :
                null
        }
        dineInLabel={merchantInfo?.dineInLabel || 'Dine In'}
        takeawayLabel={merchantInfo?.takeawayLabel || 'Takeaway'}
        onSwitchMode={handleSwitchMode}
        onGoBack={handleModeModalGoBack}
      />

      {/* ========================================
          GROUP ORDER COMPONENTS
      ======================================== */}

      {/* Group Order Choice Modal - Bottom Sheet */}
      <GroupOrderChoiceModal
        isOpen={showGroupChoiceModal}
        onClose={() => setShowGroupChoiceModal(false)}
        onCreateGroup={() => setShowCreateGroupModal(true)}
        onJoinGroup={() => setShowJoinGroupModal(true)}
        onViewGroup={() => setShowGroupDashboard(true)}
      />

      {/* Group Session Banner - Shows when in an active group order */}
      <GroupSessionBanner onViewGroup={() => setShowGroupDashboard(true)} />

      {/* Group Dashboard - Full screen participant management */}
      <GroupDashboard
        isOpen={showGroupDashboard}
        onClose={() => setShowGroupDashboard(false)}
        onSubmitOrder={() => {
          setShowGroupDashboard(false);
          // Navigate to checkout page with group order items
          router.push(`/${merchantCode}/view-order?mode=${normalizedMode}&groupOrder=true`);
        }}
        merchantCode={merchantCode}
        currency={merchantInfo?.currency || 'AUD'}
        onModeChange={(newMode) => {
          // Update URL with new mode since mode is a prop from URL
          const flowParam = isReservationFlow ? '&flow=reservation' : '';
          const scheduledParam = isScheduledFlow ? '&scheduled=1' : '';
          router.replace(`/${merchantCode}/order?mode=${newMode}${flowParam}${scheduledParam}`);
        }}
      />

      {/* Required Reservation Details Modal */}
      <ReservationDetailsModal
        merchantCode={merchantCode}
        merchantTimezone={merchantInfo?.timezone || 'Australia/Sydney'}
        isOpen={showReservationDetailsModal}
        dismissable={Boolean(reservationDetails)}
        onClose={() => setShowReservationDetailsModal(false)}
        onConfirm={(details) => {
          setReservationDetails(details);
          setShowReservationDetailsModal(false);
        }}
      />

      {/* Group Order Submit Modal */}
      <GroupOrderSubmitModal
        isOpen={showGroupSubmitModal}
        onClose={() => setShowGroupSubmitModal(false)}
        onSuccess={(orderNumber) => {
          setShowGroupSubmitModal(false);
          router.push(`/${merchantCode}/group-order-summary?orderNumber=${orderNumber}`);
        }}
        merchantCode={merchantCode}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSuccess={(_sessionCode) => {
          setShowCreateGroupModal(false);
          // Session is now active, header icon will update
        }}
        onNeedTableNumber={() => {
          if (isReservationFlow || isScheduledFlow) return;
          // Close create modal and show table number modal
          setShowCreateGroupModal(false);
          setShowTableModal(true);
        }}
        merchantCode={merchantCode}
        orderType={normalizedMode === 'dinein' ? 'DINE_IN' : normalizedMode === 'delivery' ? 'DELIVERY' : 'TAKEAWAY'}
        tableNumber={tableNumber || undefined}
      />

      {/* Join Group Modal */}
      <JoinGroupModal
        isOpen={showJoinGroupModal}
        onClose={() => {
          setShowJoinGroupModal(false);
          setPrefilledGroupCode(undefined);
        }}
        onSuccess={() => {
          setShowJoinGroupModal(false);
          setPrefilledGroupCode(undefined);
        }}
        prefilledCode={prefilledGroupCode}
      />
    </>
  );
}

