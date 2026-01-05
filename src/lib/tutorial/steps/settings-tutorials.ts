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
    targetSelector: '[data-tutorial="settings-tabs"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'basic-info-tab',
    title: 'Basic Information',
    description: 'Update your store name, description, logo, and contact information.',
    targetSelector: '[data-tutorial="settings-basic-info"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
  },
  {
    id: 'store-name',
    title: 'Store Name',
    description: 'Enter your business name. This appears in the customer menu and order confirmations.',
    targetSelector: '[data-tutorial="merchant-name"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
    pointerIcon: 'edit',
  },
  {
    id: 'merchant-code',
    title: 'Store URL Code',
    description: 'This is your unique store URL: menu.genfity.com/YOUR-CODE. Keep it simple and memorable!',
    targetSelector: '[data-tutorial="merchant-code"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'store-logo',
    title: 'Upload Store Logo',
    description: 'Upload a logo that represents your brand. Recommended: square image, at least 200x200 pixels.',
    targetSelector: '[data-tutorial="merchant-logo"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'opening-hours-tab',
    title: 'Opening Hours',
    description: 'Click this tab to set your store\'s operating hours for each day of the week.',
    targetSelector: '[data-tutorial="settings-hours-tab"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Click tab',
  },
  {
    id: 'set-hours',
    title: 'Configure Opening Hours',
    description: 'Set open/close times for each day. You can mark days as closed or set different hours per day.',
    targetSelector: '[data-tutorial="opening-hours-form"]',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'currency-setting',
    title: 'Currency Setting',
    description: 'Select your local currency. All prices will be displayed in this currency.',
    targetSelector: '[data-tutorial="currency-select"]',
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
    title: 'Table QR Codes',
    description: 'Each QR code includes the table number. When customers scan, their order is automatically linked to that table!',
    targetSelector: '[data-tutorial="qr-table-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'add-tables',
    title: 'Add Tables',
    description: 'Click this button to add new tables. You can add multiple tables at once.',
    targetSelector: '[data-tutorial="add-tables-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'table-number-range',
    title: 'Set Table Numbers',
    description: 'Enter the range of table numbers to create. Example: 1-10 creates tables 1 through 10.',
    targetSelector: '[data-tutorial="table-range-input"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'download-qr',
    title: 'Download QR Code',
    description: 'Click the download button to get the QR code image for printing.',
    targetSelector: '[data-tutorial="download-qr-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'print-all',
    title: 'Print All QR Codes',
    description: 'Click this to download all QR codes at once as a PDF, ready for printing.',
    targetSelector: '[data-tutorial="print-all-btn"]',
    position: 'bottom-left',
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
  },
  {
    id: 'stock-overview',
    title: 'Stock Overview',
    description: 'See all items with stock tracking enabled. Low stock items are highlighted for attention.',
    targetSelector: '[data-tutorial="stock-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'filter-stock',
    title: 'Filter Stock Items',
    description: 'Filter by type (menu/addon) or status (low stock, out of stock) to focus on what needs attention.',
    targetSelector: '[data-tutorial="stock-filter"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'update-stock',
    title: 'Update Stock Quantity',
    description: 'Click on an item to update its stock quantity. You can add or subtract from current stock.',
    targetSelector: '[data-tutorial="stock-item-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'quick-update',
    title: 'Quick Update',
    description: 'Use the +/- buttons for quick adjustments, or type a specific quantity.',
    targetSelector: '[data-tutorial="stock-quick-update"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'daily-reset',
    title: 'Daily Stock Reset',
    description: 'Enable daily reset for items with daily preparation limits. Stock resets to template quantity each morning.',
    targetSelector: '[data-tutorial="daily-stock-toggle"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'low-stock-alert',
    title: 'Low Stock Alerts',
    description: 'Set a threshold to receive alerts when stock runs low. Never run out unexpectedly!',
    targetSelector: '[data-tutorial="low-stock-threshold"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'stock-complete',
    title: 'Stock Setup Complete! 📦',
    description: 'Great! Your inventory is now tracked. Items automatically show "Out of Stock" when quantity reaches 0.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
