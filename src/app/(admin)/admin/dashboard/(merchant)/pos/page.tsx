/**
 * POS (Point of Sale) Page
 * 
 * Full-screen POS terminal for creating orders
 * - Split layout: Cart (left) + Product Grid (right)
 * - Professional, clean, minimalist design with orange-500 theme
 * - Fullwidth/Fullscreen toggle like Kanban orders page
 * - Fixed viewport height with no page scroll
 * - Adjustable grid columns for product display
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaReceipt,
  FaHistory,
  FaExpand,
  FaCompress,
  FaTimes,
  FaEye,
  FaMinus,
  FaPlus,
  FaWifi,
  FaSync,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useMerchant } from '@/context/MerchantContext';
import { useToast } from '@/context/ToastContext';
import useSWR, { mutate } from 'swr';
import {
  useOfflineSync,
  saveCartToStorage,
  loadCartFromStorage,
  clearCartFromStorage,
  type PendingOrder,
} from '@/hooks/useOfflineSync';
import {
  POSCartPanel,
  POSProductGrid,
  POSAddonModal,
  POSPaymentModal,
  POSSkeleton,
  POSOrderHistoryPanel,
  POSHeldOrdersPanel,
  POSPendingOrdersPanel,
  CustomerInfoModal,
  CustomerLookupModal,
  TableNumberModal,
  OrderNotesModal,
  ItemNotesModal,
  OrderSuccessModal,
  OfflineSyncIndicator,
  OfflineOrderConflictResolutionModal,
  type CartItem,
  type CartAddon,
  type CustomerInfo as CartCustomerInfo,
  type MenuItem as ProductMenuItem,
  type MenuCategory,
  type AddonCategory,
  type SelectedAddon,
  type POSPaymentData,
} from '@/components/pos';

// ============================================
// INTERFACES
// ============================================

interface MerchantSettings {
  id: string;
  currency: string;
  enableTax: boolean;
  taxPercentage: number | null;
  enableServiceCharge: boolean;
  serviceChargePercent: number | null;
  enablePackagingFee: boolean;
  packagingFeeAmount: number | null;
  totalTables: number | null;
}

interface POSMenuData {
  merchant: MerchantSettings;
  categories: MenuCategory[];
  menuItems: (ProductMenuItem & { addonCategories: AddonCategory[] })[];
  popularMenuIds?: (number | string)[]; // IDs of frequently ordered items
}

// Held order interface
interface HeldOrder {
  id: string;
  createdAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  notes?: string;
  customerInfo?: CartCustomerInfo;
  items: CartItem[];
  name?: string; // Optional name for the held order
}

// Storage key for held orders
const HELD_ORDERS_STORAGE_KEY = 'pos_held_orders';
const HELD_ORDERS_EXPIRY_DAYS = 1; // Auto-expire after 1 day

type DisplayMode = 'normal' | 'clean' | 'fullscreen';

// Grid columns options (min 1 for large cards, max 12 for small cards)
const MIN_GRID_COLUMNS = 1;
const MAX_GRID_COLUMNS = 12;
const DEFAULT_GRID_COLUMNS = 5;

// ============================================
// PAGE COMPONENT
// ============================================

export default function POSPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { merchant, isLoading: merchantLoading } = useMerchant();
  const { showSuccess, showError, showWarning } = useToast();

  // ========================================
  // OFFLINE SYNC
  // ========================================
  const {
    isOnline,
    pendingOrders,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncError,
    addPendingOrder,
    updatePendingOrder,
    removePendingOrder,
    syncPendingOrders,
    clearSyncError,
    syncConflicts,
    clearSyncConflicts,
    applyConflictResolutions,
  } = useOfflineSync({ merchantId: merchant?.id || null });

  // ========================================
  // STATE
  // ========================================

  // Display mode
  const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');

  // Grid columns for product display
  const [gridColumns, setGridColumns] = useState(DEFAULT_GRID_COLUMNS);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState<CartCustomerInfo>({});

  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Modal state
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<ProductMenuItem | null>(null);
  const [selectedMenuItemAddons, setSelectedMenuItemAddons] = useState<AddonCategory[]>([]);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false); // Placeholder for future conflict integration
  const [showOrderNotesModal, setShowOrderNotesModal] = useState(false);
  const [showItemNotesModal, setShowItemNotesModal] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  const [lastOrderTotal, setLastOrderTotal] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | number>('');
  const [pendingOrderTotal, setPendingOrderTotal] = useState<number>(0);

  // Order history panel state
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  // Held orders (Save/Hold functionality)
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrdersPanel, setShowHeldOrdersPanel] = useState(false);
  const [showPendingOrdersPanel, setShowPendingOrdersPanel] = useState(false);

  // When editing a pending offline order, we update it in-place instead of creating a new pending record.
  const [editingPendingOfflineOrderId, setEditingPendingOfflineOrderId] = useState<string | null>(null);

  // Popular menu IDs for frequently bought category
  const [popularMenuIds, setPopularMenuIds] = useState<(number | string)[]>([]);

  // Order details for receipt printing
  const [pendingOrderDetails, setPendingOrderDetails] = useState<{
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string;
    placedAt: Date;
    items: Array<{
      menuName: string;
      quantity: number;
      subtotal: number;
      addons?: Array<{
        addonName: string;
        addonPrice: number;
        quantity: number;
      }>;
    }>;
    subtotal: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    packagingFeeAmount?: number;
  } | null>(null);

  // Loading state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // ========================================
  // DISPLAY MODE EFFECTS
  // ========================================

  // Prevent body overflow when POS page is mounted
  useEffect(() => {
    // Store original overflow values
    const originalOverflowX = document.body.style.overflowX;
    const originalOverflow = document.documentElement.style.overflow;

    // Prevent horizontal scroll on body and html
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';

    return () => {
      // Restore original values on unmount
      document.body.style.overflowX = originalOverflowX;
      document.documentElement.style.overflowX = originalOverflow;
    };
  }, []);

  // Handle display mode changes
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-header]') as HTMLElement;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement;

    if (displayMode === 'clean' || displayMode === 'fullscreen') {
      // Hide UI elements
      document.body.classList.add('clean-mode');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
      // Show UI elements
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, [displayMode]);

  // Listen to fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && displayMode === 'fullscreen') {
        // User pressed ESC or exited fullscreen, go back to normal mode
        setDisplayMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [displayMode]);

  // Cycle display mode: normal -> clean -> fullscreen -> normal
  const cycleDisplayMode = async () => {
    if (displayMode === 'normal') {
      setDisplayMode('clean');
    } else if (displayMode === 'clean') {
      try {
        await document.documentElement.requestFullscreen();
        setDisplayMode('fullscreen');
      } catch {
        setDisplayMode('normal');
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setDisplayMode('normal');
    }
  };

  // ========================================
  // HELD ORDERS MANAGEMENT
  // ========================================

  // Load held orders from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(HELD_ORDERS_STORAGE_KEY);
      if (stored) {
        const parsed: HeldOrder[] = JSON.parse(stored);
        // Filter out expired orders (older than HELD_ORDERS_EXPIRY_DAYS)
        const now = new Date();
        const validOrders = parsed.filter(order => {
          const createdAt = new Date(order.createdAt);
          const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays < HELD_ORDERS_EXPIRY_DAYS;
        });
        setHeldOrders(validOrders);

        // Save back filtered list
        if (validOrders.length !== parsed.length) {
          localStorage.setItem(HELD_ORDERS_STORAGE_KEY, JSON.stringify(validOrders));
        }
      }
    } catch (error) {
      console.error('[POS] Error loading held orders:', error);
    }
  }, []);

  // Save held orders to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(HELD_ORDERS_STORAGE_KEY, JSON.stringify(heldOrders));
    } catch (error) {
      console.error('[POS] Error saving held orders:', error);
    }
  }, [heldOrders]);

  // Auto-save cart to localStorage when it changes (cart persistence)
  useEffect(() => {
    if (cartItems.length > 0) {
      saveCartToStorage({
        items: cartItems,
        orderType,
        tableNumber,
        orderNotes,
        customerInfo,
      }, merchant?.id || null);
      return;
    }

    // When cart becomes empty, ensure any persisted cart is removed.
    clearCartFromStorage(merchant?.id || null);
  }, [cartItems, orderType, tableNumber, orderNotes, customerInfo, merchant?.id]);

  // Load cart from localStorage when merchant is known
  useEffect(() => {
    if (!merchant?.id) return;
    if (cartItems.length > 0) return;

    const savedCart = loadCartFromStorage(merchant.id);
    if (savedCart && Array.isArray(savedCart.items) && savedCart.items.length > 0) {
      // Check if cart is not too old (less than 4 hours)
      const savedAt = new Date(savedCart.savedAt);
      const now = new Date();
      const diffHours = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

      if (diffHours < 4) {
        setCartItems(savedCart.items as CartItem[]);
        setOrderType(savedCart.orderType);
        setTableNumber(savedCart.tableNumber);
        setOrderNotes(savedCart.orderNotes);
        setCustomerInfo(savedCart.customerInfo);
      } else {
        // Clear old cart
        clearCartFromStorage(merchant.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.id]);

  // Hold current order (Save as draft)
  const handleHoldOrder = useCallback(() => {
    if (cartItems.length === 0) return;

    const heldOrder: HeldOrder = {
      id: `held-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      orderType,
      tableNumber: tableNumber || undefined,
      notes: orderNotes || undefined,
      customerInfo: (customerInfo.name || customerInfo.phone || customerInfo.email)
        ? customerInfo
        : undefined,
      items: [...cartItems],
      name: tableNumber ? `Table ${tableNumber}` : customerInfo.name || `Order ${heldOrders.length + 1}`,
    };

    setHeldOrders(prev => [...prev, heldOrder]);
    // Clear cart inline to avoid dependency issues
    setCartItems([]);
    setTableNumber('');
    setOrderNotes('');
    setCustomerInfo({});
    clearCartFromStorage(merchant?.id || null);
    showSuccess(t('pos.orderHeld') || 'Order saved', t('pos.orderHeldDesc') || 'You can recall it later');
  }, [cartItems, orderType, tableNumber, orderNotes, customerInfo, heldOrders.length, merchant?.id, showSuccess, t]);

  // Auto-open conflict modal if sync detects menu/addon changes
  useEffect(() => {
    if (syncConflicts.length > 0) {
      setShowConflictModal(true);
    }
  }, [syncConflicts.length]);

  const handleEditPendingOfflineOrder = useCallback((orderId: string) => {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) return;

    if (cartItems.length > 0) {
      if (!confirm(t('pos.recallOrderConfirm') || 'This will replace current cart. Continue?')) {
        return;
      }
    }

    const newCartItems: CartItem[] = order.items.map(item => ({
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      menuId: item.menuId,
      menuName: item.menuName,
      menuPrice: item.menuPrice,
      quantity: item.quantity,
      notes: item.notes,
      addons: (item.addons || []).map(a => ({
        addonItemId: a.addonItemId,
        addonName: a.addonName,
        addonPrice: a.addonPrice,
        quantity: a.quantity,
      })),
    }));

    setCartItems(newCartItems);
    setOrderType(order.orderType);
    setTableNumber(order.tableNumber || '');
    setOrderNotes(order.notes || '');
    setCustomerInfo(order.customer || {});
    setEditingPendingOfflineOrderId(order.id);
    setShowPendingOrdersPanel(false);
    showSuccess(t('pos.orderRecalled') || 'Order recalled');
  }, [pendingOrders, cartItems.length, showSuccess, t]);

  // Recall a held order
  const handleRecallOrder = useCallback((orderId: string) => {
    const order = heldOrders.find(o => o.id === orderId);
    if (!order) return;

    // If cart has items, ask for confirmation
    if (cartItems.length > 0) {
      if (!confirm(t('pos.recallOrderConfirm') || 'This will replace current cart. Continue?')) {
        return;
      }
    }

    setCartItems(order.items);
    setOrderType(order.orderType);
    setTableNumber(order.tableNumber || '');
    setOrderNotes(order.notes || '');
    setCustomerInfo(order.customerInfo || {});

    // Remove from held orders
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    setShowHeldOrdersPanel(false);
    showSuccess(t('pos.orderRecalled') || 'Order recalled');
  }, [heldOrders, cartItems.length, showSuccess, t]);

  // Delete a held order
  const handleDeleteHeldOrder = useCallback((orderId: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // ========================================
  // FETCH POPULAR MENU IDS
  // ========================================

  // Fetch popular menu IDs for frequently bought category
  useEffect(() => {
    const fetchPopularMenus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Use analytics endpoint to get top selling items
        const response = await fetch('/api/merchant/analytics/menu-performance?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.topSelling) {
            const ids = data.data.topSelling.map((item: { menuId: number | string }) => item.menuId);
            setPopularMenuIds(ids);
          }
        }
      } catch (error) {
        console.error('[POS] Error fetching popular menus:', error);
      }
    };

    fetchPopularMenus();
  }, []);

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetcher = async (url: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  };

  const { data: posData, isLoading: posLoading, error: posError } = useSWR<POSMenuData>(
    merchant ? '/api/merchant/pos/menu' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Extract data
  const merchantSettings = posData?.merchant;
  const categories = posData?.categories || [];
  const menuItems = posData?.menuItems || [];
  const currency = merchantSettings?.currency || 'AUD';

  // ========================================
  // HANDLERS
  // ========================================

  // Generate unique cart item ID
  const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Handle adding item to cart
  const handleAddItem = useCallback((item: ProductMenuItem) => {
    // Find menu item with addons
    const menuWithAddons = menuItems.find(m => String(m.id) === String(item.id));
    const addonCategories = menuWithAddons?.addonCategories || [];

    if (addonCategories.length > 0) {
      // Show addon modal
      setSelectedMenuItem(item);
      setSelectedMenuItemAddons(addonCategories);
      setShowAddonModal(true);
    } else {
      // Add directly to cart
      const newCartItem: CartItem = {
        id: generateCartItemId(),
        menuId: item.id,
        menuName: item.name,
        menuPrice: item.promoPrice ?? item.price,
        quantity: 1,
        notes: '',
        addons: [],
        imageUrl: item.imageUrl,
      };
      setCartItems(prev => [...prev, newCartItem]);
      showSuccess(t('pos.itemAdded'), item.name);
    }
  }, [menuItems, t, showSuccess]);

  // Handle addon modal confirm
  const handleAddonConfirm = useCallback((addons: SelectedAddon[], notes: string, quantity: number) => {
    if (!selectedMenuItem) return;

    const cartAddons: CartAddon[] = addons.map(a => ({
      addonItemId: a.addonItemId,
      addonName: a.addonName,
      addonPrice: a.addonPrice,
      quantity: a.quantity,
    }));

    const newCartItem: CartItem = {
      id: generateCartItemId(),
      menuId: selectedMenuItem.id,
      menuName: selectedMenuItem.name,
      menuPrice: selectedMenuItem.promoPrice ?? selectedMenuItem.price,
      quantity: quantity,
      notes: notes,
      addons: cartAddons,
      imageUrl: selectedMenuItem.imageUrl,
    };

    setCartItems(prev => [...prev, newCartItem]);
    setShowAddonModal(false);
    setSelectedMenuItem(null);
    setSelectedMenuItemAddons([]);
    showSuccess(t('pos.itemAdded'), selectedMenuItem.name);
  }, [selectedMenuItem, t, showSuccess]);

  // Update cart item quantity
  const handleUpdateQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
    } else {
      setCartItems(prev => prev.map(item =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  }, []);

  // Remove cart item
  const handleRemoveItem = useCallback((cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  }, []);

  // Edit item notes
  const handleEditItemNotes = useCallback((cartItemId: string) => {
    setEditingCartItemId(cartItemId);
    setShowItemNotesModal(true);
  }, []);

  // Confirm item notes
  const handleItemNotesConfirm = useCallback((notes: string) => {
    if (!editingCartItemId) return;
    setCartItems(prev => prev.map(item =>
      item.id === editingCartItemId ? { ...item, notes } : item
    ));
    setShowItemNotesModal(false);
    setEditingCartItemId(null);
  }, [editingCartItemId]);

  // Clear cart
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setTableNumber('');
    setOrderNotes('');
    setCustomerInfo({});
    clearCartFromStorage(merchant?.id || null);
    setEditingPendingOfflineOrderId(null);
  }, [merchant?.id]);

  const formatCurrency = useCallback(
    (amount: number): string => formatCurrencyUtil(amount, currency, locale),
    [currency, locale]
  );

  // Calculate order total for display
  const calculateOrderTotal = useCallback(() => {
    const subtotal = cartItems.reduce((total: number, item: CartItem) => {
      const itemTotal = item.menuPrice * item.quantity;
      const addonsTotal = item.addons.reduce((sum: number, addon: CartAddon) =>
        sum + (addon.addonPrice * addon.quantity), 0
      );
      return total + itemTotal + addonsTotal;
    }, 0);

    const taxAmount = merchantSettings?.enableTax
      ? subtotal * ((merchantSettings.taxPercentage || 0) / 100)
      : 0;
    const serviceCharge = merchantSettings?.enableServiceCharge
      ? subtotal * ((merchantSettings.serviceChargePercent || 0) / 100)
      : 0;
    const packagingFee = (orderType === 'TAKEAWAY' && merchantSettings?.enablePackagingFee)
      ? (merchantSettings.packagingFeeAmount || 0)
      : 0;

    return subtotal + taxAmount + serviceCharge + packagingFee;
  }, [cartItems, merchantSettings, orderType]);

  // Place order - with offline support
  const handlePlaceOrder = useCallback(async () => {
    if (cartItems.length === 0) return;

    setIsPlacingOrder(true);

    // Build order items with names and prices for offline display
    const orderItems = cartItems.map(item => ({
      menuId: item.menuId,
      menuName: item.menuName,
      menuPrice: item.menuPrice,
      quantity: item.quantity,
      notes: item.notes || undefined,
      addons: item.addons.length > 0
        ? item.addons.map((a: CartAddon) => ({
          addonItemId: a.addonItemId,
          addonName: a.addonName,
          addonPrice: a.addonPrice,
          quantity: a.quantity,
        }))
        : undefined,
    }));

    // If offline, queue the order
    if (!isOnline) {
      const pendingOrder: Omit<PendingOrder, 'id' | 'createdAt'> = {
        orderType,
        tableNumber: tableNumber || undefined,
        notes: orderNotes || undefined,
        customer: (customerInfo.name || customerInfo.phone || customerInfo.email)
          ? customerInfo
          : undefined,
        items: orderItems,
        totalAmount: calculateOrderTotal(),
      };

      const pendingId = editingPendingOfflineOrderId
        ? (updatePendingOrder(editingPendingOfflineOrderId, pendingOrder), editingPendingOfflineOrderId)
        : addPendingOrder(pendingOrder);

      // Show offline success
      setLastOrderNumber(`OFFLINE-${pendingId.substring(0, 8).toUpperCase()}`);
      setLastOrderTotal(formatCurrency(calculateOrderTotal()));
      setShowSuccessModal(true);

      showWarning(
        t('pos.offlineOrderQueued') || 'Order queued for sync when online',
        t('pos.offlineMode') || 'Offline Mode'
      );

      // Clear cart
      handleClearCart();
      setIsPlacingOrder(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');

      // Build request body
      const requestBody = {
        orderType,
        tableNumber: tableNumber || undefined,
        notes: orderNotes || undefined,
        customer: (customerInfo.name || customerInfo.phone || customerInfo.email)
          ? customerInfo
          : undefined,
        items: cartItems.map(item => ({
          menuId: item.menuId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          addons: item.addons.length > 0
            ? item.addons.map((a: CartAddon) => ({
              addonItemId: a.addonItemId,
              quantity: a.quantity,
            }))
            : undefined,
        })),
      };

      const response = await fetch('/api/merchant/orders/pos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // Calculate amounts for receipt
        const subtotal = cartItems.reduce((total: number, item: CartItem) => {
          const itemTotal = item.menuPrice * item.quantity;
          const addonsTotal = item.addons.reduce((sum: number, addon: CartAddon) =>
            sum + (addon.addonPrice * addon.quantity), 0
          );
          return total + itemTotal + addonsTotal;
        }, 0);

        const taxAmount = merchantSettings?.enableTax
          ? subtotal * ((merchantSettings.taxPercentage || 0) / 100)
          : 0;
        const serviceChargeAmount = merchantSettings?.enableServiceCharge
          ? subtotal * ((merchantSettings.serviceChargePercent || 0) / 100)
          : 0;
        const packagingFeeAmount = (orderType === 'TAKEAWAY' && merchantSettings?.enablePackagingFee)
          ? (merchantSettings.packagingFeeAmount || 0)
          : 0;

        // Store order details for receipt printing
        setPendingOrderDetails({
          orderType,
          tableNumber: tableNumber || undefined,
          placedAt: new Date(),
          items: cartItems.map(item => ({
            menuName: item.menuName,
            quantity: item.quantity,
            subtotal: (item.menuPrice * item.quantity) +
              item.addons.reduce((sum: number, addon: CartAddon) => sum + (addon.addonPrice * addon.quantity), 0),
            addons: item.addons.length > 0 ? item.addons.map((a: CartAddon) => ({
              addonName: a.addonName,
              addonPrice: a.addonPrice,
              quantity: a.quantity,
            })) : undefined,
          })),
          subtotal,
          taxAmount: taxAmount > 0 ? taxAmount : undefined,
          serviceChargeAmount: serviceChargeAmount > 0 ? serviceChargeAmount : undefined,
          packagingFeeAmount: packagingFeeAmount > 0 ? packagingFeeAmount : undefined,
        });

        // Store order info and show payment modal
        setPendingOrderId(data.data.id);
        setLastOrderNumber(data.data.orderNumber);
        setPendingOrderTotal(calculateOrderTotal());
        setShowPaymentModal(true);

        // Done editing any pending offline order
        setEditingPendingOfflineOrderId(null);

        // Clear cart (order is already created)
        handleClearCart();
      } else {
        showError(data.message || t('pos.orderFailed'), t('common.error'));
      }
    } catch (error) {
      console.error('[POS] Place order error:', error);

      // If network error, offer to queue offline
      if (!navigator.onLine) {
        const pendingOrder: Omit<PendingOrder, 'id' | 'createdAt'> = {
          orderType,
          tableNumber: tableNumber || undefined,
          notes: orderNotes || undefined,
          customer: (customerInfo.name || customerInfo.phone || customerInfo.email)
            ? customerInfo
            : undefined,
          items: orderItems,
          totalAmount: calculateOrderTotal(),
        };

        const pendingId = editingPendingOfflineOrderId
          ? (updatePendingOrder(editingPendingOfflineOrderId, pendingOrder), editingPendingOfflineOrderId)
          : addPendingOrder(pendingOrder);

        setLastOrderNumber(`OFFLINE-${pendingId.substring(0, 8).toUpperCase()}`);
        setLastOrderTotal(formatCurrency(calculateOrderTotal()));
        setShowSuccessModal(true);

        showWarning(
          t('pos.offlineOrderQueued') || 'Order queued for sync when online',
          t('pos.offlineMode') || 'Offline Mode'
        );

        handleClearCart();
      } else {
        showError(t('pos.orderFailed'), t('common.error'));
      }
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    cartItems,
    orderType,
    tableNumber,
    orderNotes,
    customerInfo,
    formatCurrency,
    calculateOrderTotal,
    handleClearCart,
    showError,
    showWarning,
    isOnline,
    addPendingOrder,
    updatePendingOrder,
    editingPendingOfflineOrderId,
    t,
  ]);

  // Handle new order after success
  const handleNewOrder = useCallback(() => {
    setShowSuccessModal(false);
    setLastOrderNumber('');
    setLastOrderTotal('');
  }, []);

  // Handle view order after success
  const handleViewOrder = useCallback(() => {
    setShowSuccessModal(false);
    router.push('/admin/dashboard/orders');
  }, [router]);

  // Handle payment confirmation
  const handlePaymentConfirm = useCallback(async (paymentData: POSPaymentData) => {
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/merchant/orders/pos/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: pendingOrderId,
          paymentMethod: paymentData.method === 'SPLIT' ? 'SPLIT' : paymentData.method,
          amountPaid: paymentData.amountPaid,
          changeAmount: paymentData.change,
          notes: paymentData.notes,
          // Split payment details
          cashAmount: paymentData.cashAmount,
          cardAmount: paymentData.cardAmount,
          // Discount details
          discountType: paymentData.discountType,
          discountValue: paymentData.discountValue,
          discountAmount: paymentData.discountAmount,
          finalTotal: paymentData.finalTotal,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Close payment modal and show success
        setShowPaymentModal(false);
        setLastOrderTotal(formatCurrency(paymentData.finalTotal || pendingOrderTotal));
        setShowSuccessModal(true);

        // Refresh POS history + active orders so payment status updates everywhere
        mutate('/api/merchant/orders/pos/history?today=true');
        mutate('/api/merchant/orders/active');

        // Clear payment state
        setPendingOrderId('');
        setPendingOrderTotal(0);
        setPendingOrderDetails(null);
      } else {
        showError(data.message || t('pos.paymentFailed') || 'Payment failed', t('common.error'));
      }
    } catch (error) {
      console.error('[POS] Payment error:', error);
      showError(t('pos.paymentFailed') || 'Payment failed', t('common.error'));
    }
  }, [pendingOrderId, pendingOrderTotal, formatCurrency, showError, t]);

  // Handle payment cancel (order already created, just skip payment recording)
  const handlePaymentCancel = useCallback(() => {
    setShowPaymentModal(false);
    // Show success anyway since order is created
    setLastOrderTotal(formatCurrency(pendingOrderTotal));
    setShowSuccessModal(true);
    // Clear payment state
    setPendingOrderId('');
    setPendingOrderTotal(0);
    setPendingOrderDetails(null);
  }, [pendingOrderTotal, formatCurrency]);

  // Get editing cart item for notes modal
  const editingCartItem = cartItems.find(item => item.id === editingCartItemId);

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Prevent shortcuts when modals are open
      if (showPaymentModal || showAddonModal || showCustomerModal || showTableModal ||
        showOrderNotesModal || showItemNotesModal || showSuccessModal || showOrderHistory) {
        // Only allow ESC to close modals
        if (e.key === 'Escape') {
          if (showOrderHistory) setShowOrderHistory(false);
        }
        return;
      }

      switch (e.key) {
        // F1 - Open order history
        case 'F1':
          e.preventDefault();
          setShowOrderHistory(true);
          break;

        // F2 - Toggle order type (Dine In / Takeaway)
        case 'F2':
          e.preventDefault();
          setOrderType(prev => prev === 'DINE_IN' ? 'TAKEAWAY' : 'DINE_IN');
          break;

        // F3 - Set table number
        case 'F3':
          e.preventDefault();
          setShowTableModal(true);
          break;

        // F4 - Add customer info
        case 'F4':
          e.preventDefault();
          setShowCustomerModal(true);
          break;

        // F5 - Add order notes
        case 'F5':
          e.preventDefault();
          setShowOrderNotesModal(true);
          break;

        // F8 - Clear cart
        case 'F8':
          e.preventDefault();
          if (cartItems.length > 0) {
            handleClearCart();
          }
          break;

        // F10 - Place order / Proceed to payment
        case 'F10':
          e.preventDefault();
          if (cartItems.length > 0 && !isPlacingOrder) {
            handlePlaceOrder();
          }
          break;

        // F11 - Toggle display mode
        case 'F11':
          e.preventDefault();
          cycleDisplayMode();
          break;

        // Shift+Delete - Remove last item from cart
        case 'Delete':
          if (e.shiftKey && cartItems.length > 0) {
            e.preventDefault();
            const lastItem = cartItems[cartItems.length - 1];
            handleRemoveItem(lastItem.id);
          }
          break;

        // + or = - Increase last item quantity
        case '+':
        case '=':
          if (cartItems.length > 0) {
            e.preventDefault();
            const lastItem = cartItems[cartItems.length - 1];
            handleUpdateQuantity(lastItem.id, lastItem.quantity + 1);
          }
          break;

        // - - Decrease last item quantity
        case '-':
          if (cartItems.length > 0) {
            e.preventDefault();
            const lastItem = cartItems[cartItems.length - 1];
            handleUpdateQuantity(lastItem.id, lastItem.quantity - 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    cartItems,
    isPlacingOrder,
    showPaymentModal,
    showAddonModal,
    showCustomerModal,
    showTableModal,
    showOrderNotesModal,
    showItemNotesModal,
    showSuccessModal,
    showOrderHistory,
    handleClearCart,
    handlePlaceOrder,
    handleRemoveItem,
    handleUpdateQuantity,
    cycleDisplayMode,
  ]);

  // ========================================
  // LOADING & ERROR STATES
  // ========================================

  if (merchantLoading || posLoading) {
    return <POSSkeleton />;
  }

  if (posError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('pos.loadError')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  // Container classes based on display mode
  // Normal mode: use CSS containment to prevent affecting parent layout
  // Clean/Fullscreen: fixed positioning to cover entire screen
  const isNormalMode = displayMode === 'normal';

  return (
    <div
      className={isNormalMode
        ? 'flex flex-col overflow-hidden -mb-6'
        : 'fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-800'
      }
      style={isNormalMode
        ? {
          height: 'calc(100vh - 90px)',
          contain: 'inline-size',
        }
        : { height: '100dvh' }
      }
    >
      {/* Header - Orange theme */}
      <header className="shrink-0 h-14 bg-orange-500 dark:bg-orange-600 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/dashboard/orders')}
            className="w-9 h-9 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
            title={t('common.back')}
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <FaReceipt className="w-5 h-5 text-white" />
            <h1 className="text-lg font-semibold text-white">
              {t('pos.title')}
            </h1>
          </div>

          {/* Online/Offline indicator with sync status */}
          <div className="ml-4">
            <OfflineSyncIndicator
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={pendingCount}
              syncError={syncError}
              lastSyncTime={lastSyncTime}
              onSync={syncPendingOrders}
              onClearError={clearSyncError}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid size controls */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg">
            <button
              onClick={() => setGridColumns(prev => Math.max(MIN_GRID_COLUMNS, prev - 1))}
              disabled={gridColumns <= MIN_GRID_COLUMNS}
              className="w-7 h-7 rounded bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Smaller grid"
            >
              <FaMinus className="w-3 h-3" />
            </button>
            <span className="text-xs text-white font-medium min-w-6 text-center">{gridColumns}</span>
            <button
              onClick={() => setGridColumns(prev => Math.min(MAX_GRID_COLUMNS, prev + 1))}
              disabled={gridColumns >= MAX_GRID_COLUMNS}
              className="w-7 h-7 rounded bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Larger grid"
            >
              <FaPlus className="w-3 h-3" />
            </button>
          </div>

          {/* Display mode toggle - Progressive: Normal → Clean → Fullscreen */}
          <button
            onClick={cycleDisplayMode}
            className="w-9 h-9 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
            title={
              displayMode === 'normal' ? t('admin.orders.enterCleanMode') :
                displayMode === 'clean' ? t('admin.orders.enterFullScreen') :
                  t('admin.orders.exitFullScreen')
            }
          >
            {displayMode === 'normal' ? (
              <FaEye className="w-4 h-4" />
            ) : displayMode === 'clean' ? (
              <FaExpand className="w-4 h-4" />
            ) : (
              <FaCompress className="w-4 h-4" />
            )}
          </button>

          {/* Exit clean/fullscreen mode button */}
          {displayMode !== 'normal' && (
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                }
                setDisplayMode('normal');
              }}
              className="w-9 h-9 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
              title={t('common.close')}
            >
              <FaTimes className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowOrderHistory(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 text-sm transition-colors"
          >
            <FaHistory className="w-4 h-4" />
            <span className="hidden sm:inline">{t('pos.orderHistory')}</span>
          </button>

          {/* Pending Orders Button - Only show when offline or has pending orders */}
          {(pendingCount > 0 || !isOnline) && (
            <button
              onClick={() => setShowPendingOrdersPanel(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isOnline
                ? 'bg-yellow-500/80 text-white hover:bg-yellow-500'
                : 'bg-red-500/80 text-white hover:bg-red-500 animate-pulse'
                }`}
              title={isOnline ? t('pos.pendingOrders') : t('pos.offlineMode')}
            >
              <FaWifi className={`w-4 h-4 ${!isOnline ? 'opacity-50' : ''}`} />
              {pendingCount > 0 && (
                <span className="bg-white text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Content - Fixed height to prevent scrolling */}
      <div className="flex-1 flex min-h-0 overflow-hidden" style={{ contain: 'size layout' }}>
        {/* Left Panel - Cart - Fixed width */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
          <POSCartPanel
            items={cartItems}
            orderType={orderType}
            tableNumber={tableNumber}
            orderNotes={orderNotes}
            customerInfo={customerInfo}
            currency={currency}
            taxPercentage={merchantSettings?.taxPercentage || 0}
            serviceChargePercent={merchantSettings?.serviceChargePercent || 0}
            packagingFeeAmount={merchantSettings?.packagingFeeAmount || 0}
            enableTax={merchantSettings?.enableTax || false}
            enableServiceCharge={merchantSettings?.enableServiceCharge || false}
            enablePackagingFee={merchantSettings?.enablePackagingFee || false}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onEditItemNotes={handleEditItemNotes}
            onSetOrderType={setOrderType}
            onSetTableNumber={() => setShowTableModal(true)}
            onSetOrderNotes={() => setShowOrderNotesModal(true)}
            onSetCustomerInfo={() => setShowCustomerModal(true)}
            onLookupCustomer={() => setShowCustomerLookup(true)}
            onClearCart={handleClearCart}
            onPlaceOrder={handlePlaceOrder}
            onHoldOrder={handleHoldOrder}
            heldOrdersCount={heldOrders.length}
            onShowHeldOrders={() => setShowHeldOrdersPanel(true)}
            isPlacingOrder={isPlacingOrder}
          />
        </div>

        {/* Right Panel - Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <POSProductGrid
            categories={categories}
            menuItems={menuItems}
            currency={currency}
            isLoading={posLoading}
            onAddItem={handleAddItem}
            gridColumns={gridColumns}
            popularMenuIds={popularMenuIds}
          />
        </div>
      </div>

      {/* Modals */}
      <POSAddonModal
        isOpen={showAddonModal}
        onClose={() => {
          setShowAddonModal(false);
          setSelectedMenuItem(null);
          setSelectedMenuItemAddons([]);
        }}
        onConfirm={handleAddonConfirm}
        menuItem={selectedMenuItem || { id: 0, name: '', price: 0 }}
        addonCategories={selectedMenuItemAddons}
        currency={currency}
      />

      <CustomerInfoModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onConfirm={(info) => setCustomerInfo(info)}
        initialValue={customerInfo}
      />

      <TableNumberModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onConfirm={(num) => setTableNumber(num)}
        initialValue={tableNumber}
        totalTables={merchantSettings?.totalTables}
      />

      <OrderNotesModal
        isOpen={showOrderNotesModal}
        onClose={() => setShowOrderNotesModal(false)}
        onConfirm={(notes) => setOrderNotes(notes)}
        initialValue={orderNotes}
      />

      <ItemNotesModal
        isOpen={showItemNotesModal}
        onClose={() => {
          setShowItemNotesModal(false);
          setEditingCartItemId(null);
        }}
        onConfirm={handleItemNotesConfirm}
        initialValue={editingCartItem?.notes || ''}
        itemName={editingCartItem?.menuName || ''}
      />

      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        orderId={pendingOrderId}
        orderNumber={lastOrderNumber}
        totalAmount={pendingOrderTotal}
        currency={currency}
        orderDetails={pendingOrderDetails || undefined}
        merchantInfo={merchant ? {
          name: merchant.name || merchant.code || 'Merchant',
          code: merchant.code,
          address: merchant.address,
          phone: merchant.phone,
          email: merchant.email,
          logoUrl: merchant.logoUrl,
        } : undefined}
        receiptSettings={merchant?.receiptSettings}
      />

      <OrderSuccessModal
        isOpen={showSuccessModal}
        onClose={handleNewOrder}
        orderNumber={lastOrderNumber}
        total={lastOrderTotal}
        onNewOrder={handleNewOrder}
        onViewOrder={handleViewOrder}
      />

      <POSOrderHistoryPanel
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        currency={currency}
        hasDeletePin={merchant?.hasDeletePin}
        onRefundSuccess={() => {
          showSuccess(t('pos.refundSuccess') || 'Order refunded successfully');
        }}
        merchantInfo={merchant ? {
          name: merchant.name,
          code: merchant.code,
          logoUrl: merchant.logoUrl,
          address: merchant.address,
          phone: merchant.phone,
          email: merchant.email,
          receiptSettings: merchant.receiptSettings,
        } : undefined}
      />

      <POSHeldOrdersPanel
        isOpen={showHeldOrdersPanel}
        onClose={() => setShowHeldOrdersPanel(false)}
        heldOrders={heldOrders}
        onRecallOrder={handleRecallOrder}
        onDeleteOrder={handleDeleteHeldOrder}
        currency={currency}
      />

      <POSPendingOrdersPanel
        isOpen={showPendingOrdersPanel}
        onClose={() => setShowPendingOrdersPanel(false)}
        pendingOrders={pendingOrders}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncOrders={syncPendingOrders}
        onEditOrder={handleEditPendingOfflineOrder}
        onDeleteOrder={removePendingOrder}
        currency={currency}
      />

      <CustomerLookupModal
        isOpen={showCustomerLookup}
        onClose={() => setShowCustomerLookup(false)}
        onSelect={(customer) => {
          setCustomerInfo({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          });
          setShowCustomerLookup(false);
          showSuccess(t('pos.customerSelected') || 'Customer selected');
        }}
      />

      <OfflineOrderConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false);
          // Keep conflicts in state so user can reopen if needed
        }}
        conflicts={syncConflicts}
        currency={currency}
        onApply={(resolutions) => {
          applyConflictResolutions(resolutions);
          clearSyncConflicts();
          showSuccess(t('pos.updated') || 'Updated', 'Pending orders updated to match current menu');
          // After applying fixes, attempt sync again (if online)
          if (isOnline) {
            syncPendingOrders().catch(() => undefined);
          }
        }}
      />
    </div>
  );
}
