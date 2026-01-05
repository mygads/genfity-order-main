/**
 * Tutorial System Types
 * 
 * @description Type definitions for the interactive tutorial/onboarding system
 * @specification copilot-instructions.md - UI/UX Standards
 */

export type TutorialId = 
  // Onboarding
  | 'onboarding'              // First-time merchant onboarding
  // Categories
  | 'create-category'         // How to create a category
  | 'edit-category'           // How to edit a category
  // Menu Items
  | 'create-menu'             // How to create a menu item
  | 'edit-menu'               // How to edit a menu item
  | 'menu-builder'            // Use visual menu builder
  | 'bulk-upload-menu'        // Bulk upload menu items
  | 'link-menu-to-addon'      // Link addons to menu items
  // Addons
  | 'create-addon-category'   // Create addon category
  | 'create-addon-item'       // Create addon items
  | 'edit-addon'              // Edit addon items
  | 'bulk-upload-addon'       // Bulk upload addon items
  // Settings & Configuration
  | 'merchant-settings'       // Configure merchant settings
  | 'opening-hours'           // Configure opening hours
  | 'qr-tables'               // Set up QR codes for tables
  | 'stock-management'        // Manage stock overview
  // Order Management
  | 'active-orders'           // Active orders management
  | 'kitchen-display'         // Kitchen display system
  | 'order-history'           // View order history
  | 'orders-queue'            // Queue/lounge display for ready orders
  // Reports & Analytics
  | 'revenue-dashboard'       // View revenue dashboard
  | 'revenue-reports'         // Revenue reports
  | 'reports'                 // Generate reports
  | 'analytics'               // Analytics insights
  | 'superadmin-analytics'    // Super admin analytics dashboard
  // Other Features
  | 'staff-management'        // Manage staff accounts
  | 'special-prices'          // Special pricing & discounts
  | 'special-price-form'      // Special price create/edit form
  | 'menu-books'              // Menu books management
  | 'menu-book-form'          // Menu book create/edit form
  | 'customers-management'    // Customer management (super admin)
  | 'link-addon-to-menu'      // Link addon categories to menu items
  | 'getting-started'         // Getting started guide
  | 'dashboard-overview'      // Dashboard overview
  // Quick Tips
  | 'keyboard-shortcuts'      // Keyboard shortcuts tutorial
  | 'bulk-operations'         // Bulk operations guide
  | 'search-filter'           // Search and filter guide
  | 'dark-mode'               // Dark mode tutorial
  | 'mobile-usage'            // Mobile usage tips
  | 'view-modes'              // Different view modes
  | 'daily-operations';       // Daily operations checklist

export type TutorialStepPosition = 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | 'center'; // For modal-style steps without target

export interface TutorialStep {
  /** Unique step ID within the tutorial */
  id: string;
  /** Title of this step */
  title: string;
  /** Description/instruction for this step */
  description: string;
  /** CSS selector or element ID to highlight (null for center modal) */
  targetSelector: string | null;
  /** Preferred position of the tooltip relative to target */
  position: TutorialStepPosition;
  /** Optional action button text (e.g., "Try it now") */
  actionText?: string;
  /** Optional callback when action is clicked */
  onAction?: () => void;
  /** Whether this step requires user interaction before proceeding */
  requiresInteraction?: boolean;
  /** Path to navigate to for this step (optional) */
  navigateTo?: string;
  /** Custom spotlight padding around target element */
  spotlightPadding?: number;
  /** Optional image/icon to show in tooltip */
  image?: string;
  /** Whether to show a "Skip Tutorial" option */
  showSkip?: boolean;
  /** Show animated pointer pointing to target */
  showPointer?: boolean;
  /** Direction of animated pointer */
  pointerDirection?: 'up' | 'down' | 'left' | 'right';
  /** Custom pointer label (e.g., "Click here!") */
  pointerLabel?: string;
  /** Custom icon for pointer (react-icons/fa name) */
  pointerIcon?: string;
  /** Delay before showing step (ms) - for complex transitions */
  delay?: number;
}

export interface Tutorial {
  /** Unique tutorial identifier */
  id: TutorialId;
  /** Display name */
  name: string;
  /** Short description for hint panel */
  description: string;
  /** Icon component name (from react-icons/fa) */
  icon: string;
  /** Tutorial steps */
  steps: TutorialStep[];
  /** Roles that can access this tutorial */
  roles: ('MERCHANT_OWNER' | 'MERCHANT_STAFF')[];
  /** Staff permissions required (for staff role) */
  requiredPermissions?: string[];
  /** Whether this is part of first-time onboarding */
  isOnboarding?: boolean;
  /** Order in hint list */
  order: number;
  /** Estimated time in minutes */
  estimatedTime?: number;
}

/**
 * Tutorial progress stored in DB/localStorage
 */
export interface TutorialProgress {
  /** Whether onboarding has been completed */
  hasCompletedOnboarding: boolean;
  /** List of completed tutorial IDs */
  completedTutorials: TutorialId[];
  /** Last dismissed hint timestamp */
  lastHintDismissedAt: Date | null;
}

/**
 * Tutorial state for React context
 */
export interface TutorialState {
  /** Active tutorial object (null if none) */
  activeTutorial: Tutorial | null;
  /** Current step index in active tutorial */
  currentStepIndex: number;
  /** Whether tutorial overlay is visible */
  isOverlayVisible: boolean;
  /** Whether onboarding has been completed */
  hasCompletedOnboarding: boolean;
  /** List of completed tutorial IDs */
  completedTutorials: TutorialId[];
  /** Whether hint panel is visible */
  showHintPanel: boolean;
  /** Last dismissed hint timestamp */
  lastHintDismissedAt: Date | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Tutorial context value with state and actions
 */
export interface TutorialContextValue {
  // State
  activeTutorial: Tutorial | null;
  currentStep: TutorialStep | null;
  currentStepIndex: number;
  isOverlayVisible: boolean;
  hasCompletedOnboarding: boolean;
  completedTutorials: TutorialId[];
  showHintPanel: boolean;
  isLoading: boolean;
  availableTutorials: Tutorial[];
  completionPercentage: number;

  // Actions
  startTutorial: (tutorialId: TutorialId) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  toggleHintPanel: () => void;
  dismissHint: () => void;
  resetTutorials: () => void;
  isTutorialCompleted: (tutorialId: TutorialId) => boolean;
}
