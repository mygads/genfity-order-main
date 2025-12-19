/**
 * OperationProgress Component
 * Multi-step operation progress indicator
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@/icons';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  errorMessage?: string;
}

interface OperationProgressProps {
  /** Steps in the operation */
  steps: Step[];
  /** Current step index */
  currentStep?: number;
  /** Overall progress (0-100) */
  overallProgress?: number;
  /** Show step details */
  showDetails?: boolean;
  /** Compact mode */
  compact?: boolean;
}

export function OperationProgress({
  steps,
  currentStep = 0,
  overallProgress,
  showDetails = true,
  compact = false,
}: OperationProgressProps) {
  return (
    <div className="w-full">
      {/* Overall progress bar */}
      {overallProgress !== undefined && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Overall Progress
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 ${compact ? 'text-sm' : ''}`}
          >
            {/* Status indicator */}
            <div className="flex-shrink-0">
              {step.status === 'completed' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </motion.div>
              ) : step.status === 'in-progress' ? (
                <div className="relative h-6 w-6">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-brand-500"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      borderTopColor: 'transparent',
                    }}
                  />
                </div>
              ) : step.status === 'error' ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600">
                  <span className="text-xs font-medium text-gray-400">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <p
                className={`truncate ${
                  step.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : step.status === 'in-progress'
                    ? 'font-medium text-brand-600 dark:text-brand-400'
                    : step.status === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </p>
              {step.status === 'error' && step.errorMessage && showDetails && (
                <p className="mt-0.5 text-xs text-red-500">{step.errorMessage}</p>
              )}
            </div>

            {/* Status text */}
            {showDetails && !compact && (
              <span
                className={`flex-shrink-0 text-xs ${
                  step.status === 'completed'
                    ? 'text-green-500'
                    : step.status === 'in-progress'
                    ? 'text-brand-500'
                    : step.status === 'error'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                {step.status === 'completed'
                  ? 'Done'
                  : step.status === 'in-progress'
                  ? 'Processing...'
                  : step.status === 'error'
                  ? 'Failed'
                  : 'Pending'}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default OperationProgress;
