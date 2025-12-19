/**
 * LoadingOverlay Component
 * Full-screen or container overlay with loading indicator
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';

interface LoadingOverlayProps {
  /** Show/hide the overlay */
  isLoading: boolean;
  /** Loading message */
  message?: string;
  /** Sub-message or details */
  subMessage?: string;
  /** Progress value (0-100) for determinate loading */
  progress?: number;
  /** Show spinner instead of progress */
  showSpinner?: boolean;
  /** Overlay mode: fullscreen or container */
  mode?: 'fullscreen' | 'container';
  /** Allow dismissing overlay */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Blur background */
  blur?: boolean;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  subMessage,
  progress,
  showSpinner = false,
  mode = 'container',
  dismissible = false,
  onDismiss,
  blur = true,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`
            ${mode === 'fullscreen' ? 'fixed' : 'absolute'} 
            inset-0 z-50 flex flex-col items-center justify-center
            ${blur ? 'backdrop-blur-sm' : ''}
            bg-white/80 dark:bg-gray-900/80
          `}
          onClick={dismissible ? onDismiss : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex flex-col items-center gap-4 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spinner or Progress */}
            {showSpinner || progress === undefined ? (
              <div className="relative h-12 w-12">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-600"
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
            ) : (
              <div className="w-48">
                <ProgressBar
                  progress={progress}
                  showPercentage
                  size="lg"
                  animated
                />
              </div>
            )}

            {/* Message */}
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-white">
                {message}
              </p>
              {subMessage && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subMessage}
                </p>
              )}
            </div>

            {/* Dismiss button */}
            {dismissible && (
              <button
                onClick={onDismiss}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingOverlay;
