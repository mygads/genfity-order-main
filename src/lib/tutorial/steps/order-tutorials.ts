/**
 * Order Management Tutorial Steps
 * Active orders, kitchen display, order history
 */

import type { TutorialStep } from '../types';

// ============================================
// ACTIVE ORDERS TUTORIAL
// ============================================

export const activeOrdersSteps: TutorialStep[] = [
  {
    id: 'go-to-orders',
    title: 'Go to Active Orders',
    description: 'Active Orders shows all pending and in-progress orders. This is where you manage incoming orders!',
    targetSelector: '[data-nav-item="/admin/dashboard/orders"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Orders',
    navigateTo: '/admin/dashboard/orders',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'orders-overview',
    title: 'Orders Dashboard',
    description: 'See all active orders organized by status: New, Preparing, Ready, etc. Newest orders appear first.',
    targetSelector: '[data-tutorial="orders-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'order-status-tabs',
    title: 'Filter by Status',
    description: 'Click these tabs to filter orders by their current status. Quickly find what you\'re looking for!',
    targetSelector: '[data-tutorial="order-status-tabs"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'order-card',
    title: 'Order Card',
    description: 'Each card shows: order number, table/customer, items ordered, total amount, and time since order was placed.',
    targetSelector: '[data-tutorial="order-card"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
    pointerIcon: 'eye',
  },
  {
    id: 'view-order-details',
    title: 'View Order Details',
    description: 'Click an order card to see full details: all items, addons, special instructions, and customer notes.',
    targetSelector: '[data-tutorial="order-card"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click!',
  },
  {
    id: 'update-status',
    title: 'Update Order Status',
    description: 'Use these buttons to update the order status. Move orders through: New → Preparing → Ready → Completed.',
    targetSelector: '[data-tutorial="order-status-buttons"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Click to update',
  },
  {
    id: 'print-order',
    title: 'Print Order',
    description: 'Click the print button to print a receipt or kitchen ticket for this order.',
    targetSelector: '[data-tutorial="print-order-btn"]',
    position: 'left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'right',
  },
  {
    id: 'order-sound',
    title: 'New Order Alerts 🔔',
    description: 'You\'ll hear a sound notification when new orders arrive. Make sure your sound is on!',
    targetSelector: '[data-tutorial="sound-toggle"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'auto-refresh',
    title: 'Auto Refresh',
    description: 'Orders automatically refresh every few seconds. You\'ll always see the latest orders without refreshing manually.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// KITCHEN DISPLAY TUTORIAL
// ============================================

export const kitchenDisplaySteps: TutorialStep[] = [
  {
    id: 'go-to-kitchen',
    title: 'Go to Kitchen Display',
    description: 'Kitchen Display shows orders optimized for kitchen staff. Large, clear cards with cooking priorities.',
    targetSelector: '[data-nav-item="/admin/dashboard/orders/kitchen"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Kitchen Display',
    navigateTo: '/admin/dashboard/orders/kitchen',
  },
  {
    id: 'kitchen-overview',
    title: 'Kitchen Display Layout',
    description: 'Orders are displayed in large, easy-to-read cards. Perfect for wall-mounted screens in your kitchen!',
    targetSelector: '[data-tutorial="kitchen-grid"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'order-priority',
    title: 'Order Priority',
    description: 'Orders are sorted by time. Oldest orders (waiting longest) appear first to ensure timely preparation.',
    targetSelector: '[data-tutorial="kitchen-order-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'item-details',
    title: 'Item Details',
    description: 'Each item shows: name, quantity, selected addons, and any special instructions from the customer.',
    targetSelector: '[data-tutorial="kitchen-item-list"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'mark-ready',
    title: 'Mark as Ready',
    description: 'When an order is prepared, click "Ready" to notify front-of-house that it\'s ready for pickup/delivery.',
    targetSelector: '[data-tutorial="kitchen-ready-btn"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'bump-order',
    title: 'Bump Order',
    description: 'After order is served, "bump" it to remove from the display and mark as completed.',
    targetSelector: '[data-tutorial="kitchen-bump-btn"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'fullscreen-mode',
    title: 'Fullscreen Mode',
    description: 'Click to enter fullscreen mode. Perfect for dedicated kitchen displays and wall-mounted screens.',
    targetSelector: '[data-tutorial="fullscreen-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'kitchen-tips',
    title: 'Kitchen Display Tips 👨‍🍳',
    description: 'For best experience:\n• Use a wall-mounted screen or tablet\n• Enable sound for new order alerts\n• Consider color-coded priorities',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// ORDER HISTORY TUTORIAL
// ============================================

export const orderHistorySteps: TutorialStep[] = [
  {
    id: 'go-to-history',
    title: 'Go to Order History',
    description: 'Order History shows all past orders. Search, filter, and analyze your order data.',
    targetSelector: '[data-nav-item="/admin/dashboard/orders/history"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Order History',
    navigateTo: '/admin/dashboard/orders/history',
  },
  {
    id: 'history-overview',
    title: 'Order History',
    description: 'View completed and cancelled orders. Use this to track sales, handle inquiries, and analyze trends.',
    targetSelector: '[data-tutorial="order-history-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'date-filter',
    title: 'Filter by Date',
    description: 'Select a date range to view orders from specific periods. Great for daily/weekly reviews.',
    targetSelector: '[data-tutorial="date-range-filter"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'search-orders',
    title: 'Search Orders',
    description: 'Search by order number, customer name, or table number to quickly find specific orders.',
    targetSelector: '[data-tutorial="order-search"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'order-details-modal',
    title: 'View Order Details',
    description: 'Click any order to see full details: items, payment method, timestamps, and status history.',
    targetSelector: '[data-tutorial="history-order-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'reprint-receipt',
    title: 'Reprint Receipt',
    description: 'Need a copy? Click the print button to reprint the receipt for any past order.',
    targetSelector: '[data-tutorial="reprint-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'export-orders',
    title: 'Export Orders',
    description: 'Export order data to Excel/CSV for accounting, analysis, or record keeping.',
    targetSelector: '[data-tutorial="export-orders-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'history-complete',
    title: 'Order History Complete! 📋',
    description: 'Use Order History for customer inquiries, sales analysis, and keeping records. For revenue reports, check the Revenue section!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
