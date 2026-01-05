'use client';

/**
 * Tutorial Hint Panel
 * 
 * @description Floating panel showing tutorial progress and available tutorials
 * @specification copilot-instructions.md - UI/UX Standards with orange brand color
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTutorial } from '../TutorialContext';
import type { Tutorial, TutorialId } from '../types';
import {
  FaLightbulb,
  FaChevronDown,
  FaCheckCircle,
  FaPlay,
  FaRedo,
  FaTimes,
  FaRocket,
  FaUtensils,
  FaFolderOpen,
  FaPuzzlePiece,
  FaCogs,
  FaQrcode,
  FaBoxes,
  FaClipboardList,
  FaChartPie,
  FaPencilAlt,
  FaMagic,
  FaFileExcel,
  FaPlus,
  FaEdit,
  FaLink,
  FaConciergeBell,
  FaHistory,
  FaChartLine,
  FaChartBar,
  FaUsersCog,
  FaPercentage,
  FaBook,
  FaKeyboard,
  FaCheckDouble,
  FaSearch,
  FaMoon,
  FaMobileAlt,
  FaTh,
  FaCalendarCheck,
} from 'react-icons/fa';

// Icon mapping for tutorials - Complete mapping of all FA icons used
const iconMap: Record<string, React.ReactNode> = {
  // Getting Started
  FaRocket: <FaRocket className="w-4 h-4" />,
  // Menu
  FaUtensils: <FaUtensils className="w-4 h-4" />,
  FaPencilAlt: <FaPencilAlt className="w-4 h-4" />,
  FaMagic: <FaMagic className="w-4 h-4" />,
  FaFileExcel: <FaFileExcel className="w-4 h-4" />,
  // Categories
  FaFolderOpen: <FaFolderOpen className="w-4 h-4" />,
  FaEdit: <FaEdit className="w-4 h-4" />,
  // Addons
  FaPuzzlePiece: <FaPuzzlePiece className="w-4 h-4" />,
  FaPlus: <FaPlus className="w-4 h-4" />,
  FaLink: <FaLink className="w-4 h-4" />,
  // Settings
  FaCogs: <FaCogs className="w-4 h-4" />,
  FaQrcode: <FaQrcode className="w-4 h-4" />,
  FaBoxes: <FaBoxes className="w-4 h-4" />,
  // Orders
  FaClipboardList: <FaClipboardList className="w-4 h-4" />,
  FaConciergeBell: <FaConciergeBell className="w-4 h-4" />,
  FaHistory: <FaHistory className="w-4 h-4" />,
  // Reports
  FaChartLine: <FaChartLine className="w-4 h-4" />,
  FaChartPie: <FaChartPie className="w-4 h-4" />,
  FaChartBar: <FaChartBar className="w-4 h-4" />,
  // Other Features
  FaUsersCog: <FaUsersCog className="w-4 h-4" />,
  FaPercentage: <FaPercentage className="w-4 h-4" />,
  FaBook: <FaBook className="w-4 h-4" />,
  // Quick Tips
  FaKeyboard: <FaKeyboard className="w-4 h-4" />,
  FaCheckDouble: <FaCheckDouble className="w-4 h-4" />,
  FaSearch: <FaSearch className="w-4 h-4" />,
  FaMoon: <FaMoon className="w-4 h-4" />,
  FaMobileAlt: <FaMobileAlt className="w-4 h-4" />,
  FaTh: <FaTh className="w-4 h-4" />,
  FaCalendarCheck: <FaCalendarCheck className="w-4 h-4" />,
  // Default
  FaLightbulb: <FaLightbulb className="w-4 h-4" />,
};

export function HintPanelButton() {
  const { 
    showHintPanel, 
    toggleHintPanel, 
    completionPercentage,
    hasCompletedOnboarding,
    isLoading,
  } = useTutorial();

  // Don't show if still loading or before onboarding
  if (isLoading) return null;

  const showIndicator = !hasCompletedOnboarding || completionPercentage < 100;

  return (
    <button
      onClick={toggleHintPanel}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
        showHintPanel
          ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
      title="Tutorials & Help"
      aria-expanded={showHintPanel}
      aria-haspopup="true"
    >
      <FaLightbulb className={`w-5 h-5 ${showHintPanel ? 'text-brand-500' : ''}`} />
      <span className="hidden md:inline text-sm font-medium">Help</span>
      <FaChevronDown 
        className={`w-3 h-3 transition-transform duration-200 ${showHintPanel ? 'rotate-180' : ''}`} 
      />
      
      {/* Indicator dot for incomplete tutorials */}
      {showIndicator && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}

export function HintPanel() {
  const {
    showHintPanel,
    toggleHintPanel,
    availableTutorials,
    completedTutorials,
    completionPercentage,
    hasCompletedOnboarding,
    startTutorial,
    resetTutorials,
    isTutorialCompleted,
  } = useTutorial();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isClickInsideRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // If the click was inside the panel (tracked via ref), don't close
      if (isClickInsideRef.current) {
        isClickInsideRef.current = false;
        return;
      }
      
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if click is on the toggle button
        const button = (e.target as Element).closest('[aria-haspopup="true"]');
        if (!button) {
          toggleHintPanel();
        }
      }
    };

    if (showHintPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHintPanel, toggleHintPanel]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHintPanel) {
        toggleHintPanel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showHintPanel, toggleHintPanel]);

  const handleStartTutorial = useCallback((tutorialId: TutorialId) => {
    // Start tutorial - it will automatically close the panel via state
    startTutorial(tutorialId);
  }, [startTutorial]);

  const handleReset = useCallback(() => {
    resetTutorials();
    setShowResetConfirm(false);
    // Don't close panel immediately so user sees effect
  }, [resetTutorials]);

  if (!showHintPanel) return null;

  const completedCount = availableTutorials.filter(t => 
    completedTutorials.includes(t.id)
  ).length;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 
        w-[calc(100vw-16px)] sm:w-80 md:w-96 
        max-w-100
        bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200
        max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)]
        flex flex-col"
    >
      {/* Header - Responsive */}
      <div className="bg-linear-to-r from-brand-500 to-brand-600 px-3 sm:px-4 py-3 sm:py-4 text-white shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <FaLightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Tutorials &amp; Help</span>
            <span className="xs:hidden">Help</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm opacity-90">{completedCount}/{availableTutorials.length} done</span>
            <button
              onClick={toggleHintPanel}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial List - Scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-2">
          {!hasCompletedOnboarding && (
            <div className="mb-2 p-2.5 sm:p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
              <p className="text-xs sm:text-sm text-brand-700 dark:text-brand-300 mb-2">
                🎉 Welcome! Complete onboarding to get started.
              </p>
              <button
                onClick={() => handleStartTutorial('onboarding')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors touch-manipulation"
              >
                <FaPlay className="w-3 h-3" />
                Start Onboarding
              </button>
            </div>
          )}

          {availableTutorials.map((tutorial) => {
            const isCompleted = isTutorialCompleted(tutorial.id);
            const icon = iconMap[tutorial.icon] || <FaLightbulb className="w-4 h-4" />;

            return (
              <div
                key={tutorial.id}
                onClick={() => {
                  handleStartTutorial(tutorial.id);
                }}
                onMouseDown={() => {
                  // Mark that click is inside the panel to prevent outside click handler from closing
                  isClickInsideRef.current = true;
                }}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors touch-manipulation cursor-pointer ${
                  isCompleted
                    ? 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 active:bg-gray-200 dark:active:bg-gray-700'
                }`}
              >
                {/* Icon - Responsive */}
                <div
                  className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-brand-100 dark:bg-brand-900/30 text-brand-500'
                  }`}
                >
                  {isCompleted ? <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : icon}
                </div>

                {/* Content - Responsive */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs sm:text-sm font-medium truncate ${
                      isCompleted
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {tutorial.name}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate hidden xs:block">
                    {tutorial.description}
                  </p>
                  {tutorial.estimatedTime && (
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                      ~{tutorial.estimatedTime} min
                    </span>
                  )}
                </div>

                {/* Action - Responsive */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTutorial(tutorial.id);
                  }}
                  onMouseDown={() => {
                    isClickInsideRef.current = true;
                  }}
                  className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
                    isCompleted
                      ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300'
                      : 'text-brand-500 hover:text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/30 active:bg-brand-200'
                  }`}
                  title={isCompleted ? 'Replay tutorial' : 'Start tutorial'}
                >
                  {isCompleted ? (
                    <FaRedo className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <FaPlay className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Responsive */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 shrink-0">
        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Reset progress?</span>
            <div className="flex-1" />
            <button
              onClick={() => setShowResetConfirm(false)}
              onMouseDown={() => { isClickInsideRef.current = true; }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              onMouseDown={() => { isClickInsideRef.current = true; }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg transition-colors touch-manipulation"
            >
              Reset
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            onMouseDown={() => { isClickInsideRef.current = true; }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
          >
            <FaRedo className="w-3 h-3" />
            <span className="hidden xs:inline">Reset Tutorial Progress</span>
            <span className="xs:hidden">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default HintPanel;
