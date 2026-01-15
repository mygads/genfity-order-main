'use client';

/**
 * Animated Pointer Component
 * 
 * @description Animated pointer/finger that points to specific elements
 * @features Pulsing animation, configurable direction, auto-positioning, custom icons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';
import { 
  FaHandPointer, 
  FaMousePointer, 
  FaHandPointRight, 
  FaHandPointLeft, 
  FaHandPointUp, 
  FaHandPointDown,
  FaArrowRight,
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaCheck,
  FaPlus,
  FaCog,
  FaEdit,
  FaSearch,
  FaEye
} from 'react-icons/fa';

export type PointerDirection = 'up' | 'down' | 'left' | 'right';
export type PointerIconName = 
  | 'finger' 
  | 'cursor' 
  | 'hand-right' 
  | 'hand-left' 
  | 'hand-up' 
  | 'hand-down'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'check'
  | 'plus'
  | 'cog'
  | 'edit'
  | 'search'
  | 'eye';

// Map icon names to components
const ICON_MAP: Record<PointerIconName, IconType> = {
  'finger': FaHandPointer,
  'cursor': FaMousePointer,
  'hand-right': FaHandPointRight,
  'hand-left': FaHandPointLeft,
  'hand-up': FaHandPointUp,
  'hand-down': FaHandPointDown,
  'arrow-right': FaArrowRight,
  'arrow-left': FaArrowLeft,
  'arrow-up': FaArrowUp,
  'arrow-down': FaArrowDown,
  'check': FaCheck,
  'plus': FaPlus,
  'cog': FaCog,
  'edit': FaEdit,
  'search': FaSearch,
  'eye': FaEye,
};

export interface AnimatedPointerProps {
  /** CSS selector of target element */
  targetSelector: string;
  /** Direction pointer points to (relative to target) */
  direction?: PointerDirection;
  /** Whether to show the pointer */
  visible?: boolean;
  /** Text label next to pointer (e.g., "Click here") */
  label?: string;
  /** Pointer style - 'finger' | 'cursor' or any icon name */
  variant?: PointerIconName;
  /** Custom icon component (overrides variant) */
  icon?: PointerIconName;
  /** Offset from target element */
  offset?: number;
  /** Callback when pointer is clicked */
  onPointerClick?: () => void;
  /** Auto-hide after ms (0 = never) */
  autoHideMs?: number;
  /** Size of the pointer (small, medium, large) */
  size?: 'sm' | 'md' | 'lg';
  /** Mobile-optimized (larger touch targets) */
  mobileOptimized?: boolean;
}

// Get rotation angle based on direction
function getRotation(direction: PointerDirection): number {
  switch (direction) {
    case 'up': return -45;
    case 'down': return 135;
    case 'left': return -135;
    case 'right': return 45;
  }
}

// Get position offset based on direction
function getPositionOffset(direction: PointerDirection, offset: number): { x: number; y: number } {
  switch (direction) {
    case 'up': return { x: 0, y: offset };
    case 'down': return { x: 0, y: -offset };
    case 'left': return { x: offset, y: 0 };
    case 'right': return { x: -offset, y: 0 };
  }
}

export function AnimatedPointer({
  targetSelector,
  direction = 'right',
  visible = true,
  label,
  variant = 'finger',
  icon,
  offset = 20,
  onPointerClick,
  autoHideMs = 0,
  size = 'md',
  mobileOptimized = false,
}: AnimatedPointerProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(visible);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive size configurations for different devices
  const sizes = {
    sm: { 
      ring1: 'w-6 h-6 sm:w-8 sm:h-8', 
      ring2: 'w-5 h-5 sm:w-6 sm:h-6', 
      icon: 'w-5 h-5 sm:w-6 sm:h-6', 
      iconInner: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      labelText: 'text-[10px] sm:text-xs',
      labelPadding: 'px-1.5 py-0.5 sm:px-2 sm:py-1',
    },
    md: { 
      ring1: 'w-10 h-10 sm:w-12 sm:h-12', 
      ring2: 'w-8 h-8 sm:w-10 sm:h-10', 
      icon: 'w-7 h-7 sm:w-8 sm:h-8', 
      iconInner: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
      labelText: 'text-[10px] sm:text-xs',
      labelPadding: 'px-2 py-0.5 sm:px-2.5 sm:py-1',
    },
    lg: { 
      ring1: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16', 
      ring2: 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14', 
      icon: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10', 
      iconInner: 'w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5',
      labelText: 'text-xs sm:text-sm',
      labelPadding: 'px-2.5 py-1 sm:px-3 sm:py-1.5',
    },
  };

  // Use larger size on mobile if mobileOptimized for better touch targets
  const effectiveSize = mobileOptimized && isMobile ? 'lg' : size;
  const sizeConfig = sizes[effectiveSize];

  // Calculate position based on target element - debounced to prevent infinite loops
  const calculatePosition = useCallback(() => {
    const element = document.querySelector(targetSelector);
    if (!element) {
      setPosition(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const posOffset = getPositionOffset(direction, offset);
    
    let x: number;
    let y: number;

    // Position relative to element edge based on direction
    switch (direction) {
      case 'up':
        x = rect.left + rect.width / 2 + posOffset.x;
        y = rect.bottom + posOffset.y;
        break;
      case 'down':
        x = rect.left + rect.width / 2 + posOffset.x;
        y = rect.top + posOffset.y;
        break;
      case 'left':
        x = rect.right + posOffset.x;
        y = rect.top + rect.height / 2 + posOffset.y;
        break;
      case 'right':
        x = rect.left + posOffset.x;
        y = rect.top + rect.height / 2 + posOffset.y;
        break;
    }

    // Only update if position actually changed (prevents infinite loops)
    setPosition(prev => {
      if (prev && Math.abs(prev.x - x) < 1 && Math.abs(prev.y - y) < 1) {
        return prev; // No significant change
      }
      return { x, y };
    });
  }, [targetSelector, direction, offset]);

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update visibility
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // Auto-hide timer
  useEffect(() => {
    if (autoHideMs > 0 && isVisible) {
      const timer = setTimeout(() => setIsVisible(false), autoHideMs);
      return () => clearTimeout(timer);
    }
  }, [autoHideMs, isVisible]);

  // Calculate and update position - with debouncing and retry mechanism
  useEffect(() => {
    if (!isVisible) return;

    let retryCount = 0;
    const maxRetries = 10;
    let retryTimer: NodeJS.Timeout | null = null;

    // Retry function for when element isn't found initially
    const attemptCalculation = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        calculatePosition();
      } else if (retryCount < maxRetries) {
        retryCount++;
        retryTimer = setTimeout(attemptCalculation, 100);
      }
    };

    // Initial calculation with retry
    attemptCalculation();

    // Debounce updates to prevent infinite loops
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        calculatePosition();
      }, 16); // ~60fps
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    // NOTE: Removed MutationObserver to prevent infinite loops
    // Position will update on scroll/resize which covers most cases

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [calculatePosition, isVisible, targetSelector]);

  if (!mounted || !isVisible || !position) return null;

  const rotation = getRotation(direction);
  
  // Determine which icon to use
  const iconName = icon || variant;
  const Icon = ICON_MAP[iconName] || FaHandPointer;

  // Label position based on direction
  const labelPosition = {
    up: 'top-full mt-2',
    down: 'bottom-full mb-2',
    left: 'left-full ml-2',
    right: 'right-full mr-2',
  }[direction];

  return createPortal(
    <div
      className="fixed z-9999 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Pointer Container */}
      <div
        className={`relative flex items-center justify-center ${onPointerClick ? 'pointer-events-auto cursor-pointer' : ''}`}
        onClick={onPointerClick}
      >
        {/* Pulsing Ring */}
        <div className={`absolute ${sizeConfig.ring1} rounded-full bg-brand-500/20 animate-ping`} />
        <div className={`absolute ${sizeConfig.ring2} rounded-full bg-brand-500/30 animate-pulse`} />
        
        {/* Pointer Icon */}
        <div
          className={`relative z-10 ${sizeConfig.icon} bg-brand-500 rounded-full flex items-center justify-center shadow-lg animate-bounce`}
          style={{
            animationDuration: '1s',
          }}
        >
          <Icon
            className={`${sizeConfig.iconInner} text-white`}
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>

        {/* Label - Responsive sizing */}
        {label && (
          <div
            className={`absolute ${labelPosition} whitespace-nowrap bg-brand-500 text-white ${sizeConfig.labelText} font-semibold ${sizeConfig.labelPadding} rounded-md shadow-lg animate-pulse`}
          >
            {label}
            {/* Arrow pointing to icon */}
            <div
              className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-500 transform rotate-45 ${
                direction === 'up' ? '-top-0.5 sm:-top-1 left-1/2 -translate-x-1/2' :
                direction === 'down' ? '-bottom-0.5 sm:-bottom-1 left-1/2 -translate-x-1/2' :
                direction === 'left' ? 'top-1/2 -left-0.5 sm:-left-1 -translate-y-1/2' :
                'top-1/2 -right-0.5 sm:-right-1 -translate-y-1/2'
              }`}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default AnimatedPointer;
