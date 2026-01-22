'use client';

/**
 * Contextual Hint Component
 * 
 * @description Show hints based on user actions and page state
 * @features Auto-dismiss, localStorage persistence, action triggers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaLightbulb, FaTimes, FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import { useTutorial } from '../TutorialContext';
import type { TutorialId } from '../types';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';

export interface ContextualHintConfig {
  /** Unique identifier for this hint */
  id: string;
  /** Hint title */
  title: string;
  /** Hint message */
  message: string;
  /** Position on screen */
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Type of hint (affects styling) */
  type: 'tip' | 'info' | 'success' | 'warning';
  /** Related tutorial to start */
  relatedTutorial?: TutorialId;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Only show once (persisted to localStorage) */
  showOnce?: boolean;
  /** Trigger condition */
  trigger?: 'empty-state' | 'first-visit' | 'action-complete' | 'manual';
}

interface ContextualHintProps {
  config: ContextualHintConfig;
  onDismiss?: () => void;
  isVisible?: boolean;
}

const DISMISSED_HINTS_KEY = 'genfity_dismissed_hints';

// Get dismissed hints from localStorage
function getDismissedHints(): string[] {
  try {
    const stored = localStorage.getItem(DISMISSED_HINTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save dismissed hint to localStorage
function saveDismissedHint(hintId: string): void {
  try {
    const dismissed = getDismissedHints();
    if (!dismissed.includes(hintId)) {
      dismissed.push(hintId);
      localStorage.setItem(DISMISSED_HINTS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore storage errors
  }
}

export function ContextualHint({ config, onDismiss, isVisible = true }: ContextualHintProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { startTutorial, isOverlayVisible } = useTutorial();
  const title = tOr(t, `tutorial.contextualHints.${config.id}.title`, config.title);
  const message = tOr(t, `tutorial.contextualHints.${config.id}.message`, config.message);

  // Check if hint was already dismissed
  useEffect(() => {
    setMounted(true);

    if (config.showOnce) {
      const dismissed = getDismissedHints();
      if (dismissed.includes(config.id)) {
        return;
      }
    }

    // Delay showing hint for smooth entrance
    const timer = setTimeout(() => {
      if (isVisible && !isOverlayVisible) {
        setShow(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [config.id, config.showOnce, isVisible, isOverlayVisible]);

  // Auto-dismiss timer
  useEffect(() => {
    if (show && config.autoDismissMs && config.autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, config.autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [show, config.autoDismissMs]);

  // Hide if tutorial overlay is showing
  useEffect(() => {
    if (isOverlayVisible && show) {
      setShow(false);
    }
  }, [isOverlayVisible, show]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);

    if (config.showOnce) {
      saveDismissedHint(config.id);
    }

    setTimeout(() => {
      setShow(false);
      setIsExiting(false);
      onDismiss?.();
    }, 300);
  }, [config.id, config.showOnce, onDismiss]);

  const handleStartTutorial = useCallback(() => {
    if (config.relatedTutorial) {
      handleDismiss();
      setTimeout(() => {
        startTutorial(config.relatedTutorial!);
      }, 350);
    }
  }, [config.relatedTutorial, handleDismiss, startTutorial]);

  if (!mounted || !show || isOverlayVisible) {
    return null;
  }

  // Position classes - Responsive with smaller margins on mobile
  const positionClasses = {
    'bottom-right': 'bottom-3 right-3 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-3 left-3 sm:bottom-6 sm:left-6',
    'top-right': 'top-16 right-3 sm:top-20 sm:right-6',
    'top-left': 'top-16 left-3 sm:top-20 sm:left-6',
  };

  // Type styling
  const typeStyles = {
    tip: {
      icon: FaLightbulb,
      iconBg: 'bg-brand-100 dark:bg-brand-900/30',
      iconColor: 'text-brand-500',
      border: 'border-brand-200 dark:border-brand-800',
    },
    info: {
      icon: FaInfoCircle,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500',
      border: 'border-blue-200 dark:border-blue-800',
    },
    success: {
      icon: FaLightbulb,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-500',
      border: 'border-green-200 dark:border-green-800',
    },
    warning: {
      icon: FaInfoCircle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500',
      border: 'border-amber-200 dark:border-amber-800',
    },
  };

  const style = typeStyles[config.type];
  const IconComponent = style.icon;

  return createPortal(
    <div
      className={`fixed ${positionClasses[config.position]} z-50 
        w-[calc(100%-24px)] sm:w-auto sm:max-w-sm 
        transform transition-all duration-300 ease-out ${isExiting
          ? 'opacity-0 translate-y-2 scale-95'
          : 'opacity-100 translate-y-0 scale-100'
        }`}
      role="alert"
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border ${style.border} p-3 sm:p-4 animate-slide-up`}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Icon - Responsive */}
          <div className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 ${style.iconBg} rounded-full flex items-center justify-center`}>
            <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${style.iconColor}`} />
          </div>

          {/* Content - Responsive */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                {title}
              </h4>
              <button
                onClick={handleDismiss}
                className="shrink-0 p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors touch-manipulation"
              >
                <FaTimes className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5 sm:mt-1 leading-relaxed">
              {message}
            </p>

            {/* Action Button - Responsive */}
            {config.relatedTutorial && (
              <button
                onClick={handleStartTutorial}
                className="mt-2 sm:mt-3 inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors touch-manipulation"
              >
                <span>{t('tutorial.ui.startTutorial')}</span>
                <FaArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}

// ============================================
// CONTEXTUAL HINT MANAGER
// ============================================

interface HintManagerState {
  activeHints: ContextualHintConfig[];
}

type HintAction =
  | { type: 'SHOW_HINT'; hint: ContextualHintConfig }
  | { type: 'DISMISS_HINT'; hintId: string }
  | { type: 'CLEAR_ALL' };

const HintContext = React.createContext<{
  showHint: (hint: ContextualHintConfig) => void;
  dismissHint: (hintId: string) => void;
  clearAllHints: () => void;
} | null>(null);

export function ContextualHintProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, dispatch] = React.useReducer(
    (state: HintManagerState, action: HintAction): HintManagerState => {
      switch (action.type) {
        case 'SHOW_HINT':
          // Don't add duplicate hints
          if (state.activeHints.some(h => h.id === action.hint.id)) {
            return state;
          }
          return {
            ...state,
            activeHints: [...state.activeHints, action.hint],
          };
        case 'DISMISS_HINT':
          return {
            ...state,
            activeHints: state.activeHints.filter(h => h.id !== action.hintId),
          };
        case 'CLEAR_ALL':
          return { ...state, activeHints: [] };
        default:
          return state;
      }
    },
    { activeHints: [] }
  );

  // Clear all hints when route changes to prevent stacking
  React.useEffect(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, [pathname]);

  const showHint = useCallback((hint: ContextualHintConfig) => {
    // Check if already dismissed
    if (hint.showOnce) {
      const dismissed = getDismissedHints();
      if (dismissed.includes(hint.id)) {
        return;
      }
    }
    dispatch({ type: 'SHOW_HINT', hint });
  }, []);

  const dismissHint = useCallback((hintId: string) => {
    dispatch({ type: 'DISMISS_HINT', hintId });
  }, []);

  const clearAllHints = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <HintContext.Provider value={{ showHint, dismissHint, clearAllHints }}>
      {children}
      {/* Render active hints */}
      {state.activeHints.map((hint) => (
        <ContextualHint
          key={hint.id}
          config={hint}
          onDismiss={() => dismissHint(hint.id)}
        />
      ))}
    </HintContext.Provider>
  );
}

export function useContextualHint() {
  const context = React.useContext(HintContext);
  if (!context) {
    // Return no-op functions if outside provider
    return {
      showHint: () => { },
      dismissHint: () => { },
      clearAllHints: () => { },
    };
  }
  return context;
}

// ============================================
// PRE-DEFINED HINTS
// ============================================

export const CONTEXTUAL_HINTS = {
  // Menu page hints
  emptyMenu: {
    id: 'empty-menu-hint',
    title: 'No Menu Items Yet',
    message: 'Create your first menu item to start accepting orders. Would you like a quick tutorial?',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'create-menu' as TutorialId,
    showOnce: true,
    trigger: 'empty-state' as const,
  },
  firstMenuCreated: {
    id: 'first-menu-created',
    title: '🎉 Great Job!',
    message: 'You\'ve created your first menu item! Now add more items or set up addon categories for customizations.',
    position: 'bottom-right' as const,
    type: 'success' as const,
    relatedTutorial: 'create-addon-category' as TutorialId,
    autoDismissMs: 10000,
    showOnce: true,
    trigger: 'action-complete' as const,
  },
  menuWithoutCategory: {
    id: 'menu-without-category',
    title: 'Organize Your Menu',
    message: 'Your menu items have no categories yet. Create categories to help customers browse your menu easily.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'create-category' as TutorialId,
    showOnce: true,
    trigger: 'manual' as const,
  },
  menuImageTip: {
    id: 'menu-image-tip',
    title: 'Add Menu Images',
    message: 'Menu items with photos get 30% more orders! Upload appetizing images to attract customers.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'manual' as const,
  },

  // Category page hints
  emptyCategories: {
    id: 'empty-categories-hint',
    title: 'Organize Your Menu',
    message: 'Categories help customers find what they want. Create categories like "Main Course", "Drinks", "Desserts".',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'create-category' as TutorialId,
    showOnce: true,
    trigger: 'empty-state' as const,
  },
  categoryReorder: {
    id: 'category-reorder-tip',
    title: 'Drag to Reorder',
    message: 'You can drag and drop categories to change their display order. Most popular categories should be on top!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  categoryInactive: {
    id: 'category-inactive-warning',
    title: 'Inactive Categories',
    message: 'Some categories are inactive and won\'t be visible to customers. Click the status badge to toggle visibility.',
    position: 'bottom-right' as const,
    type: 'warning' as const,
    showOnce: false,
    trigger: 'manual' as const,
  },

  // Addon page hints
  emptyAddons: {
    id: 'empty-addons-hint',
    title: 'Add Customization Options',
    message: 'Addons let customers customize orders (sizes, toppings, spice levels). This can increase your average order value!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'create-addon-category' as TutorialId,
    showOnce: true,
    trigger: 'empty-state' as const,
  },
  addonCategoryFirstVisit: {
    id: 'addon-category-first-visit',
    title: 'Addon Categories',
    message: 'Create addon categories to group customization options. Examples: "Size", "Spice Level", "Extra Toppings".',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'create-addon-category' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  addonSelectionRules: {
    id: 'addon-selection-rules',
    title: 'Set Selection Rules',
    message: 'Use Min/Max selection to control addon choices. Set Min=1 to make selection required, or Max=1 for single-choice.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  addonLinkToMenu: {
    id: 'addon-link-menu',
    title: 'Link Addons to Menu',
    message: 'Don\'t forget to link addon categories to menu items! Click "Menu Relationship" to manage connections.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'link-addon-to-menu' as TutorialId,
    showOnce: true,
    trigger: 'action-complete' as const,
  },

  // QR Tables hints
  emptyQrTables: {
    id: 'empty-qr-tables-hint',
    title: 'Set Up Table Ordering',
    message: 'Generate QR codes for your tables so customers can order directly from their phones!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'qr-tables' as TutorialId,
    showOnce: true,
    trigger: 'empty-state' as const,
  },
  qrTablesFirstVisit: {
    id: 'qr-tables-first-visit',
    title: 'Table QR Codes',
    message: 'Generate unique QR codes for each table. Customers scan and order directly - no app download needed!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'qr-tables' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  qrPrintTip: {
    id: 'qr-print-tip',
    title: 'Print QR Codes',
    message: 'Use the "Print Size (512px)" option for best quality when printing. Download all codes at once with "Download All".',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Orders hints
  firstOrderReceived: {
    id: 'first-order-received',
    title: '🎊 First Order Received!',
    message: 'Congratulations! You received your first order. Click on it to see details and update the status.',
    position: 'top-right' as const,
    type: 'success' as const,
    relatedTutorial: 'active-orders' as TutorialId,
    autoDismissMs: 15000,
    showOnce: true,
    trigger: 'action-complete' as const,
  },
  orderKanbanTip: {
    id: 'order-kanban-tip',
    title: 'Drag & Drop Orders',
    message: 'Drag orders between columns to update their status. New → Preparing → Ready → Completed.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'active-orders' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  orderBulkMode: {
    id: 'order-bulk-mode',
    title: 'Bulk Update Mode',
    message: 'Use "Bulk Select" to select multiple orders and update their status at once!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'manual' as const,
  },
  orderFullscreen: {
    id: 'order-fullscreen-tip',
    title: 'Kitchen Display Mode',
    message: 'Click the fullscreen button for a distraction-free kitchen display view!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  ordersFirstVisit: {
    id: 'orders-first-visit',
    title: 'Manage Orders Here',
    message: 'This is your order management center. Drag orders between columns or use view modes for different layouts.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'active-orders' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  orderViewModes: {
    id: 'order-view-modes',
    title: 'Multiple View Modes',
    message: 'Switch between Kanban cards, list view, or tab view based on your preference. Try them all!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Stock hints
  lowStock: {
    id: 'low-stock-warning',
    title: 'Low Stock Alert',
    message: 'Some items are running low on stock. Update your inventory to prevent items from showing as sold out.',
    position: 'bottom-right' as const,
    type: 'warning' as const,
    relatedTutorial: 'stock-management' as TutorialId,
    showOnce: false,
    trigger: 'manual' as const,
  },
  stockDailyReset: {
    id: 'stock-daily-reset',
    title: 'Daily Stock Reset',
    message: 'Set up daily stock templates to automatically reset stock each day. Perfect for fresh items!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'stock-management' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Settings hints
  incompleteProfile: {
    id: 'incomplete-profile-hint',
    title: 'Complete Your Profile',
    message: 'Add your logo and complete your restaurant details to look more professional to customers.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'merchant-settings' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  merchantSettingsFirstVisit: {
    id: 'merchant-settings-first-visit',
    title: 'Configure Your Store',
    message: 'Set up your store profile, opening hours, payment settings, and more. A complete profile builds customer trust!',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'merchant-settings' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  openingHoursTip: {
    id: 'opening-hours-tip',
    title: 'Set Opening Hours',
    message: 'Configure your opening hours so customers know when they can order. You can set different hours for each day.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    relatedTutorial: 'opening-hours' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  saleModeTip: {
    id: 'sale-mode-tip',
    title: 'Configure Sale Modes',
    message: 'Enable dine-in and/or takeaway modes based on your business model. Each can have different hours.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  taxFeeTip: {
    id: 'tax-fee-tip',
    title: 'Set Up Fees & Charges',
    message: 'Add tax, service charge, or packaging fees. These will be automatically calculated in the checkout.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Revenue & Reports hints
  revenueFirstVisit: {
    id: 'revenue-first-visit',
    title: 'Track Your Revenue',
    message: 'See daily, weekly, and monthly sales analytics. Filter by date range to analyze performance.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'revenue-reports' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  exportReportsTip: {
    id: 'export-reports-tip',
    title: 'Export Your Data',
    message: 'Download reports as Excel files for accounting or further analysis. Click the Export button.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Staff management hints
  staffFirstVisit: {
    id: 'staff-first-visit',
    title: 'Manage Your Team',
    message: 'Add staff members with specific permissions. They can help manage orders without accessing sensitive settings.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'staff-management' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  staffPermissions: {
    id: 'staff-permissions-tip',
    title: 'Set Staff Permissions',
    message: 'Control what each staff member can do. Give order managers access to orders, and managers access to menu settings.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // General onboarding
  welcomeNewMerchant: {
    id: 'welcome-new-merchant',
    title: '👋 Welcome to GENFITY!',
    message: 'Let\'s set up your restaurant! Start by creating your first menu category, then add menu items.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'getting-started' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  dashboardOverview: {
    id: 'dashboard-overview',
    title: 'Your Dashboard',
    message: 'This is your command center! View today\'s orders, revenue, and quick stats at a glance.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'dashboard-overview' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  sidebarNavigation: {
    id: 'sidebar-navigation',
    title: 'Quick Navigation',
    message: 'Use the sidebar to navigate between sections. Click the hamburger icon to collapse it for more space.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  keyboardShortcuts: {
    id: 'keyboard-shortcuts',
    title: 'Pro Tip: Keyboard Shortcuts',
    message: 'Press "?" to see available keyboard shortcuts for faster navigation!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'manual' as const,
  },

  // Subscription hints
  subscriptionFirstVisit: {
    id: 'subscription-first-visit',
    title: 'Manage Your Subscription',
    message: 'View your current plan, balance, and transaction history. Choose between deposit-based or monthly subscription.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  subscriptionLowBalance: {
    id: 'subscription-low-balance',
    title: '⚠️ Low Balance Alert',
    message: 'Your balance is running low. Top up to continue receiving orders without interruption.',
    position: 'bottom-right' as const,
    type: 'warning' as const,
    showOnce: false,
    trigger: 'manual' as const,
  },
  subscriptionTrialEnding: {
    id: 'subscription-trial-ending',
    title: '📅 Trial Ending Soon',
    message: 'Your trial period is ending soon. Choose a subscription plan to continue using GENFITY.',
    position: 'bottom-right' as const,
    type: 'warning' as const,
    showOnce: true,
    trigger: 'manual' as const,
  },

  // Special Prices hints
  specialPricesFirstVisit: {
    id: 'special-prices-first-visit',
    title: 'Create Special Pricing',
    message: 'Set up happy hour, lunch specials, or weekend discounts. Prices automatically apply during specified times.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  specialPricesEmpty: {
    id: 'special-prices-empty',
    title: 'Boost Sales with Specials',
    message: 'Create special prices for different times or days. Perfect for happy hours, lunch deals, or weekend promotions!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'empty-state' as const,
  },

  // Menu Books hints
  menuBooksFirstVisit: {
    id: 'menu-books-first-visit',
    title: 'Organize with Menu Books',
    message: 'Create different menu books for different occasions - breakfast menu, dinner menu, seasonal specials, etc.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  menuBooksEmpty: {
    id: 'menu-books-empty',
    title: 'Create Your First Menu Book',
    message: 'Menu books help you organize items for different occasions or special pricing schedules.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'empty-state' as const,
  },

  // Orders Queue hints
  ordersQueueFirstVisit: {
    id: 'orders-queue-first-visit',
    title: 'Customer Queue Display',
    message: 'This screen shows READY orders with large order numbers. Perfect for TV displays in customer waiting areas!',
    position: 'top-right' as const,
    type: 'info' as const,
    relatedTutorial: 'orders-queue' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  ordersQueueSoundAlert: {
    id: 'orders-queue-sound',
    title: '🔔 Sound Notifications',
    message: 'New ready orders trigger a sound notification. Make sure your device allows audio playback!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  ordersQueueFullscreen: {
    id: 'orders-queue-fullscreen',
    title: '📺 Fullscreen Display',
    message: 'Use Clean Mode or Fullscreen for large TVs. Click the display mode button to cycle through options.',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'manual' as const,
  },

  // Kitchen Display hints
  kitchenFirstVisit: {
    id: 'kitchen-first-visit',
    title: 'Kitchen Display System',
    message: 'View and manage orders for kitchen staff. Orders are sorted by priority - oldest first!',
    position: 'top-right' as const,
    type: 'info' as const,
    relatedTutorial: 'kitchen-display' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
  kitchenTwoColumns: {
    id: 'kitchen-two-columns',
    title: 'Pending & Cooking',
    message: 'Left column: Pending orders waiting to cook. Right column: Currently cooking orders. Mark Ready when done!',
    position: 'bottom-right' as const,
    type: 'tip' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Merchant View hints
  merchantViewTip: {
    id: 'merchant-view-tip',
    title: 'Your Public Profile',
    message: 'This is how customers see your restaurant. Make sure your logo, description, and hours are up to date!',
    position: 'bottom-right' as const,
    type: 'info' as const,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Customers Management hints (Super Admin)
  customersFirstVisit: {
    id: 'customers-first-visit',
    title: 'Customer Management',
    message: 'View and manage all registered customers. Search, filter, and see order history for each customer.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'customers-management' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },

  // Super Admin Analytics hints
  superadminAnalyticsFirstVisit: {
    id: 'superadmin-analytics-first-visit',
    title: 'Platform Analytics',
    message: 'View platform-wide metrics: total merchants, orders, revenue, and growth trends across all restaurants.',
    position: 'bottom-right' as const,
    type: 'info' as const,
    relatedTutorial: 'superadmin-analytics' as TutorialId,
    showOnce: true,
    trigger: 'first-visit' as const,
  },
};

export default ContextualHint;
