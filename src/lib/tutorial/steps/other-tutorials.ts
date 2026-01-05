/**
 * Other Feature Tutorials
 * Staff management, special prices, menu books, and more
 */

import type { TutorialStep } from '../types';

// ============================================
// STAFF MANAGEMENT TUTORIAL
// ============================================

export const staffManagementSteps: TutorialStep[] = [
  {
    id: 'go-to-staff',
    title: 'Go to Staff Management',
    description: 'Manage your team: add staff members, assign roles, and control access permissions.',
    targetSelector: '[data-nav-item="/admin/dashboard/staff"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Staff',
    navigateTo: '/admin/dashboard/staff',
  },
  {
    id: 'staff-overview',
    title: 'Staff List',
    description: 'View all staff members and their roles: Owner, Manager, Cashier, Kitchen Staff, etc.',
    targetSelector: '[data-tutorial="staff-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'add-staff',
    title: 'Add Staff Member',
    description: 'Click this button to invite a new team member. They\'ll receive an email to set up their account.',
    targetSelector: '[data-tutorial="add-staff-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'staff-email',
    title: 'Enter Email',
    description: 'Enter the staff member\'s email address. They\'ll receive an invitation to join your store.',
    targetSelector: '[data-tutorial="staff-email-input"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'staff-role',
    title: 'Assign Role',
    description: 'Select their role:\n• Manager: Full access except billing\n• Cashier: Orders & payments\n• Kitchen: Kitchen display only',
    targetSelector: '[data-tutorial="staff-role-select"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'staff-permissions',
    title: 'Set Permissions',
    description: 'Fine-tune access: which features can this staff member use? Customize based on their responsibilities.',
    targetSelector: '[data-tutorial="staff-permissions"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'send-invite',
    title: 'Send Invitation',
    description: 'Click "Send Invite" to email the staff member. They\'ll create a password and can start working immediately!',
    targetSelector: '[data-tutorial="send-invite-btn"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'manage-staff',
    title: 'Manage Existing Staff',
    description: 'Click on a staff member to edit their role, update permissions, or remove access.',
    targetSelector: '[data-tutorial="staff-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'staff-complete',
    title: 'Staff Management Complete! 👥',
    description: 'Your team can now access the dashboard with their assigned permissions. Each staff member uses their own login.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// SPECIAL PRICES TUTORIAL
// ============================================

export const specialPricesSteps: TutorialStep[] = [
  {
    id: 'go-to-special-prices',
    title: 'Go to Special Prices',
    description: 'Create time-based discounts: happy hour, lunch specials, weekend deals, and promotional pricing.',
    targetSelector: '[data-nav-item="/admin/dashboard/special-prices"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Special Prices',
    navigateTo: '/admin/dashboard/special-prices',
  },
  {
    id: 'special-prices-overview',
    title: 'Special Prices List',
    description: 'View all your scheduled price changes. Active specials are highlighted.',
    targetSelector: '[data-tutorial="special-prices-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'add-special-price',
    title: 'Create Special Price',
    description: 'Click to create a new special price or promotion for your menu items.',
    targetSelector: '[data-tutorial="add-special-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'select-items',
    title: 'Select Menu Items',
    description: 'Choose which items this special applies to. You can select individual items or entire categories.',
    targetSelector: '[data-tutorial="special-items-select"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'discount-type',
    title: 'Set Discount Type',
    description: 'Choose discount type:\n• Percentage off (e.g., 20% off)\n• Fixed amount off (e.g., $2 off)\n• Fixed price (e.g., all $5)',
    targetSelector: '[data-tutorial="discount-type"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'schedule',
    title: 'Set Schedule',
    description: 'Define when this special is active: specific days, time range (e.g., 2-5 PM), or date range.',
    targetSelector: '[data-tutorial="special-schedule"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'special-name',
    title: 'Name Your Special',
    description: 'Give it a catchy name customers will see: "Happy Hour", "Lunch Deal", "Weekend Special", etc.',
    targetSelector: '[data-tutorial="special-name"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'save-special',
    title: 'Save Special Price',
    description: 'Click "Save" to activate. The discounted prices will automatically appear during the scheduled times!',
    targetSelector: '[data-tutorial="save-special-btn"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'special-complete',
    title: 'Special Prices Complete! 🎉',
    description: 'Your special pricing is set! Customers will see discounted prices during the scheduled times.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// MENU BOOKS TUTORIAL
// ============================================

export const menuBooksSteps: TutorialStep[] = [
  {
    id: 'go-to-menu-books',
    title: 'Go to Menu Books',
    description: 'Create different menus for different occasions: Dine-in Menu, Takeaway Menu, Catering Menu, etc.',
    targetSelector: '[data-nav-item="/admin/dashboard/menu-books"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Menu Books',
    navigateTo: '/admin/dashboard/menu-books',
  },
  {
    id: 'menu-books-overview',
    title: 'Menu Books List',
    description: 'Each "menu book" is a separate menu with its own items and settings. Useful for different service types.',
    targetSelector: '[data-tutorial="menu-books-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'create-menu-book',
    title: 'Create Menu Book',
    description: 'Click to create a new menu book. Examples: "Dine-in", "Takeaway", "Delivery Only", "Catering".',
    targetSelector: '[data-tutorial="add-menu-book-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'menu-book-name',
    title: 'Name Your Menu Book',
    description: 'Give a descriptive name that helps you and customers understand this menu\'s purpose.',
    targetSelector: '[data-tutorial="menu-book-name"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'select-menu-items',
    title: 'Select Items',
    description: 'Choose which menu items to include in this menu book. You can have different items per menu.',
    targetSelector: '[data-tutorial="menu-book-items"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'menu-book-settings',
    title: 'Menu Book Settings',
    description: 'Configure: which QR codes show this menu, ordering availability, and display preferences.',
    targetSelector: '[data-tutorial="menu-book-settings"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'save-menu-book',
    title: 'Save Menu Book',
    description: 'Click "Save" to create your menu book. You can then assign it to specific tables or services.',
    targetSelector: '[data-tutorial="save-menu-book-btn"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'menu-books-complete',
    title: 'Menu Books Complete! 📚',
    description: 'Create multiple menu books for different occasions. Each can have different items and pricing!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// LINK MENU TO ADDON TUTORIAL
// ============================================

export const linkMenuToAddonSteps: TutorialStep[] = [
  {
    id: 'go-to-menu',
    title: 'Go to Menu Items',
    description: 'Let\'s link addon categories to your menu items so customers can customize their orders.',
    targetSelector: '[data-nav-item="/admin/dashboard/menu"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Menu',
    navigateTo: '/admin/dashboard/menu',
  },
  {
    id: 'find-menu-item',
    title: 'Find Menu Item',
    description: 'Locate the menu item you want to add customization options to.',
    targetSelector: '[data-tutorial="menu-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'click-edit-menu',
    title: 'Edit Menu Item',
    description: 'Click the menu button (⋮) and select "Edit" to modify this menu item.',
    targetSelector: '[data-tutorial="menu-card-menu-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'addon-section',
    title: 'Addon Categories Section',
    description: 'Scroll down to the "Addon Categories" section in the edit form.',
    targetSelector: '[data-tutorial="menu-addon-section"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'select-addons',
    title: 'Select Addon Categories',
    description: 'Check the addon categories you want to offer for this item. Customers will see these options when ordering.',
    targetSelector: '[data-tutorial="menu-addon-checkboxes"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'save-menu-with-addons',
    title: 'Save Changes',
    description: 'Click "Save" to apply. This menu item now has customization options!',
    targetSelector: '[data-tutorial="menu-save-btn"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'link-complete',
    title: 'Addon Linked! 🔗',
    description: 'Customers can now customize this item with your addon options. Test it by viewing your customer menu!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
