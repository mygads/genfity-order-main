/**
 * Tutorial Module Exports
 * 
 * @description Central export file for tutorial system
 */

// Types
export type {
  TutorialId,
  TutorialStep,
  TutorialStepPosition,
  Tutorial,
  TutorialProgress,
  TutorialState,
  TutorialContextValue,
} from './types';

// Context
export {
  TutorialProvider,
  useTutorial,
  useTutorialOptional,
} from './TutorialContext';

// Components
export { TutorialSpotlight } from './components/TutorialSpotlight';
export { HintPanel, HintPanelButton } from './components/HintPanel';
export {
  ContextualHint,
  ContextualHintProvider,
  useContextualHint,
  CONTEXTUAL_HINTS,
  type ContextualHintConfig,
} from './components/ContextualHint';
export {
  TipsOfTheDay,
  DAILY_TIPS,
  type Tip,
} from './components/TipsOfTheDay';
export {
  QuickSetupWizard,
  SetupWizardButton,
  WIZARD_STEPS,
  type WizardStep,
} from './components/QuickSetupWizard';
export {
  GettingStartedChecklist,
} from './components/GettingStartedChecklist';
export {
  SetupProgress,
} from './components/SetupProgress';

// Animated Pointer and Click Here Hints
export {
  AnimatedPointer,
  type AnimatedPointerProps,
  type PointerIconName,
  type PointerDirection,
} from './components/AnimatedPointer';
export {
  ClickHereHint,
  ClickHereHintProvider,
  useClickHereHint,
  CLICK_HINTS,
  type ClickHereHintConfig,
} from './components/ClickHereHint';

// Tutorials config
export {
  TUTORIALS,
  getTutorialById,
  getOnboardingTutorial,
  getAvailableTutorials,
  getTutorialsByCategory,
  // Tutorial Flows (Chained tutorials)
  TUTORIAL_FLOWS,
  getTutorialFlowById,
  getTutorialsInFlow,
  getAvailableTutorialFlows,
  type TutorialFlow,
} from './tutorials';
