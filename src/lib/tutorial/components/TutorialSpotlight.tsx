'use client';

/**
 * Tutorial Spotlight Overlay
 * 
 * @description Interactive spotlight overlay for tutorials with tooltip
 * @specification copilot-instructions.md - UI/UX Standards with orange brand color
 * @features Animated transitions, keyboard navigation, smooth spotlight movement, animated pointers
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTutorial } from '../TutorialContext';
import { createPortal } from 'react-dom';
import { FaArrowLeft, FaArrowRight, FaTimes, FaLightbulb, FaKeyboard, FaHandPointLeft, FaHandPointRight } from 'react-icons/fa';
import { AnimatedPointer, type PointerIconName } from './AnimatedPointer';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

// Animation states for smooth transitions
type AnimationPhase = 'entering' | 'visible' | 'exiting' | 'hidden';

// Swipe gesture hook for mobile navigation
function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 50, enabled = true } = options;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Only trigger swipe if horizontal movement is greater than vertical
    // and swipe is fast enough (under 500ms)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold && deltaTime < 500) {
      if (deltaX > 0) {
        setSwipeDirection('right');
        onSwipeRight();
        setTimeout(() => setSwipeDirection(null), 300);
      } else {
        setSwipeDirection('left');
        onSwipeLeft();
        setTimeout(() => setSwipeDirection(null), 300);
      }
    }

    touchStartRef.current = null;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { swipeDirection };
}

// Hook to detect orientation and device type
function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? 'landscape' : 'portrait');

      // Tablet detection: width between 600-1024px or height between 600-1024px in landscape
      const minDimension = Math.min(window.innerWidth, window.innerHeight);
      const maxDimension = Math.max(window.innerWidth, window.innerHeight);
      setIsTablet(minDimension >= 600 && maxDimension <= 1366);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return { orientation, isTablet, isLandscapeTablet: isTablet && orientation === 'landscape' };
}

export function TutorialSpotlight() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeTutorial,
    currentStep,
    currentStepIndex,
    isOverlayVisible,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
  } = useTutorial();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [prevSpotlightRect, setPrevSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('hidden');
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Device orientation detection
  const { orientation, isTablet, isLandscapeTablet } = useDeviceOrientation();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ref to store previous spotlight rect for animations (avoids infinite loop)
  const prevSpotlightRectRef = useRef<SpotlightRect | null>(null);

  const getCurrentPathWithSearch = useCallback((): string => {
    if (typeof window === 'undefined') return pathname || '';
    return `${window.location.pathname}${window.location.search}`;
  }, [pathname]);

  const findTargetElement = useCallback((selector: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;

    const candidates = Array.from(document.querySelectorAll(selector));
    const isVisible = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    };

    for (const candidate of candidates) {
      if (candidate instanceof HTMLElement && isVisible(candidate)) {
        return candidate;
      }
    }

    const first = candidates[0];
    return first instanceof HTMLElement ? first : null;
  }, []);

  // Calculate spotlight position with smooth animation
  const calculateSpotlight = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const element = findTargetElement(currentStep.targetSelector);
    if (!element) {
      console.warn(`Tutorial: Element not found for selector "${currentStep.targetSelector}"`);
      setSpotlightRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = currentStep.spotlightPadding ?? 8;

    const newRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };

    // Only update if position actually changed (prevents infinite loops)
    setSpotlightRect(prev => {
      if (prev &&
        Math.abs(prev.top - newRect.top) < 1 &&
        Math.abs(prev.left - newRect.left) < 1 &&
        Math.abs(prev.width - newRect.width) < 1 &&
        Math.abs(prev.height - newRect.height) < 1) {
        return prev; // No significant change
      }
      // Save previous position for animation
      prevSpotlightRectRef.current = prev;
      setPrevSpotlightRect(prev);
      return newRect;
    });

    // Check if element is in a sidebar and scroll the *closest* sidebar container
    // (supports nested/page-level sidebars in addition to the main AppSidebar)
    const sidebar = (element as HTMLElement).closest('[data-sidebar]');
    const sidebarScrollContainer = sidebar?.querySelector('[data-sidebar-scroll]') as HTMLElement | null;
    if (sidebar) {
      // Scroll sidebar scroll container to make element visible
      if (sidebarScrollContainer) {
        const scrollRect = sidebarScrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Check if element is outside visible area of scroll container
        if (elementRect.top < scrollRect.top || elementRect.bottom > scrollRect.bottom) {
          // Calculate the true offset of element relative to scroll container
          // by walking up the DOM tree
          const htmlElement = element as HTMLElement;
          let offsetTop = 0;
          let currentElement: HTMLElement | null = htmlElement;

          while (currentElement && currentElement !== sidebarScrollContainer) {
            offsetTop += currentElement.offsetTop;
            currentElement = currentElement.offsetParent as HTMLElement | null;
            // Stop if we've exited the sidebar
            if (currentElement && !sidebarScrollContainer.contains(currentElement)) {
              break;
            }
          }

          const containerHeight = sidebarScrollContainer.clientHeight;
          const scrollTo = offsetTop - containerHeight / 2 + htmlElement.offsetHeight / 2;

          sidebarScrollContainer.scrollTo({
            top: Math.max(0, scrollTo),
            behavior: 'smooth'
          });

          // Wait for scroll to complete, then recalculate position
          // Use longer timeout (500ms) for more reliable positioning
          setTimeout(() => {
            const newRect = element.getBoundingClientRect();
            const padding = currentStep?.spotlightPadding ?? 8;
            setSpotlightRect({
              top: newRect.top - padding,
              left: newRect.left - padding,
              width: newRect.width + padding * 2,
              height: newRect.height + padding * 2,
            });
          }, 500);
        }
      } else {
        // Fallback: use scrollIntoView
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll animation
        setTimeout(() => {
          const newRect = element.getBoundingClientRect();
          const padding = currentStep?.spotlightPadding ?? 8;
          setSpotlightRect({
            top: newRect.top - padding,
            left: newRect.left - padding,
            width: newRect.width + padding * 2,
            height: newRect.height + padding * 2,
          });
        }, 500);
      }
    } else {
      // For main content, scroll window if needed
      const viewportHeight = window.innerHeight;
      if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll animation
        setTimeout(() => {
          const newRect = element.getBoundingClientRect();
          const padding = currentStep?.spotlightPadding ?? 8;
          setSpotlightRect({
            top: newRect.top - padding,
            left: newRect.left - padding,
            width: newRect.width + padding * 2,
            height: newRect.height + padding * 2,
          });
        }, 500);
      }
    }
  }, [currentStep, findTargetElement]);

  // Calculate tooltip position
  const calculateTooltip = useCallback(() => {
    if (!tooltipRef.current || !currentStep) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

    // Center position (no target element)
    if (!currentStep.targetSelector || !spotlightRect) {
      top = (viewportHeight - tooltipRect.height) / 2;
      left = (viewportWidth - tooltipRect.width) / 2;
      setTooltipPosition({ top, left, arrowPosition: 'top' });
      return;
    }

    const position = currentStep.position || 'bottom';

    switch (position) {
      case 'top':
        top = spotlightRect.top - tooltipRect.height - padding - window.scrollY;
        left = spotlightRect.left + (spotlightRect.width - tooltipRect.width) / 2;
        arrowPosition = 'bottom';
        break;
      case 'bottom':
        top = spotlightRect.top + spotlightRect.height + padding - window.scrollY;
        left = spotlightRect.left + (spotlightRect.width - tooltipRect.width) / 2;
        arrowPosition = 'top';
        break;
      case 'left':
        top = spotlightRect.top + (spotlightRect.height - tooltipRect.height) / 2 - window.scrollY;
        left = spotlightRect.left - tooltipRect.width - padding;
        arrowPosition = 'right';
        break;
      case 'right':
        top = spotlightRect.top + (spotlightRect.height - tooltipRect.height) / 2 - window.scrollY;
        left = spotlightRect.left + spotlightRect.width + padding;
        arrowPosition = 'left';
        break;
      case 'bottom-left':
        top = spotlightRect.top + spotlightRect.height + padding - window.scrollY;
        left = spotlightRect.left;
        arrowPosition = 'top';
        break;
      case 'bottom-right':
        top = spotlightRect.top + spotlightRect.height + padding - window.scrollY;
        left = spotlightRect.left + spotlightRect.width - tooltipRect.width;
        arrowPosition = 'top';
        break;
      case 'center':
        top = (viewportHeight - tooltipRect.height) / 2;
        left = (viewportWidth - tooltipRect.width) / 2;
        arrowPosition = 'top';
        break;
    }

    // Ensure tooltip stays within viewport
    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ top, left, arrowPosition });
  }, [currentStep, spotlightRect]);

  // Update positions on step change with animation phases
  useEffect(() => {
    if (isOverlayVisible && currentStep) {
      // Phase 1: Hide tooltip for transition
      setIsTooltipVisible(false);
      setAnimationPhase('entering');

      // Phase 2: Calculate new spotlight position
      const spotlightTimer = setTimeout(() => {
        calculateSpotlight();
      }, 50);

      // Phase 3: Show tooltip after spotlight animation
      const tooltipTimer = setTimeout(() => {
        calculateTooltip();
        setIsTooltipVisible(true);
        setAnimationPhase('visible');
      }, 350);

      return () => {
        clearTimeout(spotlightTimer);
        clearTimeout(tooltipTimer);
      };
    } else if (!isOverlayVisible) {
      setAnimationPhase('hidden');
      setIsTooltipVisible(false);
    }
  }, [isOverlayVisible, currentStep, currentStepIndex]);

  // Handle navigation when user has clicked action button
  // Do NOT auto-skip navigation steps - let user see the step first
  useEffect(() => {
    if (!isOverlayVisible || !currentStep || !activeTutorial || isNavigating) return;

    // Only auto-advance if we navigated via action button (isNavigating was true and now we're on target)
    // This prevents auto-skipping when tutorial starts
    // The navigation + advance is handled in handleNext with actionText
  }, [isOverlayVisible, currentStep, activeTutorial, currentStepIndex, pathname, nextStep, completeTutorial, isNavigating]);

  // Separate effect for recalculating positions
  useEffect(() => {
    if (isOverlayVisible && animationPhase === 'visible') {
      calculateSpotlight();
      calculateTooltip();
    }
  }, [calculateSpotlight, calculateTooltip, isOverlayVisible, animationPhase]);

  // Recalculate on resize only, NOT on body scroll
  // The spotlight position is fixed relative to viewport, so body scroll shouldn't affect it
  // Only sidebar scroll should trigger recalc (handled by MutationObserver or sidebar-specific listener)
  useEffect(() => {
    const handleResize = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        calculateSpotlight();
        calculateTooltip();
      });
    };

    // Only listen to sidebar scroll, not body/window scroll.
    // Attach to all sidebar scroll containers so nested sidebars work too.
    const sidebarScrollContainers = Array.from(document.querySelectorAll('[data-sidebar-scroll]')) as HTMLElement[];
    const handleSidebarScroll = (event: Event) => {
      if (!currentStep?.targetSelector) return;
      const targetElement = findTargetElement(currentStep.targetSelector);
      if (!targetElement) return;

      const scrollContainer = event.currentTarget as HTMLElement | null;
      if (scrollContainer && scrollContainer.contains(targetElement)) {
        handleResize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Listen to sidebar scroll containers (the actual scrollable elements)
    sidebarScrollContainers.forEach((scrollContainer) => {
      scrollContainer.addEventListener('scroll', handleSidebarScroll, { passive: true });
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      sidebarScrollContainers.forEach((scrollContainer) => {
        scrollContainer.removeEventListener('scroll', handleSidebarScroll);
      });
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateSpotlight, calculateTooltip, currentStep?.targetSelector, findTargetElement]);

  // Auto-navigate when a step specifies navigateTo.
  // This keeps the spotlight on the intended UI even for tab-based pages that use query params.
  useEffect(() => {
    // Important: only auto-navigate while the tutorial overlay is actually visible.
    // If we auto-navigate while hidden, it can "pull" the user back when they click the sidebar.
    if (!isOverlayVisible) return;
    if (!activeTutorial || !currentStep?.navigateTo) return;
    if (isNavigating) return;

    const currentPath = getCurrentPathWithSearch();
    const targetPath = currentStep.navigateTo;

    if (currentPath !== targetPath) {
      setIsNavigating(true);
      router.push(targetPath);
      setTimeout(() => {
        setIsNavigating(false);
      }, 600);
    }
  }, [activeTutorial, currentStep?.navigateTo, getCurrentPathWithSearch, isNavigating, isOverlayVisible, router]);

  // Handle navigation with action - Use Next.js router to preserve tutorial state
  const handleNext = useCallback(() => {
    if (!activeTutorial || !currentStep) return;
    if (isNavigating) return; // Prevent double navigation

    // Check if current step has actionText - this means we should click the target element
    // When actionText is present and target selector exists, clicking Next should trigger the action
    if (currentStep.actionText && currentStep.targetSelector) {
      const targetElement = findTargetElement(currentStep.targetSelector);
      if (targetElement) {
        // Click the target element to trigger the action (e.g., open modal)
        targetElement.click();

        // If there's also a navigateTo, navigate after clicking
        if (currentStep.navigateTo) {
          const targetPath = currentStep.navigateTo;
          const currentPath = getCurrentPathWithSearch();
          const isAlreadyOnPage = currentPath === targetPath || currentPath.startsWith(targetPath);

          if (!isAlreadyOnPage) {
            setIsNavigating(true);
            router.push(targetPath);
            setTimeout(() => {
              setIsNavigating(false);
              if (currentStepIndex >= activeTutorial.steps.length - 1) {
                completeTutorial();
              } else {
                nextStep();
              }
            }, 500);
            return;
          }
        }

        // Move to next step after a delay to let the modal/action appear
        setTimeout(() => {
          if (currentStepIndex >= activeTutorial.steps.length - 1) {
            completeTutorial();
          } else {
            nextStep();
          }
        }, 300);
        return;
      }
    }

    // Navigate to page if specified (no actionText case)
    if (currentStep.navigateTo) {
      // Check if we're already on the target page
      const targetPath = currentStep.navigateTo;
      const currentPath = getCurrentPathWithSearch();
      const isAlreadyOnPage = currentPath === targetPath || currentPath.startsWith(targetPath);

      if (isAlreadyOnPage) {
        // Already on the page, skip to next step
        if (currentStepIndex >= activeTutorial.steps.length - 1) {
          completeTutorial();
        } else {
          nextStep();
        }
        return;
      }

      // Navigate using Next.js router to preserve state
      setIsNavigating(true);
      router.push(targetPath);

      // Wait for navigation and then move to next step
      setTimeout(() => {
        setIsNavigating(false);
        if (currentStepIndex >= activeTutorial.steps.length - 1) {
          completeTutorial();
        } else {
          nextStep();
        }
      }, 500); // Give time for page to load
      return;
    }

    // Check if this is the last step
    if (currentStepIndex >= activeTutorial.steps.length - 1) {
      completeTutorial();
    } else {
      nextStep();
    }
  }, [activeTutorial, currentStep, currentStepIndex, nextStep, completeTutorial, router, isNavigating, findTargetElement, getCurrentPathWithSearch]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      previousStep();
    }
  }, [currentStepIndex, previousStep]);

  // Swipe gesture for mobile navigation
  const { swipeDirection } = useSwipeGesture(
    handleNext,      // Swipe left = next step
    handlePrevious,  // Swipe right = previous step
    { enabled: isOverlayVisible, threshold: 60 }
  );

  // Hide swipe hint after first swipe or after 5 seconds
  useEffect(() => {
    if (swipeDirection) {
      setShowSwipeHint(false);
    }
    const timer = setTimeout(() => setShowSwipeHint(false), 5000);
    return () => clearTimeout(timer);
  }, [swipeDirection, currentStepIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOverlayVisible) return;

      switch (e.key) {
        case 'Escape':
          skipTutorial();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          previousStep();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOverlayVisible, handleNext, previousStep, skipTutorial]);

  if (!mounted || !isOverlayVisible || !activeTutorial || !currentStep) {
    return null;
  }

  const totalSteps = activeTutorial.steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isCenterPosition = currentStep.position === 'center' || !currentStep.targetSelector;

  return createPortal(
    <div className="fixed inset-0 z-9999" role="dialog" aria-modal="true">
      {/* Overlay Background with Spotlight Cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transition: 'all 0.3s ease-in-out' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
                className={animationPhase === 'entering' ? 'transition-all duration-300' : ''}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          className="pointer-events-none"
        />
      </svg>

      {/* Click-catcher panes (outside spotlight only).
          This keeps the spotlight area clickable (fixes "need multiple clicks" on sidebar items). */}
      {spotlightRect ? (
        <>
          {/* Top */}
          <div
            className="fixed left-0 right-0 bg-black/75 pointer-events-auto"
            style={{ top: 0, height: Math.max(0, spotlightRect.top) }}
            onClick={skipTutorial}
          />
          {/* Bottom */}
          <div
            className="fixed left-0 right-0 bg-black/75 pointer-events-auto"
            style={{
              top: spotlightRect.top + spotlightRect.height,
              bottom: 0,
            }}
            onClick={skipTutorial}
          />
          {/* Left */}
          <div
            className="fixed bg-black/75 pointer-events-auto"
            style={{
              top: spotlightRect.top,
              left: 0,
              width: Math.max(0, spotlightRect.left),
              height: spotlightRect.height,
            }}
            onClick={skipTutorial}
          />
          {/* Right */}
          <div
            className="fixed bg-black/75 pointer-events-auto"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left + spotlightRect.width,
              right: 0,
              height: spotlightRect.height,
            }}
            onClick={skipTutorial}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto" onClick={skipTutorial} />
      )}

      {/* Spotlight Border Glow with pulse animation */}
      {spotlightRect && (
        <div
          className="absolute pointer-events-none rounded-lg border-2 border-brand-500 transition-all duration-300 ease-out"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: '0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 30px rgba(255, 107, 53, 0.4)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Animated Pointer - Show when step has showPointer enabled */}
      {currentStep.showPointer && currentStep.targetSelector && isTooltipVisible && (
        <AnimatedPointer
          targetSelector={currentStep.targetSelector}
          direction={currentStep.pointerDirection || 'right'}
          label={currentStep.pointerLabel}
          icon={currentStep.pointerIcon as PointerIconName}
          visible={true}
          mobileOptimized={true}
          size="md"
        />
      )}

      {/* Tooltip with slide-in animation - Responsive with landscape optimization */}
      <div
        ref={tooltipRef}
        className={`fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 
          p-3 sm:p-4 md:p-5 
          ${isLandscapeTablet
            ? 'w-105 max-w-[50vw]'
            : 'w-[calc(100vw-24px)] sm:w-80 md:w-90 lg:w-96 max-w-100'
          }
          transform transition-all duration-300 ease-out ${isTooltipVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 scale-95'
          } ${swipeDirection === 'left' ? 'animate-swipe-left' :
            swipeDirection === 'right' ? 'animate-swipe-right' : ''
          }`}
        style={
          tooltipPosition
            ? { top: tooltipPosition.top, left: tooltipPosition.left }
            : { visibility: 'hidden' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow - Only show for non-center positions */}
        {!isCenterPosition && tooltipPosition && (
          <div
            className={`absolute w-3 h-3 sm:w-4 sm:h-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform rotate-45 ${tooltipPosition.arrowPosition === 'top'
                ? '-top-1.5 sm:-top-2 left-1/2 -translate-x-1/2 border-t border-l'
                : tooltipPosition.arrowPosition === 'bottom'
                  ? '-bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 border-b border-r'
                  : tooltipPosition.arrowPosition === 'left'
                    ? '-left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 border-l border-b'
                    : '-right-1.5 sm:-right-2 top-1/2 -translate-y-1/2 border-r border-t'
              }`}
          />
        )}

        {/* Step Indicator Badge - Floating at top */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-brand-500 text-white text-[10px] sm:text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            <span>Step {currentStepIndex + 1}</span>
            <span className="opacity-70">of</span>
            <span>{totalSteps}</span>
          </div>
        </div>

        {/* Header with Icon & Skip - Responsive */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 mt-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
              <FaLightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {currentStep.title}
              </h3>
              {activeTutorial.name && (
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                  {activeTutorial.name}
                </span>
              )}
            </div>
          </div>
          {currentStep.showSkip !== false && (
            <button
              onClick={skipTutorial}
              className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              title="Skip tutorial (Esc)"
            >
              <FaTimes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Image (if any) - Responsive with landscape optimization */}
        {currentStep.image && (
          <div className={`mb-3 sm:mb-4 ${isLandscapeTablet ? 'float-right ml-4 w-40' : ''}`}>
            <img
              src={currentStep.image}
              alt=""
              className={`object-contain rounded-lg bg-gray-100 dark:bg-gray-700 ${isLandscapeTablet ? 'w-full h-24' : 'w-full h-24 sm:h-28 md:h-32'
                }`}
            />
          </div>
        )}

        {/* Description - Responsive text */}
        <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
          {currentStep.description}
        </p>

        {/* Navigation Buttons - Responsive */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={previousStep}
            disabled={isFirstStep}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors touch-manipulation ${isFirstStep
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200'
              }`}
          >
            <FaArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentStep.showSkip !== false && !isLastStep && (
              <button
                onClick={skipTutorial}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation hidden xs:block"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow touch-manipulation"
            >
              <span>
                {currentStep.actionText
                  ? currentStep.actionText
                  : isLastStep
                    ? 'Finish'
                    : 'Next'}
              </span>
              {!isLastStep && <FaArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            </button>
          </div>
        </div>

        {/* Keyboard Hints - Hidden on mobile, collapsible on desktop */}
        <div className="hidden sm:block mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaKeyboard className="w-3 h-3" />
            <span>{showKeyboardHints ? 'Hide' : 'Show'} keyboard shortcuts</span>
          </button>
          {showKeyboardHints && (
            <div className="flex items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-2 animate-fade-in">
              <span>
                <kbd className="px-1 md:px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] md:text-[10px] font-mono">←</kbd>{' '}
                Back
              </span>
              <span>
                <kbd className="px-1 md:px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] md:text-[10px] font-mono">→</kbd>{' '}
                Next
              </span>
              <span>
                <kbd className="px-1 md:px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] md:text-[10px] font-mono">Esc</kbd>{' '}
                Skip
              </span>
            </div>
          )}
        </div>

        {/* Swipe Hint - Mobile only, auto-hide after first use */}
        {showSwipeHint && (
          <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <FaHandPointRight className="w-3 h-3 animate-bounce-x" />
                Swipe
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="flex items-center gap-1">
                <FaHandPointLeft className="w-3 h-3 animate-bounce-x-reverse" />
                Navigate
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 30px rgba(255, 107, 53, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(255, 107, 53, 0.1), 0 0 40px rgba(255, 107, 53, 0.6);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        @keyframes swipe-left {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(-20px); opacity: 0.5; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes swipe-right {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(20px); opacity: 0.5; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-swipe-left {
          animation: swipe-left 0.3s ease-out;
        }
        .animate-swipe-right {
          animation: swipe-right 0.3s ease-out;
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        @keyframes bounce-x-reverse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
        .animate-bounce-x-reverse {
          animation: bounce-x-reverse 1s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body
  );
}

export default TutorialSpotlight;
