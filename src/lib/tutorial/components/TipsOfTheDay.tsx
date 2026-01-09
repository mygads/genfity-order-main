'use client';

/**
 * Tips of the Day Component
 * 
 * @description Rotating daily tips to help users learn features progressively.
 * Uses localStorage to track daily tip index and dismissed state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaLightbulb, FaTimes, FaArrowRight, FaArrowLeft, FaPlay } from 'react-icons/fa';
import { useRouter, usePathname } from 'next/navigation';
import { useTutorial } from '../TutorialContext';
import { getTutorialById } from '../tutorials';
import type { TutorialId } from '../types';

// ============================================
// TIPS DATA
// ============================================

export interface Tip {
  id: string;
  title: string;
  message: string;
  category: 'productivity' | 'feature' | 'shortcut' | 'best-practice';
  relatedTutorial?: TutorialId;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Collection of daily tips
 * The component rotates through these based on the current date
 */
export const DAILY_TIPS: Tip[] = [
  // Productivity Tips
  {
    id: 'tip-keyboard-nav',
    title: 'Navigate Faster with Keyboard',
    message: 'Press "?" anywhere in the dashboard to see all available keyboard shortcuts. Use arrow keys to navigate between menu items quickly.',
    category: 'shortcut',
    relatedTutorial: 'keyboard-shortcuts',
  },
  {
    id: 'tip-bulk-operations',
    title: 'Bulk Operations Save Time',
    message: 'Select multiple items by holding Ctrl/Cmd and clicking. Then use the bulk action toolbar to update, delete, or export all at once.',
    category: 'productivity',
    relatedTutorial: 'bulk-operations',
  },
  {
    id: 'tip-search-filter',
    title: 'Use Advanced Search',
    message: 'The search bar supports filters! Try typing "active:true" or "price:>10" to find specific items quickly.',
    category: 'feature',
    relatedTutorial: 'search-filter',
  },
  {
    id: 'tip-dark-mode',
    title: 'Reduce Eye Strain',
    message: 'Switch to dark mode for comfortable viewing at night. Click the theme toggle in the header or press Ctrl+Shift+D.',
    category: 'shortcut',
    relatedTutorial: 'dark-mode',
  },
  // Feature Tips
  {
    id: 'tip-menu-categories',
    title: 'Organize Your Menu',
    message: 'Group menu items into categories like "Appetizers", "Main Course", "Drinks" to help customers browse easily.',
    category: 'best-practice',
    relatedTutorial: 'create-category',
  },
  {
    id: 'tip-addon-categories',
    title: 'Increase Order Value with Addons',
    message: 'Create addon categories like "Extra Toppings" or "Meal Upgrades". Restaurants with addons see 25% higher average order values!',
    category: 'best-practice',
    relatedTutorial: 'create-addon-category',
  },
  {
    id: 'tip-qr-tables',
    title: 'Enable Contactless Ordering',
    message: 'Generate QR codes for each table. Customers scan and order directly from their phones - no app needed!',
    category: 'feature',
    relatedTutorial: 'qr-tables',
  },
  {
    id: 'tip-stock-management',
    title: 'Never Oversell Again',
    message: 'Enable stock tracking to automatically hide items when sold out. Set daily templates for fresh items that reset each morning.',
    category: 'feature',
    relatedTutorial: 'stock-management',
  },
  {
    id: 'tip-order-kanban',
    title: 'Manage Orders Visually',
    message: 'Use the Kanban view to drag orders between columns: New → Preparing → Ready → Completed. Perfect for busy kitchens!',
    category: 'productivity',
    relatedTutorial: 'active-orders',
  },
  {
    id: 'tip-opening-hours',
    title: 'Set Your Opening Hours',
    message: 'Configure different hours for each day. You can even set special hours for holidays and temporarily close for breaks.',
    category: 'feature',
    relatedTutorial: 'opening-hours',
  },
  // Best Practice Tips
  {
    id: 'tip-menu-images',
    title: 'Photos Boost Sales',
    message: 'Menu items with high-quality photos get 30% more orders. Take bright, appetizing photos with a clean background.',
    category: 'best-practice',
  },
  {
    id: 'tip-descriptions',
    title: 'Write Enticing Descriptions',
    message: 'Use descriptive words like "crispy", "tender", "homemade" in menu descriptions. Avoid just listing ingredients.',
    category: 'best-practice',
  },
  {
    id: 'tip-pricing-strategy',
    title: 'Smart Pricing Tips',
    message: 'Use charm pricing ($9.99 instead of $10). Group items into value bundles. Highlight popular items as "Chef\'s Choice".',
    category: 'best-practice',
  },
  {
    id: 'tip-revenue-reports',
    title: 'Track Your Performance',
    message: 'Check the Revenue page weekly to identify your best-selling items and peak hours. Use this data to optimize your menu.',
    category: 'productivity',
    relatedTutorial: 'revenue-reports',
  },
  // Shortcut Tips
  {
    id: 'tip-quick-actions',
    title: 'Quick Action Shortcuts',
    message: 'Press "N" to create new items, "E" to edit selected item, "D" to duplicate. These work on all list pages.',
    category: 'shortcut',
    relatedTutorial: 'keyboard-shortcuts',
  },
  {
    id: 'tip-fullscreen-mode',
    title: 'Kitchen Display Mode',
    message: 'Press F11 for fullscreen mode - perfect for a dedicated kitchen display. The order board auto-refreshes every 30 seconds.',
    category: 'shortcut',
  },
  {
    id: 'tip-export-data',
    title: 'Export Your Data',
    message: 'Click the Export button on any page to download your data as Excel. Great for accounting and analysis.',
    category: 'productivity',
  },
  {
    id: 'tip-mobile-app',
    title: 'Works on Mobile Too',
    message: 'The dashboard is fully responsive! Add it to your home screen for quick access when you\'re away from the computer.',
    category: 'feature',
    relatedTutorial: 'mobile-usage',
  },
  {
    id: 'tip-staff-permissions',
    title: 'Delegate Safely',
    message: 'Add staff with specific permissions. Let them manage orders without accessing revenue or settings.',
    category: 'feature',
    relatedTutorial: 'staff-management',
  },
  {
    id: 'tip-daily-checklist',
    title: 'Daily Operations',
    message: 'Start each day by: 1) Reset daily stock, 2) Check pending orders, 3) Review yesterday\'s sales. It takes just 2 minutes!',
    category: 'best-practice',
    relatedTutorial: 'daily-operations',
  },
];

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const TIPS_STORAGE_KEY = 'genfity_tips_of_day';

interface TipsState {
  lastShownDate: string; // ISO date string
  currentTipIndex: number;
  dismissedToday: boolean;
  permanentlyDismissed: boolean;
}

function getTipsState(): TipsState {
  try {
    const stored = localStorage.getItem(TIPS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return {
    lastShownDate: '',
    currentTipIndex: 0,
    dismissedToday: false,
    permanentlyDismissed: false,
  };
}

function saveTipsState(state: TipsState): void {
  try {
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore errors
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// COMPONENT
// ============================================

interface TipsOfTheDayProps {
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'center';
  /** Show immediately or wait for delay */
  delayMs?: number;
  /** Allow permanent dismissal */
  canDismissPermanently?: boolean;
}

export function TipsOfTheDay({
  position = 'bottom-right',
  delayMs = 2000,
  canDismissPermanently = true,
}: TipsOfTheDayProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { startTutorial, isOverlayVisible } = useTutorial();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize and get today's tip
  useEffect(() => {
    setMounted(true);

    const state = getTipsState();
    const today = getToday();

    // Check if permanently dismissed
    if (state.permanentlyDismissed) {
      return;
    }

    // Check if already dismissed today
    if (state.lastShownDate === today && state.dismissedToday) {
      return;
    }

    // New day - rotate to next tip
    let newIndex = state.currentTipIndex;
    if (state.lastShownDate !== today) {
      newIndex = (state.currentTipIndex + 1) % DAILY_TIPS.length;
      saveTipsState({
        ...state,
        lastShownDate: today,
        currentTipIndex: newIndex,
        dismissedToday: false,
      });
    }

    setTipIndex(newIndex);
    setCurrentTip(DAILY_TIPS[newIndex]);

    // Delay showing the tip
    const timer = setTimeout(() => {
      if (!isOverlayVisible) {
        setShow(true);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, isOverlayVisible]);

  // Hide when tutorial overlay shows
  useEffect(() => {
    if (isOverlayVisible && show) {
      setShow(false);
    }
  }, [isOverlayVisible, show]);

  const handleDismiss = useCallback((permanent: boolean = false) => {
    setIsExiting(true);

    const state = getTipsState();
    saveTipsState({
      ...state,
      dismissedToday: true,
      permanentlyDismissed: permanent,
    });

    setTimeout(() => {
      setShow(false);
      setIsExiting(false);
    }, 300);
  }, []);

  const handleNextTip = useCallback(() => {
    const newIndex = (tipIndex + 1) % DAILY_TIPS.length;
    setTipIndex(newIndex);
    setCurrentTip(DAILY_TIPS[newIndex]);

    const state = getTipsState();
    saveTipsState({
      ...state,
      currentTipIndex: newIndex,
    });
  }, [tipIndex]);

  const handlePrevTip = useCallback(() => {
    const newIndex = tipIndex === 0 ? DAILY_TIPS.length - 1 : tipIndex - 1;
    setTipIndex(newIndex);
    setCurrentTip(DAILY_TIPS[newIndex]);

    const state = getTipsState();
    saveTipsState({
      ...state,
      currentTipIndex: newIndex,
    });
  }, [tipIndex]);

  const handleStartTutorial = useCallback(() => {
    if (currentTip?.relatedTutorial) {
      const tutorialId = currentTip.relatedTutorial;
      const tutorial = getTutorialById(tutorialId);

      handleDismiss();

      // Check if first step has navigateTo and we're not already there
      if (tutorial?.steps?.[0]?.navigateTo) {
        const targetPath = tutorial.steps[0].navigateTo;
        // Strict equality check ensures we are on the exact target page
        const isAlreadyOnPage = pathname === targetPath;

        if (!isAlreadyOnPage) {
          // Prefetch for smoother navigation
          router.prefetch(targetPath);

          // Navigate first, then start tutorial after page fully loads
          router.push(targetPath);
          setTimeout(() => {
            startTutorial(tutorialId);
          }, 1000); // Increased timeout for page to fully render
          return;
        }
      }

      // Start tutorial immediately if no navigation needed
      setTimeout(() => {
        startTutorial(tutorialId);
      }, 400);
    }
  }, [currentTip, handleDismiss, startTutorial, router, pathname]);

  if (!mounted || !show || !currentTip || isOverlayVisible) {
    return null;
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  // Category colors
  const categoryColors = {
    productivity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    feature: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    shortcut: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'best-practice': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  const categoryLabels = {
    productivity: 'Productivity',
    feature: 'Feature',
    shortcut: 'Shortcut',
    'best-practice': 'Best Practice',
  };

  return createPortal(
    <div
      className={`fixed ${positionClasses[position]} z-50 w-full max-w-md transform transition-all duration-300 ease-out ${isExiting
        ? 'opacity-0 translate-y-2 scale-95'
        : 'opacity-100 translate-y-0 scale-100'
        }`}
      role="dialog"
      aria-label="Tip of the Day"
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-linear-to-r from-brand-500 to-brand-600 px-5 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <FaLightbulb className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Tip of the Day</span>
          </div>
          <button
            onClick={() => handleDismiss()}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Category Badge */}
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[currentTip.category]}`}>
            {categoryLabels[currentTip.category]}
          </span>

          {/* Title & Message */}
          <h4 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {currentTip.title}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {currentTip.message}
          </p>

          {/* Tutorial Button */}
          {currentTip.relatedTutorial && (
            <button
              onClick={handleStartTutorial}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
            >
              <FaPlay className="h-3 w-3" />
              <span>Start Tutorial</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/50">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTip}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Previous tip"
            >
              <FaArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tipIndex + 1} / {DAILY_TIPS.length}
            </span>
            <button
              onClick={handleNextTip}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Next tip"
            >
              <FaArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Permanent Dismiss */}
          {canDismissPermanently && (
            <button
              onClick={() => handleDismiss(true)}
              className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              Don&apos;t show again
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TipsOfTheDay;
