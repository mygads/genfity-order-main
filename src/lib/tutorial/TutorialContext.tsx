'use client';

/**
 * Tutorial Context Provider
 * 
 * @description Global state management for tutorials and onboarding
 * @specification copilot-instructions.md - React Context patterns
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import type {
  TutorialId,
  TutorialState,
  TutorialContextValue,
  Tutorial,
  TutorialProgress,
} from './types';
import {
  TUTORIALS,
  getTutorialById,
  getOnboardingTutorial,
  getAvailableTutorials,
} from './tutorials';
import { ClickHereHintProvider } from './components/ClickHereHint';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'genfity_tutorial_progress';
const TUTORIAL_API_URL = '/api/user/tutorial';

// Initial state
const initialState: TutorialState = {
  activeTutorial: null,
  currentStepIndex: 0,
  isOverlayVisible: false,
  hasCompletedOnboarding: false,
  completedTutorials: [],
  showHintPanel: false,
  lastHintDismissedAt: null,
  isLoading: true,
};

// ============================================
// CONTEXT
// ============================================

const TutorialContext = createContext<TutorialContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface TutorialProviderProps {
  children: React.ReactNode;
  userId?: string;
  userRole?: 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'SUPER_ADMIN' | 'CUSTOMER';
  userPermissions?: string[];
}

export function TutorialProvider({
  children,
  userId,
  userRole,
  userPermissions = [],
}: TutorialProviderProps) {
  const [state, setState] = useState<TutorialState>(initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // ============================================
  // LOAD PROGRESS FROM STORAGE
  // ============================================

  const loadProgress = useCallback(async () => {
    // First try localStorage for speed
    let hasLocalCache = false;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        hasLocalCache = true;
        const parsed: TutorialProgress = JSON.parse(cached);
        setState(prev => ({
          ...prev,
          hasCompletedOnboarding: parsed.hasCompletedOnboarding,
          completedTutorials: parsed.completedTutorials || [],
          lastHintDismissedAt: parsed.lastHintDismissedAt
            ? new Date(parsed.lastHintDismissedAt)
            : null,
          isLoading: !!userId, // Continue loading only if we need to fetch from API
        }));
      }
    } catch (e) {
      console.warn('Failed to load tutorial progress from localStorage:', e);
    }

    // If no userId, we're done loading (no API call needed)
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Fetch from database if user is logged in
    try {
      const response = await fetch(TUTORIAL_API_URL, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const progress: TutorialProgress = data.data;
          setState(prev => ({
            ...prev,
            hasCompletedOnboarding: progress.hasCompletedOnboarding,
            completedTutorials: progress.completedTutorials || [],
            lastHintDismissedAt: progress.lastHintDismissedAt
              ? new Date(progress.lastHintDismissedAt)
              : null,
            isLoading: false,
          }));

          // Update localStorage cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (e) {
      console.warn('Failed to load tutorial progress from API:', e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  // ============================================
  // SAVE PROGRESS TO STORAGE
  // ============================================

  const saveProgress = useCallback(
    async (progress: TutorialProgress) => {
      // Save to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (e) {
        console.warn('Failed to save tutorial progress to localStorage:', e);
      }

      // Debounce API save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (userId) {
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await fetch(TUTORIAL_API_URL, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
              },
              body: JSON.stringify(progress),
            });
          } catch (e) {
            console.warn('Failed to save tutorial progress to API:', e);
          }
        }, 1000);
      }
    },
    [userId]
  );

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadProgress();
    }
  }, [loadProgress]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // AUTO-START ONBOARDING FOR NEW USERS
  // ============================================

  useEffect(() => {
    // Only for merchant roles and after loading is complete
    if (
      !state.isLoading &&
      !state.hasCompletedOnboarding &&
      !state.activeTutorial &&
      (userRole === 'MERCHANT_OWNER' || userRole === 'MERCHANT_STAFF')
    ) {
      // Small delay to let the page render first
      const timeout = setTimeout(() => {
        const onboarding = getOnboardingTutorial();
        if (onboarding) {
          setState(prev => ({
            ...prev,
            activeTutorial: onboarding,
            currentStepIndex: 0,
            isOverlayVisible: true,
          }));
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [state.isLoading, state.hasCompletedOnboarding, state.activeTutorial, userRole]);

  // ============================================
  // ACTIONS
  // ============================================

  const startTutorial = useCallback((tutorialId: TutorialId) => {
    const tutorial = getTutorialById(tutorialId);
    if (tutorial) {
      setState(prev => ({
        ...prev,
        activeTutorial: tutorial,
        currentStepIndex: 0,
        isOverlayVisible: true,
        showHintPanel: false,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (!prev.activeTutorial) return prev;

      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.activeTutorial.steps.length) {
        // Tutorial completed
        return prev;
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => {
      if (!prev.activeTutorial || prev.currentStepIndex <= 0) return prev;

      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      };
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setState(prev => {
      // If skipping onboarding, mark it as completed to prevent re-showing
      const isSkippingOnboarding = prev.activeTutorial?.isOnboarding;
      const newHasCompletedOnboarding = isSkippingOnboarding ? true : prev.hasCompletedOnboarding;

      const updatedState = {
        ...prev,
        activeTutorial: null,
        currentStepIndex: 0,
        isOverlayVisible: false,
        hasCompletedOnboarding: newHasCompletedOnboarding,
      };

      // Save to localStorage if skipping onboarding
      if (isSkippingOnboarding) {
        saveProgress({
          hasCompletedOnboarding: true,
          completedTutorials: prev.completedTutorials,
          lastHintDismissedAt: prev.lastHintDismissedAt,
        });
      }

      return updatedState;
    });
  }, [saveProgress]);

  const completeTutorial = useCallback(() => {
    setState(prev => {
      if (!prev.activeTutorial) return prev;

      const tutorialId = prev.activeTutorial.id;
      const isOnboarding = prev.activeTutorial.isOnboarding;
      const newCompletedTutorials = prev.completedTutorials.includes(tutorialId)
        ? prev.completedTutorials
        : [...prev.completedTutorials, tutorialId];

      const newState = {
        ...prev,
        activeTutorial: null,
        currentStepIndex: 0,
        isOverlayVisible: false,
        completedTutorials: newCompletedTutorials,
        hasCompletedOnboarding: isOnboarding ? true : prev.hasCompletedOnboarding,
      };

      // Save progress
      saveProgress({
        hasCompletedOnboarding: newState.hasCompletedOnboarding,
        completedTutorials: newState.completedTutorials,
        lastHintDismissedAt: prev.lastHintDismissedAt,
      });

      return newState;
    });
  }, [saveProgress]);

  const toggleHintPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHintPanel: !prev.showHintPanel,
    }));
  }, []);

  const dismissHint = useCallback(() => {
    const now = new Date();
    setState(prev => {
      const newState = {
        ...prev,
        showHintPanel: false,
        lastHintDismissedAt: now,
      };

      // Save progress
      saveProgress({
        hasCompletedOnboarding: prev.hasCompletedOnboarding,
        completedTutorials: prev.completedTutorials,
        lastHintDismissedAt: now,
      });

      return newState;
    });
  }, [saveProgress]);

  const resetTutorials = useCallback(() => {
    const newState = {
      ...initialState,
      isLoading: false,
    };

    setState(newState);

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Clear from database
    if (userId) {
      saveProgress({
        hasCompletedOnboarding: false,
        completedTutorials: [],
        lastHintDismissedAt: null,
      });
    }
  }, [userId, saveProgress]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const availableTutorials = useMemo(() => {
    if (userRole === 'MERCHANT_OWNER' || userRole === 'MERCHANT_STAFF') {
      return getAvailableTutorials(userRole, userPermissions);
    }
    return [];
  }, [userRole, userPermissions]);

  const currentStep = useMemo(() => {
    if (!state.activeTutorial) return null;
    return state.activeTutorial.steps[state.currentStepIndex] || null;
  }, [state.activeTutorial, state.currentStepIndex]);

  const isTutorialCompleted = useCallback(
    (tutorialId: TutorialId) => {
      return state.completedTutorials.includes(tutorialId);
    },
    [state.completedTutorials]
  );

  const completionPercentage = useMemo(() => {
    if (availableTutorials.length === 0) return 100;
    const completed = availableTutorials.filter(t =>
      state.completedTutorials.includes(t.id)
    ).length;
    return Math.round((completed / availableTutorials.length) * 100);
  }, [availableTutorials, state.completedTutorials]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const contextValue: TutorialContextValue = useMemo(
    () => ({
      // State
      activeTutorial: state.activeTutorial,
      currentStep,
      currentStepIndex: state.currentStepIndex,
      isOverlayVisible: state.isOverlayVisible,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      completedTutorials: state.completedTutorials,
      showHintPanel: state.showHintPanel,
      isLoading: state.isLoading,
      availableTutorials,
      completionPercentage,

      // Actions
      startTutorial,
      nextStep,
      previousStep,
      skipTutorial,
      completeTutorial,
      toggleHintPanel,
      dismissHint,
      resetTutorials,
      isTutorialCompleted,
    }),
    [
      state,
      currentStep,
      availableTutorials,
      completionPercentage,
      startTutorial,
      nextStep,
      previousStep,
      skipTutorial,
      completeTutorial,
      toggleHintPanel,
      dismissHint,
      resetTutorials,
      isTutorialCompleted,
    ]
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      <ClickHereHintProvider>
        {children}
      </ClickHereHintProvider>
    </TutorialContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

// ============================================
// OPTIONAL HOOK (doesn't throw if outside provider)
// ============================================

export function useTutorialOptional(): TutorialContextValue | null {
  return useContext(TutorialContext);
}

export default TutorialContext;
