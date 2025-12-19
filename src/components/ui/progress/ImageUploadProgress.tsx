/**
 * ImageUploadProgress Component
 * Animated image upload progress with percentage display
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FaCloudUploadAlt, FaCheckCircle, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

interface ImageUploadProgressProps {
  /** Upload progress from 0 to 100 */
  progress: number;
  /** Image file being uploaded */
  file?: File;
  /** Preview URL of the image */
  previewUrl?: string;
  /** Upload status */
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  /** Error message if status is error */
  errorMessage?: string;
  /** Callback to cancel upload */
  onCancel?: () => void;
  /** Callback to retry upload */
  onRetry?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'w-32 h-32',
    icon: 'h-8 w-8',
    text: 'text-xs',
    progressText: 'text-lg',
  },
  md: {
    container: 'w-48 h-48',
    icon: 'h-12 w-12',
    text: 'text-sm',
    progressText: 'text-2xl',
  },
  lg: {
    container: 'w-64 h-64',
    icon: 'h-16 w-16',
    text: 'text-base',
    progressText: 'text-3xl',
  },
};

export function ImageUploadProgress({
  progress,
  file,
  previewUrl,
  status,
  errorMessage,
  onCancel,
  onRetry,
  size = 'md',
}: ImageUploadProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const config = sizeConfig[size];

  // Animate progress number
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Calculate circle properties
  const radius = size === 'sm' ? 50 : size === 'md' ? 70 : 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className={`relative ${config.container}`}>
      {/* Background image preview */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: status === 'completed' ? 1 : 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-hidden rounded-xl"
          >
            <Image
              src={previewUrl}
              alt="Upload preview"
              fill
              className="object-cover"
              unoptimized
            />
            {status !== 'completed' && (
              <div className="absolute inset-0 bg-black/50" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress overlay */}
      <AnimatePresence>
        {status !== 'completed' && status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Circular progress */}
            <div className="relative">
              <svg
                className="transform -rotate-90"
                width={radius * 2 + 20}
                height={radius * 2 + 20}
              >
                {/* Background circle */}
                <circle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <motion.circle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  fill="none"
                  stroke={status === 'error' ? '#ef4444' : '#3b82f6'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {status === 'uploading' && (
                  <>
                    <motion.span
                      key={displayProgress}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`font-bold text-white ${config.progressText}`}
                    >
                      {Math.round(displayProgress)}%
                    </motion.span>
                    <span className={`text-white/80 ${config.text}`}>
                      Uploading...
                    </span>
                  </>
                )}

                {status === 'processing' && (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <FaCloudUploadAlt className={`text-white ${config.icon}`} />
                    </motion.div>
                    <span className={`mt-2 text-white/80 ${config.text}`}>
                      Processing...
                    </span>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <FaTimes className={`text-red-400 ${config.icon}`} />
                    <span className={`mt-2 text-center text-red-400 ${config.text}`}>
                      {errorMessage || 'Upload failed'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-2 flex gap-2">
              {status === 'uploading' && onCancel && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onCancel}
                  className="rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm hover:bg-white/30"
                >
                  Cancel
                </motion.button>
              )}
              {status === 'error' && onRetry && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onRetry}
                  className="rounded-full bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600"
                >
                  Retry
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed state */}
      <AnimatePresence>
        {status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-lg"
          >
            <FaCheckCircle className="h-5 w-5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle state */}
      {status === 'idle' && !previewUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
          <FaCloudUploadAlt className={`text-gray-400 ${config.icon}`} />
          <span className={`mt-2 text-gray-500 ${config.text}`}>
            {file ? file.name : 'No image selected'}
          </span>
        </div>
      )}

      {/* File info tooltip */}
      {file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-0 right-0 truncate text-center text-xs text-gray-500"
        >
          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </motion.div>
      )}
    </div>
  );
}

export default ImageUploadProgress;
