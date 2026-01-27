/**
 * Staff Permission Constants
 * Defines all permission keys for merchant staff access control
 * 
 * IMPORTANT: These permission keys are used to control:
 * 1. Sidebar menu visibility
 * 2. API route access
 * 3. Page access
 */

/**
 * All available staff permissions
 */
export const STAFF_PERMISSIONS = {
  // Order Management
  ORDERS: 'orders',                    // View and manage orders (Kanban)
  ORDERS_KITCHEN: 'orders_kitchen',    // Kitchen display
  ORDERS_HISTORY: 'orders_history',    // Order history
  CUSTOMER_DISPLAY: 'customer_display', // Customer display screen

  // Delivery / Driver
  DRIVER_DASHBOARD: 'driver_dashboard', // Allow staff to login to Driver portal

  // Menu Management
  MENU: 'menu',                        // Menu items CRUD
  MENU_STOCK: 'menu_stock',            // Stock management
  MENU_BUILDER: 'menu_builder',        // Menu builder
  CATEGORIES: 'categories',            // Menu categories
  ADDON_CATEGORIES: 'addon_categories', // Addon categories
  ADDON_ITEMS: 'addon_items',          // Addon items
  MENU_BOOKS: 'menu_books',            // Menu books
  SPECIAL_PRICES: 'special_prices',    // Special prices/promos

  // Promotions / Discounts
  ORDER_VOUCHERS: 'order_vouchers',    // Order discount vouchers (POS + customer)

  // Reports (typically owner-only, but can be granted)
  REPORTS: 'reports',                  // Sales reports
  REVENUE: 'revenue',                  // Revenue analytics

  // Customer feedback (separate from full reports)
  CUSTOMER_FEEDBACK: 'customer_feedback',

  // Settings (typically owner-only, but can be granted)
  MERCHANT_SETTINGS: 'merchant_settings', // Merchant profile settings
  QR_TABLES: 'qr_tables',              // QR codes and table management
  STORE_TOGGLE_OPEN: 'store_toggle_open', // Allow manual open/close (override schedule)
  SUBSCRIPTION: 'subscription',        // Subscription/billing access

  // Notification Settings (which notifications staff can receive)
  NOTIF_NEW_ORDER: 'notif_new_order',        // New order notifications
  NOTIF_STOCK_OUT: 'notif_stock_out',        // Stock out of stock alerts
  NOTIF_LOW_STOCK: 'notif_low_stock',        // Low stock warnings
  NOTIF_PAYMENT: 'notif_payment',            // Payment verification notices
  NOTIF_SUBSCRIPTION: 'notif_subscription',  // Subscription/trial notifications

  // Staff management is ALWAYS owner-only
  // STAFF: 'staff', // Intentionally excluded - owner only
} as const;

/**
 * Permission type
 */
export type StaffPermission = typeof STAFF_PERMISSIONS[keyof typeof STAFF_PERMISSIONS];

/**
 * Default permissions for new staff
 * Default: no permissions (dashboard-only).
 * Owners can grant permissions explicitly via the Staff page.
 */
export const DEFAULT_STAFF_PERMISSIONS: StaffPermission[] = [];

/**
 * All permissions (for owner)
 */
export const ALL_PERMISSIONS: StaffPermission[] = Object.values(STAFF_PERMISSIONS);

/**
 * Permission Templates for common staff roles
 * Allows quick assignment of role-based permissions
 */
export const PERMISSION_TEMPLATES = {
  DRIVER: {
    key: 'driver',
    nameKey: 'admin.permissions.templates.driver',
    descKey: 'admin.permissions.templates.driverDesc',
    permissions: [
      STAFF_PERMISSIONS.DRIVER_DASHBOARD,
    ] as StaffPermission[],
  },
  CASHIER: {
    key: 'cashier',
    nameKey: 'admin.permissions.templates.cashier',
    descKey: 'admin.permissions.templates.cashierDesc',
    permissions: [
      STAFF_PERMISSIONS.ORDERS,
      STAFF_PERMISSIONS.ORDERS_HISTORY,
    ] as StaffPermission[],
  },
  KITCHEN_STAFF: {
    key: 'kitchen_staff',
    nameKey: 'admin.permissions.templates.kitchenStaff',
    descKey: 'admin.permissions.templates.kitchenStaffDesc',
    permissions: [
      STAFF_PERMISSIONS.ORDERS,
      STAFF_PERMISSIONS.ORDERS_KITCHEN,
      STAFF_PERMISSIONS.MENU_STOCK,
      STAFF_PERMISSIONS.CUSTOMER_DISPLAY,
    ] as StaffPermission[],
  },
  MANAGER: {
    key: 'manager',
    nameKey: 'admin.permissions.templates.manager',
    descKey: 'admin.permissions.templates.managerDesc',
    permissions: [
      STAFF_PERMISSIONS.ORDERS,
      STAFF_PERMISSIONS.ORDERS_KITCHEN,
      STAFF_PERMISSIONS.ORDERS_HISTORY,
      STAFF_PERMISSIONS.CUSTOMER_DISPLAY,
      STAFF_PERMISSIONS.MENU,
      STAFF_PERMISSIONS.MENU_STOCK,
      STAFF_PERMISSIONS.MENU_BUILDER,
      STAFF_PERMISSIONS.CATEGORIES,
      STAFF_PERMISSIONS.ADDON_CATEGORIES,
      STAFF_PERMISSIONS.ADDON_ITEMS,
      STAFF_PERMISSIONS.MENU_BOOKS,
      STAFF_PERMISSIONS.SPECIAL_PRICES,
      STAFF_PERMISSIONS.ORDER_VOUCHERS,
      STAFF_PERMISSIONS.REPORTS,
      STAFF_PERMISSIONS.REVENUE,
      STAFF_PERMISSIONS.CUSTOMER_FEEDBACK,
      STAFF_PERMISSIONS.SUBSCRIPTION,
    ] as StaffPermission[],
  },
} as const;

export type PermissionTemplate = typeof PERMISSION_TEMPLATES[keyof typeof PERMISSION_TEMPLATES];


/**
 * Permission groups for UI display
 */
export const PERMISSION_GROUPS = {
  orderManagement: {
    titleKey: 'admin.permissions.orderManagement',
    permissions: [
      { key: STAFF_PERMISSIONS.ORDERS, nameKey: 'admin.permissions.orders', descKey: 'admin.permissions.ordersDesc' },
      { key: STAFF_PERMISSIONS.ORDERS_KITCHEN, nameKey: 'admin.permissions.ordersKitchen', descKey: 'admin.permissions.ordersKitchenDesc' },
      { key: STAFF_PERMISSIONS.ORDERS_HISTORY, nameKey: 'admin.permissions.ordersHistory', descKey: 'admin.permissions.ordersHistoryDesc' },
      { key: STAFF_PERMISSIONS.CUSTOMER_DISPLAY, nameKey: 'admin.permissions.customerDisplay', descKey: 'admin.permissions.customerDisplayDesc' },
    ],
  },
  delivery: {
    titleKey: 'admin.permissions.delivery',
    permissions: [
      { key: STAFF_PERMISSIONS.DRIVER_DASHBOARD, nameKey: 'admin.permissions.driverDashboard', descKey: 'admin.permissions.driverDashboardDesc' },
    ],
  },
  menuManagement: {
    titleKey: 'admin.permissions.menuManagement',
    permissions: [
      { key: STAFF_PERMISSIONS.MENU, nameKey: 'admin.permissions.menu', descKey: 'admin.permissions.menuDesc' },
      { key: STAFF_PERMISSIONS.MENU_STOCK, nameKey: 'admin.permissions.menuStock', descKey: 'admin.permissions.menuStockDesc' },
      { key: STAFF_PERMISSIONS.MENU_BUILDER, nameKey: 'admin.permissions.menuBuilder', descKey: 'admin.permissions.menuBuilderDesc' },
      { key: STAFF_PERMISSIONS.CATEGORIES, nameKey: 'admin.permissions.categories', descKey: 'admin.permissions.categoriesDesc' },
      { key: STAFF_PERMISSIONS.ADDON_CATEGORIES, nameKey: 'admin.permissions.addonCategories', descKey: 'admin.permissions.addonCategoriesDesc' },
      { key: STAFF_PERMISSIONS.ADDON_ITEMS, nameKey: 'admin.permissions.addonItems', descKey: 'admin.permissions.addonItemsDesc' },
      { key: STAFF_PERMISSIONS.MENU_BOOKS, nameKey: 'admin.permissions.menuBooks', descKey: 'admin.permissions.menuBooksDesc' },
      { key: STAFF_PERMISSIONS.SPECIAL_PRICES, nameKey: 'admin.permissions.specialPrices', descKey: 'admin.permissions.specialPricesDesc' },
      { key: STAFF_PERMISSIONS.ORDER_VOUCHERS, nameKey: 'admin.permissions.orderVouchers', descKey: 'admin.permissions.orderVouchersDesc' },
    ],
  },
  reportsAnalytics: {
    titleKey: 'admin.permissions.reportsAnalytics',
    permissions: [
      { key: STAFF_PERMISSIONS.REPORTS, nameKey: 'admin.permissions.reports', descKey: 'admin.permissions.reportsDesc' },
      { key: STAFF_PERMISSIONS.REVENUE, nameKey: 'admin.permissions.revenue', descKey: 'admin.permissions.revenueDesc' },
      { key: STAFF_PERMISSIONS.CUSTOMER_FEEDBACK, nameKey: 'admin.permissions.customerFeedback', descKey: 'admin.permissions.customerFeedbackDesc' },
    ],
  },
  settings: {
    titleKey: 'admin.permissions.settings',
    permissions: [
      { key: STAFF_PERMISSIONS.MERCHANT_SETTINGS, nameKey: 'admin.permissions.merchantSettings', descKey: 'admin.permissions.merchantSettingsDesc' },
      { key: STAFF_PERMISSIONS.QR_TABLES, nameKey: 'admin.permissions.qrTables', descKey: 'admin.permissions.qrTablesDesc' },
      { key: STAFF_PERMISSIONS.STORE_TOGGLE_OPEN, nameKey: 'admin.permissions.storeToggleOpen', descKey: 'admin.permissions.storeToggleOpenDesc' },
      { key: STAFF_PERMISSIONS.SUBSCRIPTION, nameKey: 'admin.permissions.subscription', descKey: 'admin.permissions.subscriptionDesc' },
    ],
  },
  notifications: {
    titleKey: 'admin.permissions.notifications',
    permissions: [
      { key: STAFF_PERMISSIONS.NOTIF_NEW_ORDER, nameKey: 'admin.permissions.notifNewOrder', descKey: 'admin.permissions.notifNewOrderDesc' },
      { key: STAFF_PERMISSIONS.NOTIF_STOCK_OUT, nameKey: 'admin.permissions.notifStockOut', descKey: 'admin.permissions.notifStockOutDesc' },
      { key: STAFF_PERMISSIONS.NOTIF_LOW_STOCK, nameKey: 'admin.permissions.notifLowStock', descKey: 'admin.permissions.notifLowStockDesc' },
      { key: STAFF_PERMISSIONS.NOTIF_PAYMENT, nameKey: 'admin.permissions.notifPayment', descKey: 'admin.permissions.notifPaymentDesc' },
      { key: STAFF_PERMISSIONS.NOTIF_SUBSCRIPTION, nameKey: 'admin.permissions.notifSubscription', descKey: 'admin.permissions.notifSubscriptionDesc' },
    ],
  },
} as const;

/**
 * Map sidebar path to permission
 */
export const PATH_PERMISSION_MAP: Record<string, StaffPermission> = {
  '/admin/dashboard/pos': STAFF_PERMISSIONS.ORDERS,
  '/admin/dashboard/orders': STAFF_PERMISSIONS.ORDERS,
  '/admin/dashboard/orders/kitchen': STAFF_PERMISSIONS.ORDERS_KITCHEN,
  '/admin/dashboard/orders/queue': STAFF_PERMISSIONS.ORDERS,
  '/admin/dashboard/customer-display': STAFF_PERMISSIONS.CUSTOMER_DISPLAY,
  '/admin/dashboard/orders/history': STAFF_PERMISSIONS.ORDERS_HISTORY,
  '/admin/dashboard/reservations': STAFF_PERMISSIONS.ORDERS,
  '/admin/dashboard/customer-feedback': STAFF_PERMISSIONS.CUSTOMER_FEEDBACK,
  '/admin/dashboard/menu': STAFF_PERMISSIONS.MENU,
  '/admin/dashboard/menu/stock-overview': STAFF_PERMISSIONS.MENU_STOCK,
  '/admin/dashboard/menu/builder': STAFF_PERMISSIONS.MENU_BUILDER,
  '/admin/dashboard/menu/builder/new': STAFF_PERMISSIONS.MENU_BUILDER,
  '/admin/dashboard/menu/create': STAFF_PERMISSIONS.MENU,
  '/admin/dashboard/menu/edit': STAFF_PERMISSIONS.MENU,
  '/admin/dashboard/menu/bulk-upload': STAFF_PERMISSIONS.MENU,
  '/admin/dashboard/menu/bulk-operations': STAFF_PERMISSIONS.MENU,
  '/admin/dashboard/categories': STAFF_PERMISSIONS.CATEGORIES,
  '/admin/dashboard/addon-categories': STAFF_PERMISSIONS.ADDON_CATEGORIES,
  '/admin/dashboard/addon-items': STAFF_PERMISSIONS.ADDON_ITEMS,
  '/admin/dashboard/addon-items/bulk-upload': STAFF_PERMISSIONS.ADDON_ITEMS,
  '/admin/dashboard/menu-books': STAFF_PERMISSIONS.MENU_BOOKS,
  '/admin/dashboard/menu-books/create': STAFF_PERMISSIONS.MENU_BOOKS,
  '/admin/dashboard/special-prices': STAFF_PERMISSIONS.SPECIAL_PRICES,
  '/admin/dashboard/special-prices/create': STAFF_PERMISSIONS.SPECIAL_PRICES,
  '/admin/dashboard/order-vouchers': STAFF_PERMISSIONS.ORDER_VOUCHERS,
  '/admin/dashboard/reports': STAFF_PERMISSIONS.REPORTS,
  '/admin/dashboard/revenue': STAFF_PERMISSIONS.REVENUE,
  '/admin/dashboard/analytics/sales': STAFF_PERMISSIONS.REVENUE,
  '/admin/dashboard/merchant/edit': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  '/admin/dashboard/qr-tables': STAFF_PERMISSIONS.QR_TABLES,
  '/admin/dashboard/subscription': STAFF_PERMISSIONS.SUBSCRIPTION,
};

/**
 * Owner-only dashboard pages.
 * These are role-based restrictions (not staff permissions) and should be blocked for staff.
 */
export const OWNER_ONLY_DASHBOARD_PATH_PREFIXES = [
  '/admin/dashboard/drivers',
  '/admin/dashboard/staff',
  '/admin/dashboard/subscription/group',
] as const;

export function isOwnerOnlyDashboardPath(path: string): boolean {
  return OWNER_ONLY_DASHBOARD_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * Map API route pattern to permission
 * Patterns use startsWith matching
 */
// Key format supports:
// - '/api/merchant/...': permission applies to any HTTP method
// - 'PUT /api/merchant/...': permission applies only to that method
export const API_PERMISSION_MAP: Record<string, StaffPermission> = {
  '/api/merchant/orders': STAFF_PERMISSIONS.ORDERS,
  '/api/merchant/reservations': STAFF_PERMISSIONS.ORDERS,
  '/api/merchant/drivers': STAFF_PERMISSIONS.ORDERS,
  '/api/merchant/pos': STAFF_PERMISSIONS.ORDERS,
  '/api/merchant/customer-display': STAFF_PERMISSIONS.CUSTOMER_DISPLAY,
  '/api/merchant/menu': STAFF_PERMISSIONS.MENU,
  '/api/merchant/menu/stock': STAFF_PERMISSIONS.MENU_STOCK,
  '/api/merchant/menu/builder': STAFF_PERMISSIONS.MENU_BUILDER,
  '/api/merchant/menu/bulk': STAFF_PERMISSIONS.MENU,
  '/api/merchant/deleted-items': STAFF_PERMISSIONS.MENU,
  '/api/merchant/stock-photos': STAFF_PERMISSIONS.MENU,
  '/api/merchant/categories': STAFF_PERMISSIONS.CATEGORIES,
  '/api/merchant/addon-categories': STAFF_PERMISSIONS.ADDON_CATEGORIES,
  '/api/merchant/addon-items': STAFF_PERMISSIONS.ADDON_ITEMS,
  '/api/merchant/bulk/addon-items': STAFF_PERMISSIONS.ADDON_ITEMS,
  '/api/merchant/bulk/menu': STAFF_PERMISSIONS.MENU,
  '/api/merchant/menu-books': STAFF_PERMISSIONS.MENU_BOOKS,
  '/api/merchant/special-prices': STAFF_PERMISSIONS.SPECIAL_PRICES,
  '/api/merchant/order-vouchers': STAFF_PERMISSIONS.ORDER_VOUCHERS,
  '/api/merchant/feedback': STAFF_PERMISSIONS.CUSTOMER_FEEDBACK,
  '/api/merchant/analytics': STAFF_PERMISSIONS.REVENUE,
  '/api/merchant/reports': STAFF_PERMISSIONS.REPORTS,
  '/api/merchant/revenue': STAFF_PERMISSIONS.REVENUE,
  '/api/merchant/payment-settings': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  'PUT /api/merchant/profile': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  '/api/merchant/opening-hours': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  '/api/merchant/special-hours': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  '/api/merchant/mode-schedules': STAFF_PERMISSIONS.MERCHANT_SETTINGS,
  '/api/merchant/toggle-open': STAFF_PERMISSIONS.STORE_TOGGLE_OPEN,
  '/api/merchant/subscription': STAFF_PERMISSIONS.SUBSCRIPTION,
};

/**
 * Check if a user has a specific permission
 * 
 * @param userPermissions User's permissions array
 * @param requiredPermission Required permission
 * @param isOwner Whether user is owner (owners have all permissions)
 * @returns Whether user has permission
 */
export function hasPermission(
  userPermissions: string[] | null | undefined,
  requiredPermission: StaffPermission,
  isOwner: boolean = false
): boolean {
  // Owners always have all permissions
  if (isOwner) return true;

  // If no permissions array, deny access
  if (!userPermissions || userPermissions.length === 0) return false;

  // Check if user has the required permission
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 * 
 * @param userPermissions User's permissions array
 * @param requiredPermissions Array of permissions (any match = true)
 * @param isOwner Whether user is owner
 * @returns Whether user has any of the permissions
 */
export function hasAnyPermission(
  userPermissions: string[] | null | undefined,
  requiredPermissions: StaffPermission[],
  isOwner: boolean = false
): boolean {
  if (isOwner) return true;
  if (!userPermissions || userPermissions.length === 0) return false;

  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

/**
 * Get permission for a path
 * 
 * @param path URL path
 * @returns Required permission or null if no permission required
 */
export function getPermissionForPath(path: string): StaffPermission | null {
  // Exact match first
  if (PATH_PERMISSION_MAP[path]) {
    return PATH_PERMISSION_MAP[path];
  }

  // Check for partial match (for dynamic routes like /menu/builder/123)
  // Prefer the most specific (longest) matching prefix.
  let bestMatch: { path: string; permission: StaffPermission } | null = null;
  for (const [mapPath, permission] of Object.entries(PATH_PERMISSION_MAP)) {
    if (!path.startsWith(mapPath)) continue;
    if (!bestMatch || mapPath.length > bestMatch.path.length) {
      bestMatch = { path: mapPath, permission };
    }
  }

  if (bestMatch) return bestMatch.permission;

  return null;
}

/**
 * Get permission for an API route
 * 
 * @param apiPath API path
 * @returns Required permission or null if no permission required
 */
export function getPermissionForApi(apiPath: string, method?: string): StaffPermission | null {
  const normalizedMethod = method?.toUpperCase();

  // Prefer the most specific (longest) matching prefix.
  // Also support method-specific keys like: 'PUT /api/merchant/profile'
  let bestMatch: { path: string; permission: StaffPermission; isMethodSpecific: boolean } | null = null;

  for (const [rawKey, permission] of Object.entries(API_PERMISSION_MAP)) {
    const hasMethodPrefix = rawKey.includes(' ');
    let keyMethod: string | undefined;
    let keyPath = rawKey;

    if (hasMethodPrefix) {
      const firstSpace = rawKey.indexOf(' ');
      keyMethod = rawKey.slice(0, firstSpace).toUpperCase();
      keyPath = rawKey.slice(firstSpace + 1);

      if (!normalizedMethod || normalizedMethod !== keyMethod) continue;
    }

    if (!apiPath.startsWith(keyPath)) continue;

    const candidate = {
      path: keyPath,
      permission,
      isMethodSpecific: hasMethodPrefix,
    };

    if (!bestMatch) {
      bestMatch = candidate;
      continue;
    }

    // Method-specific beats non-method-specific when same path length.
    if (candidate.path.length > bestMatch.path.length) {
      bestMatch = candidate;
    } else if (candidate.path.length === bestMatch.path.length) {
      if (candidate.isMethodSpecific && !bestMatch.isMethodSpecific) {
        bestMatch = candidate;
      }
    }
  }

  return bestMatch ? bestMatch.permission : null;
}
