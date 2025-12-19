/**
 * ProgressBar Component
 * Animated progress bar for showing operation progress
 */

'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Optional label to display */
  label?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  /** Animate the progress change */
  animated?: boolean;
  /** Striped style */
  striped?: boolean;
  /** Indeterminate mode (unknown progress) */
  indeterminate?: boolean;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorStyles = {
  primary: 'bg-brand-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

export function ProgressBar({
  progress,
  label,
  showPercentage = false,
  size = 'md',
  variant = 'primary',
  animated = true,
  striped = false,
  indeterminate = false,
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && !indeterminate && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${sizeStyles[size]}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          /* Indeterminate animation */
          <motion.div
            className={`h-full w-1/3 rounded-full ${colorStyles[variant]}`}
            animate={{
              x: ['-100%', '300%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ) : (
          /* Determinate progress */
          <motion.div
            className={`h-full rounded-full ${colorStyles[variant]} ${
              striped ? 'bg-stripes' : ''
            }`}
            initial={animated ? { width: 0 } : { width: `${clampedProgress}%` }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{
              duration: animated ? 0.5 : 0,
              ease: 'easeOut',
            }}
            style={{
              backgroundImage: striped
                ? 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)'
                : undefined,
              backgroundSize: striped ? '1rem 1rem' : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
