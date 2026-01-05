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
} from './order-tutorials';

// Reports & Revenue Tutorials
export {
  revenueDashboardSteps,
  reportsSteps,
  analyticsSteps,
} from './reports-tutorials';

// Other Tutorials
export {
  staffManagementSteps,
  specialPricesSteps,
  menuBooksSteps,
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
