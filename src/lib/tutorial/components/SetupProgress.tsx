'use client';

/**
 * Setup Progress Component
 * 
 * @description Unified horizontal stepper showing setup progress.
 * Combines the functionality of GettingStartedChecklist and QuickSetupWizard
 * into a compact, professional design.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  FaCheck,
  FaTimes,
  FaStore,
  FaList,
  FaUtensils,
  FaPlusCircle,
  FaClock,
  FaRocket,
  FaChevronRight,
  FaSpinner,
} from 'react-icons/fa';

// ============================================
// TYPES
// ============================================

interface SetupStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  apiCheck: () => Promise<boolean>;
  isOptional?: boolean;
  order: number;
}

interface SetupProgressProps {
  /** Compact mode - just icons with minimal text */
  compact?: boolean;
  /** Called when all steps complete */
  onComplete?: () => void;
}

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'genfity_setup_progress';

interface StoredState {
  dismissed: boolean;
  completedAt: string | null;
}

function getStoredState(): StoredState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return { dismissed: false, completedAt: null };
}

function saveStoredState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

// ============================================
// COMPONENT
// ============================================

export function SetupProgress({ compact = false, onComplete }: SetupProgressProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>({});

  // Define setup steps
  const steps: SetupStep[] = [
    {
      id: 'merchant_info',
      title: t('checklist.merchantInfo') || 'Store Info',
      shortTitle: 'Store',
      description: t('checklist.merchantInfoDesc') || 'Add logo & contact details',
      icon: FaStore,
      route: '/admin/dashboard/merchant/edit',
      order: 1,
      apiCheck: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        try {
          const res = await fetch('/api/merchant/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            return !!data.data?.logoUrl;
          }
        } catch {
          // Ignore
        }
        return false;
      },
    },
    {
      id: 'categories',
      title: t('checklist.categories') || 'Categories',
      shortTitle: 'Categories',
      description: t('checklist.categoriesDesc') || 'Add at least 1 category',
      icon: FaList,
      route: '/admin/dashboard/categories',
      order: 2,
      apiCheck: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        try {
          const res = await fetch('/api/merchant/categories', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            return (data.data?.length || 0) >= 1;
          }
        } catch {
          // Ignore
        }
        return false;
      },
    },
    {
      id: 'menu_items',
      title: t('checklist.menuItems') || 'Menu Items',
      shortTitle: 'Menu',
      description: t('checklist.menuItemsDesc') || 'Add at least 3 items',
      icon: FaUtensils,
      route: '/admin/dashboard/menu',
      order: 3,
      apiCheck: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        try {
          const res = await fetch('/api/merchant/menu', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            return (data.data?.length || 0) >= 3;
          }
        } catch {
          // Ignore
        }
        return false;
      },
    },
    {
      id: 'addons',
      title: t('checklist.addons') || 'Addons',
      shortTitle: 'Addons',
      description: t('checklist.addonsDesc') || 'Set up customizations',
      icon: FaPlusCircle,
      route: '/admin/dashboard/addon-categories',
      order: 4,
      isOptional: true,
      apiCheck: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        // Check if skipped
        if (localStorage.getItem('setup_addons_skipped') === 'true') return true;
        try {
          const res = await fetch('/api/merchant/addon-categories', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            return (data.data?.length || 0) >= 1;
          }
        } catch {
          // Ignore
        }
        return false;
      },
    },
    {
      id: 'opening_hours',
      title: t('checklist.openingHours') || 'Opening Hours',
      shortTitle: 'Hours',
      description: t('checklist.openingHoursDesc') || 'Set business hours',
      icon: FaClock,
      route: '/admin/dashboard/merchant/edit',
      order: 5,
      apiCheck: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        try {
          const res = await fetch('/api/merchant/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const hours = data.data?.openingHours || [];
            return hours.length > 0;
          }
        } catch {
          // Ignore
        }
        return false;
      },
    },
  ];

  // Check all step statuses
  const checkAllSteps = useCallback(async () => {
    setLoading(true);
    const status: Record<string, boolean> = {};
    
    await Promise.all(
      steps.map(async (step) => {
        status[step.id] = await step.apiCheck();
      })
    );
    
    setStepStatus(status);
    setLoading(false);
    
    // Check if all required steps are complete
    const requiredSteps = steps.filter(s => !s.isOptional);
    const allComplete = requiredSteps.every(s => status[s.id]);
    
    if (allComplete) {
      saveStoredState({ dismissed: false, completedAt: new Date().toISOString() });
      onComplete?.();
    }
  }, [onComplete]);

  // Initialize
  useEffect(() => {
    setMounted(true);
    const state = getStoredState();
    setDismissed(state.dismissed);
    
    if (!state.dismissed) {
      checkAllSteps();
    } else {
      setLoading(false);
    }
  }, [checkAllSteps]);

  // Handle dismiss
  const handleDismiss = () => {
    saveStoredState({ dismissed: true, completedAt: null });
    setDismissed(true);
  };

  // Handle show again
  const handleShowAgain = () => {
    saveStoredState({ dismissed: false, completedAt: null });
    setDismissed(false);
    checkAllSteps();
  };

  // Handle step click
  const handleStepClick = (step: SetupStep) => {
    if (!stepStatus[step.id]) {
      router.push(step.route);
    }
  };

  // Handle skip optional
  const handleSkip = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`setup_${stepId}_skipped`, 'true');
    setStepStatus(prev => ({ ...prev, [stepId]: true }));
  };

  if (!mounted) return null;

  // Calculate progress
  const requiredSteps = steps.filter(s => !s.isOptional);
  const completedRequired = requiredSteps.filter(s => stepStatus[s.id]).length;
  const progressPercent = Math.round((completedRequired / requiredSteps.length) * 100);
  const isComplete = progressPercent === 100;

  // Dismissed state - compact show again button
  if (dismissed) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('checklist.dismissed') || 'Setup guide hidden'}
        </span>
        <button
          onClick={handleShowAgain}
          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
        >
          {t('checklist.showAgain') || 'Show'}
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <FaSpinner className="w-4 h-4 text-brand-500 animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <FaCheck className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            🎉 {t('checklist.complete') || 'Setup Complete!'}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-green-600 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-50 to-orange-50 dark:from-brand-900/20 dark:to-orange-900/10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <FaRocket className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('checklist.title') || 'Getting Started'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedRequired}/{requiredSteps.length} steps completed
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Dismiss"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Steps */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = stepStatus[step.id];
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <div
                  onClick={() => handleStepClick(step)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer group ${
                    isCompleted ? 'opacity-70' : ''
                  }`}
                  title={step.description}
                >
                  {/* Icon Circle */}
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-500'
                    }`}
                  >
                    {isCompleted ? (
                      <FaCheck className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    
                    {/* Optional badge */}
                    {step.isOptional && !isCompleted && (
                      <span className="absolute -top-1 -right-1 text-[8px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-1 rounded">
                        opt
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] font-medium text-center leading-tight max-w-[60px] ${
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-brand-600'
                    }`}
                  >
                    {step.shortTitle}
                  </span>

                  {/* Skip button for optional steps */}
                  {step.isOptional && !isCompleted && (
                    <button
                      onClick={(e) => handleSkip(step.id, e)}
                      className="text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Skip
                    </button>
                  )}
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-1 bg-gray-200 dark:bg-gray-700 relative">
                    <div
                      className="absolute inset-0 bg-green-500 transition-all duration-500"
                      style={{
                        width: isCompleted && stepStatus[steps[index + 1]?.id] ? '100%' : isCompleted ? '50%' : '0%',
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar at bottom */}
        <div className="mt-4 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default SetupProgress;
