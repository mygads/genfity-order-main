'use client';

/**
 * Click Here Hint Component
 * 
 * @description Interactive hint that highlights a button/element with "Click Here" prompt
 * @features Button highlighting, animated border, dismissible, action tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaArrowRight, FaHandPointer } from 'react-icons/fa';
import { useTutorial } from '../TutorialContext';
import type { TutorialId } from '../types';

export interface ClickHereHintConfig {
  /** Unique ID for this hint */
  id: string;
  /** CSS selector of target button/element */
  targetSelector: string;
  /** Main message */
  message: string;
  /** Sub-text (optional) */
  subText?: string;
  /** Position of the tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Related tutorial to start on click (optional) */
  relatedTutorial?: TutorialId;
  /** Show only once per session/forever */
  showOnce?: boolean;
  /** Show animated pointer */
  showPointer?: boolean;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Highlight style */
  highlightStyle?: 'ring' | 'glow' | 'pulse';
}

interface ClickHereHintProps {
  config: ClickHereHintConfig;
  onDismiss?: () => void;
  onButtonClick?: () => void;
}

const DISMISSED_CLICK_HINTS_KEY = 'genfity_dismissed_click_hints';

// Get dismissed hints from localStorage
function getDismissedHints(): string[] {
  try {
    const stored = localStorage.getItem(DISMISSED_CLICK_HINTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save dismissed hint
function saveDismissedHint(hintId: string): void {
  try {
    const dismissed = getDismissedHints();
    if (!dismissed.includes(hintId)) {
      dismissed.push(hintId);
      localStorage.setItem(DISMISSED_CLICK_HINTS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore storage errors
  }
}

export function ClickHereHint({ config, onDismiss, onButtonClick }: ClickHereHintProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const { startTutorial, isOverlayVisible } = useTutorial();

  // Calculate target element position
  const calculatePosition = useCallback(() => {
    const element = document.querySelector(config.targetSelector);
    if (!element) {
      setTargetRect(null);
      return;
    }
    setTargetRect(element.getBoundingClientRect());
  }, [config.targetSelector]);

  // Check if hint was already dismissed
  useEffect(() => {
    setMounted(true);
    
    if (config.showOnce) {
      const dismissed = getDismissedHints();
      if (dismissed.includes(config.id)) {
        return;
      }
    }
    
    // Delay showing hint
    const timer = setTimeout(() => {
      if (!isOverlayVisible) {
        setShow(true);
        calculatePosition();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [config.id, config.showOnce, isOverlayVisible, calculatePosition]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!show) return;

    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [show, calculatePosition]);

  // Auto-dismiss timer
  useEffect(() => {
    if (show && config.autoDismissMs && config.autoDismissMs > 0) {
      const timer = setTimeout(() => handleDismiss(), config.autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [show, config.autoDismissMs]);

  // Hide if tutorial overlay is showing
  useEffect(() => {
    if (isOverlayVisible && show) {
      setShow(false);
    }
  }, [isOverlayVisible, show]);

  // Add highlight class to target element
  useEffect(() => {
    if (!show || !targetRect) return;

    const element = document.querySelector(config.targetSelector);
    if (!element) return;

    // Add highlight styles
    const highlightClass = {
      ring: 'tutorial-highlight-ring',
      glow: 'tutorial-highlight-glow',
      pulse: 'tutorial-highlight-pulse',
    }[config.highlightStyle || 'ring'];

    element.classList.add(highlightClass, 'tutorial-highlight-active');

    // Add click listener
    const handleClick = () => {
      onButtonClick?.();
      handleDismiss();
      if (config.relatedTutorial) {
        setTimeout(() => startTutorial(config.relatedTutorial!), 300);
      }
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.classList.remove(highlightClass, 'tutorial-highlight-active');
      element.removeEventListener('click', handleClick);
    };
  }, [show, targetRect, config.targetSelector, config.highlightStyle, config.relatedTutorial, onButtonClick, startTutorial]);

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

  if (!mounted || !show || !targetRect || isOverlayVisible) {
    return null;
  }

  // Calculate tooltip position
  const position = config.position || 'bottom';
  let tooltipStyle: React.CSSProperties = {};
  let arrowClass = '';

  const OFFSET = 12;

  switch (position) {
    case 'top':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top - OFFSET,
        transform: 'translate(-50%, -100%)',
      };
      arrowClass = 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-brand-500 border-l-transparent border-r-transparent border-b-transparent';
      break;
    case 'bottom':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.bottom + OFFSET,
        transform: 'translate(-50%, 0)',
      };
      arrowClass = 'top-[-6px] left-1/2 -translate-x-1/2 border-b-brand-500 border-l-transparent border-r-transparent border-t-transparent';
      break;
    case 'left':
      tooltipStyle = {
        left: targetRect.left - OFFSET,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translate(-100%, -50%)',
      };
      arrowClass = 'right-[-6px] top-1/2 -translate-y-1/2 border-l-brand-500 border-t-transparent border-b-transparent border-r-transparent';
      break;
    case 'right':
      tooltipStyle = {
        left: targetRect.right + OFFSET,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translate(0, -50%)',
      };
        arrowClass = 'left-[-6px] top-1/2 -translate-y-1/2 border-r-brand-500 border-t-transparent border-b-transparent border-l-transparent';
      break;
  }

  return createPortal(
    <>
      {/* Animated Highlight Ring around target - Responsive sizing */}
      <div
        className="fixed pointer-events-none z-9998"
        style={{
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      >
        <div className="absolute inset-0 rounded-lg border-2 border-brand-500 animate-pulse" />
        <div className="absolute -inset-1 rounded-xl border-2 border-brand-500/50 animate-ping" style={{ animationDuration: '1.5s' }} />
      </div>

      {/* Animated Pointer - Responsive */}
      {config.showPointer && (
        <div
          className="fixed z-9999 pointer-events-none"
          style={{
            left: targetRect.left + targetRect.width / 2,
            top: targetRect.top - 16,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="relative">
            <FaHandPointer className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500 animate-bounce drop-shadow-lg" style={{ transform: 'rotate(-30deg)' }} />
          </div>
        </div>
      )}

      {/* Tooltip - Responsive */}
      <div
        className={`fixed z-10000 transition-all duration-300 ease-out ${
          isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={tooltipStyle}
      >
        <div className="relative bg-brand-500 text-white rounded-lg shadow-xl px-3 py-2 sm:px-4 sm:py-3 max-w-55 sm:max-w-70">
          {/* Close Button - Touch friendly */}
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-white text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <FaTimes className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>

          {/* Content - Responsive text */}
          <div className="flex items-start gap-1.5 sm:gap-2">
            <FaHandPointer className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">{config.message}</p>
              {config.subText && (
                <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 sm:mt-1">{config.subText}</p>
              )}
            </div>
          </div>

          {/* Click to continue prompt - Hidden on very small screens */}
          <div className="mt-1.5 sm:mt-2 hidden xs:flex items-center gap-1 text-[10px] sm:text-xs text-white/70">
            <span>Click the button to continue</span>
            <FaArrowRight className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </div>

          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-[5px] sm:border-[6px] ${arrowClass}`} />
        </div>
      </div>
    </>,
    document.body
  );
}

// ============================================
// CLICK HINT MANAGER (Context-based)
// ============================================

interface ClickHintManagerState {
  activeHints: ClickHereHintConfig[];
}

type ClickHintAction =
  | { type: 'SHOW_HINT'; hint: ClickHereHintConfig }
  | { type: 'DISMISS_HINT'; hintId: string }
  | { type: 'CLEAR_ALL' };

const ClickHintContext = React.createContext<{
  showClickHint: (hint: ClickHereHintConfig) => void;
  dismissClickHint: (hintId: string) => void;
  clearAllClickHints: () => void;
} | null>(null);

export function ClickHereHintProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(
    (state: ClickHintManagerState, action: ClickHintAction): ClickHintManagerState => {
      switch (action.type) {
        case 'SHOW_HINT':
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

  const showClickHint = useCallback((hint: ClickHereHintConfig) => {
    if (hint.showOnce) {
      const dismissed = getDismissedHints();
      if (dismissed.includes(hint.id)) {
        return;
      }
    }
    dispatch({ type: 'SHOW_HINT', hint });
  }, []);

  const dismissClickHint = useCallback((hintId: string) => {
    dispatch({ type: 'DISMISS_HINT', hintId });
  }, []);

  const clearAllClickHints = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <ClickHintContext.Provider value={{ showClickHint, dismissClickHint, clearAllClickHints }}>
      {children}
      {state.activeHints.map((hint) => (
        <ClickHereHint
          key={hint.id}
          config={hint}
          onDismiss={() => dismissClickHint(hint.id)}
        />
      ))}
    </ClickHintContext.Provider>
  );
}

export function useClickHereHint() {
  const context = React.useContext(ClickHintContext);
  if (!context) {
    return {
      showClickHint: () => {},
      dismissClickHint: () => {},
      clearAllClickHints: () => {},
    };
  }
  return context;
}

// ============================================
// PRE-DEFINED CLICK HINTS
// ============================================

export const CLICK_HINTS = {
  // Categories page
  addCategoryButton: {
    id: 'click-add-category',
    targetSelector: '[data-tutorial="add-category-btn"]',
    message: 'Click here to add a category!',
    subText: 'Categories help organize your menu',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
    relatedTutorial: 'create-category' as TutorialId,
  },

  // Menu page
  addMenuButton: {
    id: 'click-add-menu',
    targetSelector: '[data-tutorial="add-menu-btn"]',
    message: 'Click here to add a menu item!',
    subText: 'Create delicious items for your customers',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
    relatedTutorial: 'create-menu' as TutorialId,
  },

  // Addon categories page
  addAddonCategoryButton: {
    id: 'click-add-addon-category',
    targetSelector: '[data-tutorial="add-addon-category-btn"]',
    message: 'Click here to create an addon category!',
    subText: 'Group your customization options',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
    relatedTutorial: 'create-addon-category' as TutorialId,
  },

  // Addon items page
  addAddonItemButton: {
    id: 'click-add-addon-item',
    targetSelector: '[data-tutorial="add-addon-item-btn"]',
    message: 'Click here to add addon items!',
    subText: 'Add sizes, toppings, extras, etc.',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
    relatedTutorial: 'create-addon-item' as TutorialId,
  },

  // Staff page
  addStaffButton: {
    id: 'click-add-staff',
    targetSelector: '[data-tutorial="add-staff-btn"]',
    message: 'Click here to add team members!',
    subText: 'Give your staff access to the system',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
    relatedTutorial: 'staff-management' as TutorialId,
  },

  // Orders page
  orderViewModesButton: {
    id: 'click-order-view-modes',
    targetSelector: '[data-tutorial="order-view-modes"]',
    message: 'Try different view modes!',
    subText: 'Switch between Kanban, list, or tab views',
    position: 'bottom' as const,
    showPointer: true,
    showOnce: true,
  },

  orderFullscreenButton: {
    id: 'click-order-fullscreen',
    targetSelector: '[data-tutorial="order-fullscreen"]',
    message: 'Go fullscreen for kitchen display!',
    subText: 'Perfect for kitchen screens',
    position: 'left' as const,
    showPointer: true,
    showOnce: true,
  },

  // QR Tables
  qrDownloadAllButton: {
    id: 'click-qr-download-all',
    targetSelector: '[data-tutorial="qr-download-all"]',
    message: 'Download all QR codes at once!',
    subText: 'Print them for your tables',
    position: 'top' as const,
    showPointer: true,
    showOnce: true,
  },

  // Revenue page
  exportRevenueButton: {
    id: 'click-export-revenue',
    targetSelector: '[data-tutorial="revenue-export-btn"]',
    message: 'Export your revenue data!',
    subText: 'Download as Excel for accounting',
    position: 'left' as const,
    showPointer: true,
    showOnce: true,
  },

  // Reports page
  exportReportsButton: {
    id: 'click-export-reports',
    targetSelector: '[data-tutorial="reports-export-btn"]',
    message: 'Export detailed reports!',
    subText: 'Get comprehensive sales data',
    position: 'left' as const,
    showPointer: true,
    showOnce: true,
  },
};

export default ClickHereHint;
