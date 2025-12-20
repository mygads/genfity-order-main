/**
 * ConfirmationModal Component
 * 
 * Professional confirmation dialog for critical actions
 * Replaces window.confirm with better UX
 */

'use client';

import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'danger' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'warning',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    warning: {
      icon: 'text-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      button: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
    danger: {
      icon: 'text-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      button: 'bg-red-500 hover:bg-red-600 text-white',
    },
    info: {
      icon: 'text-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <FaTimes className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${styles.iconBg} mb-4`}>
            <FaExclamationTriangle className={`h-6 w-6 ${styles.icon}`} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 h-11 px-4 rounded-lg font-semibold text-sm transition-colors ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
