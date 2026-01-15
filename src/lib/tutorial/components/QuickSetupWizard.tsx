'use client';

/**
 * Quick Setup Wizard Component
 * 
 * @description A multi-step wizard that guides new merchants through
 * the essential setup process: categories, menu items, addons, and QR codes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FaTimes,
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaFolderOpen,
  FaUtensils,
  FaPuzzlePiece,
  FaQrcode,
  FaRocket,
  FaPlay,
  FaFlag,
} from 'react-icons/fa';
import { useTutorial } from '../TutorialContext';
import type { TutorialId } from '../types';

// ============================================
// WIZARD STEPS CONFIGURATION
// ============================================

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tutorialId: TutorialId;
  estimatedMinutes: number;
  isOptional?: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'categories',
    title: 'Create Categories',
    description: 'Organize your menu with categories like "Appetizers", "Main Course", "Drinks", etc.',
    icon: FaFolderOpen,
    tutorialId: 'create-category',
    estimatedMinutes: 2,
  },
  {
    id: 'menu-items',
    title: 'Add Menu Items',
    description: 'Add your dishes and drinks with prices, descriptions, and photos.',
    icon: FaUtensils,
    tutorialId: 'create-menu',
    estimatedMinutes: 5,
  },
  {
    id: 'addons',
    title: 'Setup Addons',
    description: 'Create customization options like sizes, toppings, or extras to increase order value.',
    icon: FaPuzzlePiece,
    tutorialId: 'create-addon-category',
    estimatedMinutes: 3,
    isOptional: true,
  },
  {
    id: 'qr-codes',
    title: 'Generate QR Codes',
    description: 'Create QR codes for your tables so customers can order directly from their phones.',
    icon: FaQrcode,
    tutorialId: 'qr-tables',
    estimatedMinutes: 2,
    isOptional: true,
  },
];

// ============================================
// LOCAL STORAGE
// ============================================

const WIZARD_STORAGE_KEY = 'genfity_setup_wizard';

interface WizardState {
  currentStep: number;
  completedSteps: string[];
  dismissed: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

function getWizardState(): WizardState {
  try {
    const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return {
    currentStep: 0,
    completedSteps: [],
    dismissed: false,
    startedAt: null,
    completedAt: null,
  };
}

function saveWizardState(state: WizardState): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore errors
  }
}

// ============================================
// COMPONENTS
// ============================================

interface QuickSetupWizardProps {
  /** Show wizard automatically for new users */
  autoShow?: boolean;
  /** Force show wizard (for button click) */
  forceShow?: boolean;
  /** Callback when wizard is completed */
  onComplete?: () => void;
  /** Callback when wizard is dismissed */
  onDismiss?: () => void;
}

export function QuickSetupWizard({
  autoShow = false,
  forceShow = false,
  onComplete,
  onDismiss,
}: QuickSetupWizardProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(forceShow);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { startTutorial, isOverlayVisible } = useTutorial();

  // Initialize from localStorage
  useEffect(() => {
    setMounted(true);
    
    const state = getWizardState();
    
    // Always load state for step tracking
    setCurrentStep(state.currentStep);
    setCompletedSteps(state.completedSteps);
    
    // If force show, always show (for button click)
    if (forceShow) {
      setShow(true);
      if (!state.startedAt) {
        saveWizardState({
          ...state,
          startedAt: new Date().toISOString(),
        });
      }
      return;
    }
    
    // Don't show if already dismissed or completed
    if (state.dismissed || state.completedAt) {
      return;
    }
    
    if (autoShow && !state.startedAt) {
      // First time - show after delay
      const timer = setTimeout(() => {
        setShow(true);
        saveWizardState({
          ...state,
          startedAt: new Date().toISOString(),
        });
      }, 2000);
      return () => clearTimeout(timer);
    } else if (state.startedAt && state.completedSteps.length < WIZARD_STEPS.length) {
      // Resume in progress
      setShow(true);
    }
  }, [autoShow, forceShow]);

  // Hide when tutorial is showing
  useEffect(() => {
    if (isOverlayVisible && show) {
      setShow(false);
    }
  }, [isOverlayVisible, show]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    
    const state = getWizardState();
    saveWizardState({
      ...state,
      dismissed: true,
    });
    
    setTimeout(() => {
      setShow(false);
      setIsExiting(false);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const handleStartTutorial = useCallback((stepId: string, tutorialId: TutorialId) => {
    // Mark this step as in progress (not completed yet)
    setShow(false);
    
    // Start the tutorial
    setTimeout(() => {
      startTutorial(tutorialId);
    }, 300);
  }, [startTutorial]);

  const handleStepComplete = useCallback((stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    
    const state = getWizardState();
    saveWizardState({
      ...state,
      completedSteps: newCompleted,
      currentStep: currentStep + 1,
    });
    
    // Check if all required steps completed
    const requiredSteps = WIZARD_STEPS.filter(s => !s.isOptional);
    const allRequiredComplete = requiredSteps.every(s => newCompleted.includes(s.id));
    
    if (allRequiredComplete || newCompleted.length === WIZARD_STEPS.length) {
      // Show celebration
      setShowCelebration(true);
      saveWizardState({
        ...state,
        completedSteps: newCompleted,
        completedAt: new Date().toISOString(),
      });
      onComplete?.();
    } else {
      // Move to next step
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [completedSteps, currentStep, onComplete]);

  const handleSkipStep = useCallback(() => {
    const state = getWizardState();
    const nextStep = currentStep + 1;
    
    if (nextStep >= WIZARD_STEPS.length) {
      // All steps done or skipped
      setShowCelebration(true);
      saveWizardState({
        ...state,
        completedAt: new Date().toISOString(),
      });
      onComplete?.();
    } else {
      setCurrentStep(nextStep);
      saveWizardState({
        ...state,
        currentStep: nextStep,
      });
    }
  }, [currentStep, onComplete]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Open wizard programmatically
  const openWizard = useCallback(() => {
    setShow(true);
    setShowCelebration(false);
  }, []);

  if (!mounted) {
    return null;
  }

  // Celebration Modal
  if (showCelebration) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-md animate-[scale-in_0.3s_ease-out] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
          {/* Confetti Effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-[confetti_3s_ease-out_forwards]"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['var(--color-brand-500)', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i % 5],
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                }}
              />
            ))}
          </div>
          
          <div className="relative p-8 text-center">
            {/* Trophy Icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-600 shadow-lg">
              <FaFlag className="h-10 w-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎉 Setup Complete!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Your restaurant is ready to accept orders. Customers can now browse your menu and place orders!
            </p>
            
            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <div className="text-2xl font-bold text-brand-500">{completedSteps.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Steps Completed</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <div className="text-2xl font-bold text-green-500">Ready</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Store Status</div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowCelebration(false);
                setShow(false);
              }}
              className="mt-6 w-full rounded-lg bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
            >
              Start Accepting Orders
            </button>
          </div>
          
          {/* Animation styles */}
          <style jsx global>{`
            @keyframes scale-in {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes confetti {
              0% {
                transform: translateY(-20px) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(400px) rotate(720deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      </div>,
      document.body
    );
  }

  if (!show || isOverlayVisible) {
    return null;
  }

  const currentStepData = WIZARD_STEPS[currentStep];
  const progress = (completedSteps.length / WIZARD_STEPS.length) * 100;
  const totalMinutes = WIZARD_STEPS.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const remainingMinutes = WIZARD_STEPS.filter(s => !completedSteps.includes(s.id)).reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 dark:bg-gray-800 ${
          isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <FaRocket className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Quick Setup</h2>
              <p className="text-xs text-white/80">{remainingMinutes} min remaining</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Horizontal Step Indicators */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStep;
            const StepIcon = step.icon;
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-1 ${
                    isCurrent ? '' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={step.title}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-brand-500 text-white ring-2 ring-brand-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {isCompleted ? <FaCheck className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
                  </div>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Compact Current Step Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
              <currentStepData.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h3>
                {currentStepData.isOptional && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Optional
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {currentStepData.description}
              </p>
              <div className="mt-1 text-xs text-gray-400">
                ⏱ ~{currentStepData.estimatedMinutes} min
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="mt-4 flex items-center gap-2">
            {completedSteps.includes(currentStepData.id) ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <FaCheck className="h-3 w-3" />
                <span className="font-medium">Completed</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleStartTutorial(currentStepData.id, currentStepData.tutorialId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  <FaPlay className="h-3 w-3" />
                  Start Tutorial
                </button>
                <button
                  onClick={() => handleStepComplete(currentStepData.id)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Mark Done
                </button>
              </>
            )}
          </div>
        </div>

        {/* Compact Footer Navigation */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FaArrowLeft className="h-3 w-3" />
            Prev
          </button>
          
          <div className="flex items-center gap-2">
            {currentStepData.isOptional && !completedSteps.includes(currentStepData.id) && (
              <button
                onClick={handleSkipStep}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => {
                if (completedSteps.includes(currentStepData.id)) {
                  if (currentStep < WIZARD_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1);
                  } else {
                    setShowCelebration(true);
                  }
                } else {
                  handleStartTutorial(currentStepData.id, currentStepData.tutorialId);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              {completedSteps.includes(currentStepData.id) ? (
                currentStep < WIZARD_STEPS.length - 1 ? (
                  <>Next <FaArrowRight className="h-2.5 w-2.5" /></>
                ) : (
                  <>Finish <FaCheck className="h-2.5 w-2.5" /></>
                )
              ) : (
                <>
                  <FaPlay className="h-2.5 w-2.5" />
                  Start
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================
// WIZARD TRIGGER BUTTON
// ============================================

interface SetupWizardButtonProps {
  className?: string;
}

export function SetupWizardButton({ className }: SetupWizardButtonProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const state = getWizardState();
    const completed = state.completedSteps.length;
    setProgress((completed / WIZARD_STEPS.length) * 100);
  }, [showWizard]);

  const isComplete = progress === 100;

  return (
    <>
      <button
        onClick={() => setShowWizard(true)}
        className={`relative inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${className}`}
      >
        <FaRocket className={`h-4 w-4 ${isComplete ? 'text-green-500' : 'text-brand-500'}`} />
        <span>Setup Wizard</span>
        
        {/* Progress indicator */}
        {!isComplete && progress > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
          </div>
        )}
        
        {isComplete && (
          <FaCheck className="h-4 w-4 text-green-500" />
        )}
      </button>

      {showWizard && (
        <QuickSetupWizard
          forceShow={true}
          onComplete={() => setShowWizard(false)}
          onDismiss={() => setShowWizard(false)}
        />
      )}
    </>
  );
}

export default QuickSetupWizard;
