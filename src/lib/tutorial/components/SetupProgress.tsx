'use client';

/**
 * Setup Progress Component
 * 
 * @description Unified horizontal stepper showing setup progress.
 * Combines the functionality of GettingStartedChecklist and QuickSetupWizard
 * into a compact, professional design.
 * 
 * Uses template-aware completion logic - checks if user has customized
 * beyond the auto-created template data.
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
const COMPLETED_KEY = 'genfity_setup_completed';

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

function markAsCompleted(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, 'true');
  } catch {
    // Ignore
  }
}

function isMarkedCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  } catch {
    return false;
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
  const [permanentlyCompleted, setPermanentlyCompleted] = useState(false);

  // Define setup steps (all 5 steps)
  const steps: SetupStep[] = [
    {
      id: 'merchant_info',
      title: t('checklist.merchantInfo') || 'Store Info',
      shortTitle: 'Store',
      description: t('checklist.merchantInfoDesc') || 'Add logo & contact details',
      icon: FaStore,
      route: '/admin/dashboard/merchant/edit',
      order: 1,
    },
    {
      id: 'categories',
      title: t('checklist.categories') || 'Categories',
      shortTitle: 'Categories',
      description: t('checklist.categoriesDesc') || 'Customize your categories',
      icon: FaList,
      route: '/admin/dashboard/categories',
      order: 2,
    },
    {
      id: 'menu_items',
      title: t('checklist.menuItems') || 'Menu Items',
      shortTitle: 'Menu',
      description: t('checklist.menuItemsDesc') || 'Add at least 3 menu items',
      icon: FaUtensils,
      route: '/admin/dashboard/menu',
      order: 3,
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
    },
    {
      id: 'opening_hours',
      title: t('checklist.openingHours') || 'Opening Hours',
      shortTitle: 'Hours',
      description: t('checklist.openingHoursDesc') || 'Set business hours',
      icon: FaClock,
      route: '/admin/dashboard/merchant/edit',
      order: 5,
    },
  ];

  // Check all step statuses using the new API
  const checkAllSteps = useCallback(async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/merchant/setup-progress', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setStepStatus(data.data.steps);
          
          // Check if addons was skipped
          if (localStorage.getItem('setup_addons_skipped') === 'true') {
            setStepStatus(prev => ({ ...prev, addons: true }));
          }
          
          // Check if all required steps are complete
          if (data.data.isComplete) {
            markAsCompleted();
            setPermanentlyCompleted(true);
            onComplete?.();
          }
        }
      }
    } catch (error) {
      console.error('Failed to check setup progress:', error);
    }
    
    setLoading(false);
  }, [onComplete]);

  // Initialize
  useEffect(() => {
    setMounted(true);
    
    // Check if already permanently completed
    if (isMarkedCompleted()) {
      setPermanentlyCompleted(true);
      setLoading(false);
      return;
    }
    
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

  // If permanently completed, don't render anything
  if (permanentlyCompleted) {
    return null;
  }

  // Calculate progress
  const requiredSteps = steps.filter(s => !s.isOptional);
  const completedRequired = requiredSteps.filter(s => stepStatus[s.id]).length;
  const progressPercent = Math.round((completedRequired / requiredSteps.length) * 100);
  const isComplete = progressPercent === 100;

  // If complete, mark as permanently complete and return null
  if (isComplete && !permanentlyCompleted) {
    markAsCompleted();
    setPermanentlyCompleted(true);
    onComplete?.();
    return null;
  }

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/10 border-b border-gray-200 dark:border-gray-700">
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
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default SetupProgress;
