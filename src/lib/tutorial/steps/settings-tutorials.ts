/**
 * Settings & Configuration Tutorial Steps
 * Merchant settings, QR tables, and stock management
 */

import type { TutorialStep } from '../types';

// ============================================
// MERCHANT SETTINGS TUTORIAL
// ============================================

export const merchantSettingsSteps: TutorialStep[] = [
  {
    id: 'go-to-settings',
    title: 'Go to Merchant Settings',
    description: 'Merchant settings let you configure your store information, opening hours, and preferences.',
    targetSelector: '[data-nav-item="/admin/dashboard/merchant/edit"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Settings',
    navigateTo: '/admin/dashboard/merchant/edit',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
    pointerIcon: 'cog',
  },
  {
    id: 'settings-overview',
    title: 'Settings Overview',
    description: 'Here you can configure all aspects of your store: basic info, opening hours, payment options, and more.',
    targetSelector: '[data-tutorial="merchant-settings-tabs"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'settings-form',
    title: 'Store Settings Form',
    description: 'Update your store name, description, logo, contact information, currency, opening hours, and more in this comprehensive form.',
    targetSelector: '[data-tutorial="merchant-settings-form"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
  },
  {
    id: 'save-settings',
    title: 'Save Changes',
    description: 'Don\'t forget to save your changes! Click "Save" to apply all settings.',
    targetSelector: '[data-tutorial="settings-save-btn"]',
    position: 'top',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Save!',
    pointerIcon: 'check',
  },
];

// ============================================
// QR TABLE CODES TUTORIAL
// ============================================

export const qrTableCodesSteps: TutorialStep[] = [
  {
    id: 'go-to-qr-tables',
    title: 'Go to QR Table Codes',
    description: 'Generate unique QR codes for each table. Customers scan to view your menu and order directly.',
    targetSelector: '[data-nav-item="/admin/dashboard/qr-tables"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to QR Tables',
    navigateTo: '/admin/dashboard/qr-tables',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'qr-overview',
    title: 'QR Tables Page',
    description: 'This is your QR codes page. Each QR code includes the table number. When customers scan, their order is automatically linked to that table!',
    targetSelector: '[data-tutorial="qr-tables-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'qr-settings',
    title: 'QR Settings',
    description: 'Configure your QR code settings, including the number of tables and download size options.',
    targetSelector: '[data-tutorial="qr-settings-card"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'table-count',
    title: 'Set Table Count',
    description: 'Enter the number of tables you have. QR codes will be generated for each table.',
    targetSelector: '[data-tutorial="qr-table-count"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
  },
  {
    id: 'download-size',
    title: 'Download Size',
    description: 'Choose the size for your QR code downloads. Larger sizes are better for printing.',
    targetSelector: '[data-tutorial="qr-download-size"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'download-all',
    title: 'Download All QR Codes',
    description: 'Click this to download all QR codes at once, ready for printing.',
    targetSelector: '[data-tutorial="qr-download-all"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Download!',
  },
  {
    id: 'qr-codes-grid',
    title: 'QR Codes Grid',
    description: 'View all your generated QR codes here. Click on any QR code to download it individually.',
    targetSelector: '[data-tutorial="qr-codes-grid"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'qr-placement-tips',
    title: 'Placement Tips 💡',
    description: 'Print and place QR codes on tables where customers can easily scan. Consider using table stands or stickers!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// STOCK MANAGEMENT TUTORIAL
// ============================================

export const stockManagementSteps: TutorialStep[] = [
  {
    id: 'go-to-stock',
    title: 'Go to Stock Management',
    description: 'Track inventory for menu items and addons. Items go unavailable when stock reaches 0.',
    targetSelector: '[data-nav-item="/admin/dashboard/menu/stock-overview"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Stock',
    navigateTo: '/admin/dashboard/menu/stock-overview',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'stock-overview',
    title: 'Stock Overview Page',
    description: 'This is your stock management page. See all items with stock tracking enabled. Low stock items are highlighted for attention.',
    targetSelector: '[data-tutorial="stock-overview-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stock-header',
    title: 'Stock Page Header',
    description: 'The header provides the page title and summary information about your stock status.',
    targetSelector: '[data-tutorial="stock-overview-header"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stock-quick-actions',
    title: 'Quick Actions',
    description: 'Use these buttons to quickly reset stock or refresh the current data.',
    targetSelector: '[data-tutorial="stock-quick-actions"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'stock-filters',
    title: 'Filter Options',
    description: 'Filter by low stock, out of stock, or stock status to focus on items that need attention.',
    targetSelector: '[data-tutorial="stock-filters"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stock-tabs',
    title: 'Stock Tabs',
    description: 'Switch between All items, Menu items only, or Add-ons only using these tabs.',
    targetSelector: '[data-tutorial="stock-tabs"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stock-search',
    title: 'Search Stock Items',
    description: 'Use the search bar to quickly find specific items by name. Combine with filters for precise results.',
    targetSelector: '[data-tutorial="stock-search"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stock-items-grid',
    title: 'Stock Items Grid',
    description: 'View all stock items here. Click on any item to update its stock quantity. Low and out-of-stock items are highlighted.',
    targetSelector: '[data-tutorial="stock-items-grid"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'stock-complete',
    title: 'Stock Management Complete! 📦',
    description: 'You now know how to track inventory. Keep your stock updated to avoid disappointing customers with unavailable items!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
