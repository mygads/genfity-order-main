/**
 * Tutorial Configurations
 * 
 * @description Define all tutorials and their steps for the merchant dashboard
 * @specification copilot-instructions.md - UI/UX Standards
 */

import type { Tutorial } from './types';

// Import all step definitions from modular files
import {
  // Onboarding
  onboardingSteps,
  // Menu
  createMenuSteps,
  editMenuSteps,
  menuBuilderSteps,
  bulkUploadMenuSteps,
  // Categories
  createCategorySteps,
  editCategorySteps,
  // Addons
  createAddonCategorySteps,
  createAddonItemSteps,
  editAddonSteps,
  bulkUploadAddonSteps,
  // Settings
  merchantSettingsSteps,
  qrTableCodesSteps,
  stockManagementSteps,
  // Orders
  activeOrdersSteps,
  kitchenDisplaySteps,
  orderHistorySteps,
  // Reports
  revenueDashboardSteps,
  reportsSteps,
  analyticsSteps,
  // Other
  staffManagementSteps,
  specialPricesSteps,
  menuBooksSteps,
  linkMenuToAddonSteps,
  // Quick Tips
  keyboardShortcutsSteps,
  bulkOperationsSteps,
  searchFilterSteps,
  darkModeSteps,
  mobileUsageSteps,
  viewModesSteps,
  dailyOperationsSteps,
} from './steps';

// ============================================
// ALL TUTORIALS CONFIG
// ============================================

export const TUTORIALS: Tutorial[] = [
  // --- ONBOARDING (First-time login) ---
  {
    id: 'onboarding',
    name: 'Getting Started',
    description: 'Learn the basics of your dashboard',
    icon: 'FaRocket',
    steps: onboardingSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    isOnboarding: true,
    order: 0,
    estimatedTime: 3,
  },

  // --- CATEGORY TUTORIALS ---
  {
    id: 'create-category',
    name: 'Create Categories',
    description: 'Organize your menu with categories',
    icon: 'FaFolderOpen',
    steps: createCategorySteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['CATEGORIES'],
    order: 1,
    estimatedTime: 2,
  },
  {
    id: 'edit-category',
    name: 'Edit Categories',
    description: 'Update or delete existing categories',
    icon: 'FaEdit',
    steps: editCategorySteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['CATEGORIES'],
    order: 2,
    estimatedTime: 2,
  },

  // --- MENU TUTORIALS ---
  {
    id: 'create-menu',
    name: 'Create Menu Items',
    description: 'Add delicious items to your menu',
    icon: 'FaUtensils',
    steps: createMenuSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU'],
    order: 3,
    estimatedTime: 4,
  },
  {
    id: 'edit-menu',
    name: 'Edit Menu Items',
    description: 'Update prices, photos, and details',
    icon: 'FaPencilAlt',
    steps: editMenuSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU'],
    order: 4,
    estimatedTime: 2,
  },
  {
    id: 'menu-builder',
    name: 'Menu Builder',
    description: 'Visual drag-and-drop menu creation',
    icon: 'FaMagic',
    steps: menuBuilderSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU'],
    order: 5,
    estimatedTime: 3,
  },
  {
    id: 'bulk-upload-menu',
    name: 'Bulk Upload Menu',
    description: 'Import multiple items from Excel',
    icon: 'FaFileExcel',
    steps: bulkUploadMenuSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU'],
    order: 6,
    estimatedTime: 3,
  },

  // --- ADDON TUTORIALS ---
  {
    id: 'create-addon-category',
    name: 'Create Addon Categories',
    description: 'Group customization options',
    icon: 'FaPuzzlePiece',
    steps: createAddonCategorySteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ADDON_CATEGORIES'],
    order: 7,
    estimatedTime: 3,
  },
  {
    id: 'create-addon-item',
    name: 'Create Addon Items',
    description: 'Add options like sizes, toppings',
    icon: 'FaPlus',
    steps: createAddonItemSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ADDON_ITEMS'],
    order: 8,
    estimatedTime: 3,
  },
  {
    id: 'edit-addon',
    name: 'Edit Addons',
    description: 'Update addon categories and items',
    icon: 'FaEdit',
    steps: editAddonSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ADDON_CATEGORIES', 'ADDON_ITEMS'],
    order: 9,
    estimatedTime: 2,
  },
  {
    id: 'bulk-upload-addon',
    name: 'Bulk Upload Addons',
    description: 'Import multiple addons from Excel',
    icon: 'FaFileExcel',
    steps: bulkUploadAddonSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ADDON_ITEMS'],
    order: 10,
    estimatedTime: 3,
  },
  {
    id: 'link-menu-to-addon',
    name: 'Link Menu to Addons',
    description: 'Connect addons to menu items',
    icon: 'FaLink',
    steps: linkMenuToAddonSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU', 'ADDON_CATEGORIES'],
    order: 11,
    estimatedTime: 2,
  },

  // --- SETTINGS TUTORIALS ---
  {
    id: 'merchant-settings',
    name: 'Merchant Settings',
    description: 'Configure your restaurant profile',
    icon: 'FaCogs',
    steps: merchantSettingsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MERCHANT_SETTINGS'],
    order: 12,
    estimatedTime: 3,
  },
  {
    id: 'qr-tables',
    name: 'Table QR Codes',
    description: 'Set up QR ordering for tables',
    icon: 'FaQrcode',
    steps: qrTableCodesSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['QR_TABLES'],
    order: 13,
    estimatedTime: 2,
  },
  {
    id: 'stock-management',
    name: 'Stock Management',
    description: 'Track and manage inventory',
    icon: 'FaBoxes',
    steps: stockManagementSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU_STOCK'],
    order: 14,
    estimatedTime: 3,
  },

  // --- ORDER TUTORIALS ---
  {
    id: 'active-orders',
    name: 'Active Orders',
    description: 'Manage incoming orders',
    icon: 'FaClipboardList',
    steps: activeOrdersSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ORDERS'],
    order: 15,
    estimatedTime: 3,
  },
  {
    id: 'kitchen-display',
    name: 'Kitchen Display',
    description: 'Kitchen order management',
    icon: 'FaConciergeBell',
    steps: kitchenDisplaySteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['KITCHEN_DISPLAY'],
    order: 16,
    estimatedTime: 2,
  },
  {
    id: 'order-history',
    name: 'Order History',
    description: 'View and search past orders',
    icon: 'FaHistory',
    steps: orderHistorySteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['ORDERS'],
    order: 17,
    estimatedTime: 2,
  },

  // --- REPORTS TUTORIALS ---
  {
    id: 'revenue-dashboard',
    name: 'Revenue Dashboard',
    description: 'Track your earnings',
    icon: 'FaChartLine',
    steps: revenueDashboardSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['REVENUE'],
    order: 18,
    estimatedTime: 2,
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Generate detailed reports',
    icon: 'FaChartPie',
    steps: reportsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['REPORTS'],
    order: 19,
    estimatedTime: 3,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Customer and menu insights',
    icon: 'FaChartBar',
    steps: analyticsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['REPORTS'],
    order: 20,
    estimatedTime: 2,
  },

  // --- OTHER TUTORIALS ---
  {
    id: 'staff-management',
    name: 'Staff Management',
    description: 'Add and manage team members',
    icon: 'FaUsersCog',
    steps: staffManagementSteps,
    roles: ['MERCHANT_OWNER'],
    requiredPermissions: ['STAFF'],
    order: 21,
    estimatedTime: 3,
  },
  {
    id: 'special-prices',
    name: 'Special Prices',
    description: 'Happy hour and promotions',
    icon: 'FaPercentage',
    steps: specialPricesSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['SPECIAL_PRICES'],
    order: 22,
    estimatedTime: 3,
  },
  {
    id: 'menu-books',
    name: 'Menu Books',
    description: 'Create different menus',
    icon: 'FaBook',
    steps: menuBooksSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    requiredPermissions: ['MENU_BOOKS'],
    order: 23,
    estimatedTime: 3,
  },

  // --- QUICK TIPS TUTORIALS ---
  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Speed up your workflow',
    icon: 'FaKeyboard',
    steps: keyboardShortcutsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 24,
    estimatedTime: 1,
  },
  {
    id: 'bulk-operations',
    name: 'Bulk Operations',
    description: 'Manage multiple items at once',
    icon: 'FaCheckDouble',
    steps: bulkOperationsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 25,
    estimatedTime: 2,
  },
  {
    id: 'search-filter',
    name: 'Search & Filter',
    description: 'Find what you need quickly',
    icon: 'FaSearch',
    steps: searchFilterSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 26,
    estimatedTime: 1,
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Comfortable viewing in low light',
    icon: 'FaMoon',
    steps: darkModeSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 27,
    estimatedTime: 1,
  },
  {
    id: 'mobile-usage',
    name: 'Mobile Usage',
    description: 'Manage on the go',
    icon: 'FaMobileAlt',
    steps: mobileUsageSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 28,
    estimatedTime: 1,
  },
  {
    id: 'view-modes',
    name: 'View Modes',
    description: 'Different layouts for different needs',
    icon: 'FaTh',
    steps: viewModesSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 29,
    estimatedTime: 2,
  },
  {
    id: 'daily-operations',
    name: 'Daily Operations',
    description: 'Your daily checklist',
    icon: 'FaCalendarCheck',
    steps: dailyOperationsSteps,
    roles: ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
    order: 30,
    estimatedTime: 2,
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get a tutorial by ID
 */
export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}

/**
 * Get the onboarding tutorial
 */
export function getOnboardingTutorial(): Tutorial {
  return TUTORIALS.find(t => t.isOnboarding) as Tutorial;
}

/**
 * Get tutorials available for a specific role and permissions
 */
export function getAvailableTutorials(
  role: 'MERCHANT_OWNER' | 'MERCHANT_STAFF',
  permissions: string[] = []
): Tutorial[] {
  return TUTORIALS.filter(tutorial => {
    // Check role
    if (!tutorial.roles.includes(role)) return false;
    
    // For owners, all tutorials are available
    if (role === 'MERCHANT_OWNER') return true;
    
    // For staff, check permissions
    if (tutorial.requiredPermissions && tutorial.requiredPermissions.length > 0) {
      return tutorial.requiredPermissions.some(p => permissions.includes(p));
    }
    
    return true;
  }).sort((a, b) => a.order - b.order);
}

/**
 * Get tutorials grouped by category
 */
export function getTutorialsByCategory(): Record<string, Tutorial[]> {
  return {
    'Getting Started': TUTORIALS.filter(t => t.isOnboarding),
    'Categories': TUTORIALS.filter(t => t.id.includes('category')),
    'Menu Items': TUTORIALS.filter(t => t.id.includes('menu') && !t.id.includes('menu-books')),
    'Addons': TUTORIALS.filter(t => t.id.includes('addon')),
    'Settings': TUTORIALS.filter(t => ['merchant-settings', 'qr-tables', 'stock-management'].includes(t.id)),
    'Orders': TUTORIALS.filter(t => ['active-orders', 'kitchen-display', 'order-history'].includes(t.id)),
    'Reports & Analytics': TUTORIALS.filter(t => ['revenue-dashboard', 'reports', 'analytics'].includes(t.id)),
    'Other Features': TUTORIALS.filter(t => ['staff-management', 'special-prices', 'menu-books'].includes(t.id)),
    'Quick Tips': TUTORIALS.filter(t => ['keyboard-shortcuts', 'bulk-operations', 'search-filter', 'dark-mode', 'mobile-usage', 'view-modes', 'daily-operations'].includes(t.id)),
  };
}
