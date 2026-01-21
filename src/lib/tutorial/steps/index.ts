/**
 * Tutorial Steps Index
 * Central export for all tutorial step definitions
 */

// Onboarding Tutorial
export { onboardingSteps } from './onboarding';

// Menu Tutorials
export {
  createMenuSteps,
  editMenuSteps,
  menuBuilderSteps,
  bulkUploadMenuSteps,
} from './menu-tutorials';

// Category Tutorials
export {
  createCategorySteps,
  editCategorySteps,
} from './category-tutorials';

// Addon Tutorials
export {
  createAddonCategorySteps,
  createAddonItemSteps,
  editAddonSteps,
  bulkUploadAddonSteps,
} from './addon-tutorials';

// Settings & Configuration Tutorials
export {
  merchantSettingsSteps,
  qrTableCodesSteps,
  stockManagementSteps,
} from './settings-tutorials';

// Order Management Tutorials
export {
  activeOrdersSteps,
  kitchenDisplaySteps,
  orderHistorySteps,
  ordersQueueSteps,
} from './order-tutorials';
export { reservationsSteps } from './reservations-tutorials';

// Reports & Revenue Tutorials
export {
  revenueDashboardSteps,
  reportsSteps,
  analyticsSteps,
  superAdminAnalyticsSteps,
} from './reports-tutorials';

// Other Tutorials
export {
  staffManagementSteps,
  specialPricesSteps,
  specialPriceFormSteps,
  menuBooksSteps,
  menuBookFormSteps,
  customersManagementSteps,
  linkMenuToAddonSteps,
} from './other-tutorials';

// Quick Tips & Advanced Tutorials
export {
  keyboardShortcutsSteps,
  bulkOperationsSteps,
  searchFilterSteps,
  darkModeSteps,
  mobileUsageSteps,
  viewModesSteps,
  dailyOperationsSteps,
} from './quick-tips';
