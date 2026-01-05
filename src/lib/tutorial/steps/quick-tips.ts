/**
 * Quick Tips Tutorial Steps
 * Short, focused tips for experienced users
 */

import type { TutorialStep } from '../types';

/**
 * Keyboard Shortcuts Tutorial
 */
export const keyboardShortcutsSteps: TutorialStep[] = [
  {
    id: 'keyboard-intro',
    title: 'Keyboard Shortcuts ⌨️',
    description: 'Speed up your workflow with these keyboard shortcuts. Press these keys anywhere in the dashboard.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'shortcut-search',
    title: 'Quick Search',
    description: 'Press "/" (forward slash) to focus the search bar instantly. Start typing to search for anything.',
    targetSelector: '[data-tutorial="order-search"], [data-tutorial="menu-search"], [data-tutorial="category-search"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'shortcut-escape',
    title: 'Close Modals',
    description: 'Press "Escape" to close any open modal or dismiss popup dialogs quickly.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'shortcut-help',
    title: 'Get Help',
    description: 'Press "?" to see all available keyboard shortcuts. Press "H" to open the help menu.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'shortcuts-complete',
    title: 'Pro Mode Unlocked! 🎯',
    description: 'You now know the keyboard shortcuts. These will save you time as you manage orders and menu items.',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * Bulk Operations Tutorial
 */
export const bulkOperationsSteps: TutorialStep[] = [
  {
    id: 'bulk-intro',
    title: 'Bulk Operations',
    description: 'Save time by performing actions on multiple items at once. This works on orders, menu items, categories, and addons.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'bulk-select',
    title: 'Select Multiple Items',
    description: 'Use the checkboxes to select multiple items. In the orders page, click "Bulk Select" to enable selection mode.',
    targetSelector: '[data-tutorial="order-bulk-mode"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'bulk-actions',
    title: 'Perform Bulk Actions',
    description: 'Once items are selected, you can delete, update status, export, or perform other actions on all selected items at once.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'bulk-export',
    title: 'Export to Excel',
    description: 'Export your data (menu items, orders, categories) to Excel for reporting or backup. Look for the "Export" button.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'bulk-complete',
    title: 'Bulk Operations Mastered! 💪',
    description: 'You\'re now equipped to handle multiple items efficiently. Great for busy restaurants!',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * Search & Filter Tutorial
 */
export const searchFilterSteps: TutorialStep[] = [
  {
    id: 'search-intro',
    title: 'Search & Filter',
    description: 'Find exactly what you need quickly with powerful search and filter options.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'search-bar',
    title: 'Search Bar',
    description: 'Type keywords to search. In orders, search by order number, customer name, or items. In menu, search by item name.',
    targetSelector: '[data-tutorial="order-search"], [data-tutorial="menu-search"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'filter-options',
    title: 'Filter Options',
    description: 'Use filters to narrow down results. Filter by status (active/inactive), date range, order type (dine-in/takeaway), and more.',
    targetSelector: '[data-tutorial="menu-filters"], [data-tutorial="category-filters"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'filter-orders',
    title: 'Order Filters',
    description: 'Filter orders by payment status, order type, and date range. Click the Filter button to see all options.',
    targetSelector: '[data-tutorial="order-filters-btn"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'search-complete',
    title: 'Search Like a Pro! 🔍',
    description: 'Now you can find anything in seconds. Combine search with filters for precise results.',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * Dark Mode Tutorial
 */
export const darkModeSteps: TutorialStep[] = [
  {
    id: 'darkmode-intro',
    title: 'Dark Mode 🌙',
    description: 'GENFITY supports dark mode for comfortable viewing in low-light environments.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'darkmode-toggle',
    title: 'Toggle Dark Mode',
    description: 'Click the sun/moon icon in the top navigation bar to switch between light and dark modes.',
    targetSelector: '[data-theme-toggle]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'darkmode-auto',
    title: 'Automatic Mode',
    description: 'Your preference is saved automatically. The system can also follow your device\'s theme settings.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'darkmode-complete',
    title: 'Theme Set! ✨',
    description: 'Your viewing experience is now optimized. The theme persists across sessions.',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * Mobile Usage Tutorial
 */
export const mobileUsageSteps: TutorialStep[] = [
  {
    id: 'mobile-intro',
    title: 'Mobile-Friendly Dashboard 📱',
    description: 'GENFITY works great on mobile devices. Here are some tips for the best experience.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'mobile-sidebar',
    title: 'Mobile Sidebar',
    description: 'On mobile, tap the hamburger menu (≡) to open the sidebar. Tap outside to close it.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'mobile-swipe',
    title: 'Swipe Gestures',
    description: 'Swipe left/right on tables and lists to see more columns. Pull down to refresh data.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'mobile-notifications',
    title: 'Push Notifications',
    description: 'Enable push notifications to get alerted about new orders even when the browser is closed.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 'mobile-complete',
    title: 'Mobile Ready! 📲',
    description: 'You can now manage your restaurant from anywhere. Consider installing GENFITY as a PWA for faster access.',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * View Modes Tutorial
 */
export const viewModesSteps: TutorialStep[] = [
  {
    id: 'viewmodes-intro',
    title: 'Multiple View Modes',
    description: 'Switch between different views to find the layout that works best for you.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'viewmodes-order',
    title: 'Order View Modes',
    description: 'Choose between Kanban Cards, Kanban List, or Tab List views. Each has its advantages for different situations.',
    targetSelector: '[data-tutorial="order-view-modes"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'viewmodes-kanban',
    title: 'Kanban Board',
    description: 'The default view. Drag and drop orders between columns (New → Preparing → Ready → Completed).',
    targetSelector: '[data-tutorial="order-kanban-board"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'viewmodes-fullscreen',
    title: 'Fullscreen Mode',
    description: 'For kitchen display, use fullscreen mode for a distraction-free view. Great for mounting on a TV!',
    targetSelector: '[data-tutorial="order-fullscreen"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'viewmodes-complete',
    title: 'View Modes Mastered! 👀',
    description: 'Choose the view that matches your workflow. Your preference is remembered for next time.',
    targetSelector: null,
    position: 'center',
  },
];

/**
 * Daily Operations Tutorial
 */
export const dailyOperationsSteps: TutorialStep[] = [
  {
    id: 'daily-intro',
    title: 'Daily Operations Checklist ✅',
    description: 'Here\'s a quick guide for your daily restaurant operations with GENFITY.',
    targetSelector: null,
    position: 'center',
    showSkip: true,
  },
  {
    id: 'daily-stock',
    title: 'Morning: Check Stock',
    description: 'Start your day by checking and updating stock levels. Items with zero stock will show as "Sold Out" to customers.',
    targetSelector: '[data-nav-item="/admin/dashboard/menu"]',
    position: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'daily-hours',
    title: 'Morning: Verify Hours',
    description: 'Make sure your opening hours are correct for today. Update them if you have special hours.',
    targetSelector: '[data-nav-item="/admin/dashboard/merchant/edit"]',
    position: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'daily-orders',
    title: 'During Service: Monitor Orders',
    description: 'Keep the orders page open during service. New orders will appear automatically with sound notifications.',
    targetSelector: '[data-nav-item="/admin/dashboard/orders"]',
    position: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'daily-revenue',
    title: 'End of Day: Check Revenue',
    description: 'Review your daily sales and order count. Export reports for your records.',
    targetSelector: '[data-nav-item="/admin/dashboard/revenue"]',
    position: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'daily-complete',
    title: 'Daily Routine Set! 📋',
    description: 'Follow this checklist daily for smooth operations. GENFITY makes it easy!',
    targetSelector: null,
    position: 'center',
  },
];
