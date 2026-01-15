/**
 * Confirm Dialog Component
 * Reusable confirmation modal for destructive actions
 */

"use client";

import React from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  hideCancel = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const variantColors = {
    danger: "bg-error-500 hover:bg-error-600 focus:ring-error-500/20",
    warning: "bg-warning-500 hover:bg-warning-600 focus:ring-warning-500/20",
    info: "bg-brand-500 hover:bg-brand-600 focus:ring-brand-500/20",
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 rounded-lg px-4 text-sm font-medium text-white focus:outline-none focus:ring-3 ${variantColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
