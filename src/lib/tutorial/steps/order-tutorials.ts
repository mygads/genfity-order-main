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
    id: 'orders-page',
    title: 'Orders Page',
    description: 'Manage incoming orders here.',
    targetSelector: '[data-tutorial="orders-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'order-search',
    title: 'Search Orders',
    description: 'Use the search bar to quickly find orders by order number, table number, or customer name.',
    targetSelector: '[data-tutorial="order-search"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerIcon: 'search',
  },
  {
    id: 'order-view-modes',
    title: 'View Modes',
    description: 'Switch between different view modes: Card view for quick overview, or Board view for Kanban-style order management.',
    targetSelector: '[data-tutorial="order-view-modes"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'order-kanban',
    title: 'Kanban Board',
    description: 'The Kanban board shows orders organized by status: New, Preparing, Ready, Completed. Drag and drop to update status!',
    targetSelector: '[data-tutorial="order-kanban-board"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'order-fullscreen',
    title: 'Fullscreen Mode',
    description: 'Click to enter fullscreen mode for a distraction-free order management experience.',
    targetSelector: '[data-tutorial="order-fullscreen"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'order-filters',
    title: 'Filter Orders',
    description: 'Click the filter button to filter orders by status, date range, or order type.',
    targetSelector: '[data-tutorial="order-filters-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
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
    id: 'kitchen-page',
    title: 'Kitchen Display Page',
    description: 'This view is optimized for kitchen screens.',
    targetSelector: '[data-tutorial="kitchen-page"]',
    position: 'bottom',
    spotlightPadding: 8,
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
// ORDERS QUEUE (LOUNGE) DISPLAY TUTORIAL
// ============================================

export const ordersQueueSteps: TutorialStep[] = [
  {
    id: 'go-to-queue',
    title: 'Go to Queue Display',
    description: 'Queue Display shows READY orders prominently for customer pickup. Perfect for TV/monitor display in your restaurant lounge!',
    targetSelector: '[data-nav-item="/admin/dashboard/orders/queue"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Queue Display',
    navigateTo: '/admin/dashboard/orders/queue',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'queue-overview',
    title: 'Queue Display Overview',
    description: 'This screen shows all READY orders with large, easy-to-read order numbers. Customers can see when their order is ready!',
    targetSelector: '[data-tutorial="queue-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'queue-grid',
    title: 'Ready Orders Grid',
    description: 'Each card shows: order number, customer name, order type (dine-in/takeaway), and time since ready. The newest order pulses green!',
    targetSelector: '[data-tutorial="queue-grid"], [data-tutorial="queue-empty-state"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'queue-order-card',
    title: 'Order Card',
    description: 'Click the "Picked Up" button when a customer collects their order. This marks the order as COMPLETED.',
    targetSelector: '[data-tutorial="queue-order-card"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
  },
  {
    id: 'queue-pickup-button',
    title: 'Picked Up Button',
    description: 'Tap this when the order is collected.',
    targetSelector: '[data-tutorial="queue-pickup-btn"], [data-tutorial="queue-order-card"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'queue-auto-refresh',
    title: 'Auto-Refresh',
    description: 'The queue display automatically refreshes every 3 seconds to show the latest ready orders. No manual refresh needed!',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'queue-display-modes',
    title: 'Display Modes',
    description: 'Switch between display modes:\n• Normal: Regular dashboard view\n• Clean: Hides sidebar/header\n• Fullscreen: Full TV display mode',
    targetSelector: '[data-tutorial="queue-display-mode"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerIcon: 'expand',
  },
  {
    id: 'queue-sound',
    title: 'Sound Notifications 🔔',
    description: 'New ready orders trigger a sound notification. Make sure your browser/device allows audio playback!',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'queue-tips',
    title: 'Queue Display Tips 📺',
    description: 'For best experience:\n• Use a dedicated TV/monitor for queue display\n• Enable fullscreen mode for large screens\n• Consider placing near customer waiting area',
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
    id: 'history-page',
    title: 'Order History Page',
    description: 'Review past orders and sales data here.',
    targetSelector: '[data-tutorial="order-history-page"]',
    position: 'bottom',
    spotlightPadding: 8,
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
    targetSelector: '[data-tutorial="history-date-filter"]',
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
