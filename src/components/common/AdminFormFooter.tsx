"use client";

import React from "react";

interface AdminFormFooterProps {
  /** Handler for cancel/back button click */
  onCancel: () => void;
  /** Optional handler for submit. If not provided, submit button acts as form submit */
  onSubmit?: () => void;
  /** Label for cancel button. Default: "Cancel" */
  cancelLabel?: string;
  /** Label for submit button. Default: "Save Changes" */
  submitLabel?: string;
  /** Label when submitting. Default: "Saving..." */
  submittingLabel?: string;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Whether submit button should be disabled */
  disabled?: boolean;
  /** Button type for submit button. Default: "submit" */
  submitType?: "submit" | "button";
  /** Whether to show submit button. Default: true */
  showSubmit?: boolean;
  /** Additional class for the container */
  className?: string;
  /** data-tutorial attribute for submit button (for tutorial spotlight) */
  submitDataTutorial?: string;
}

/**
 * AdminFormFooter - A fixed footer component for admin form pages
 * 
 * Provides consistent Cancel/Save buttons that remain fixed at the bottom
 * of the viewport while scrolling through long forms.
 * 
 * Features:
 * - Fixed position at bottom of viewport
 * - White background with shadow
 * - Proper spacing for sidebar
 * - Dark mode support
 * - Loading state support
 */
export default function AdminFormFooter({
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
  submitLabel = "Save Changes",
  submittingLabel = "Saving...",
  isSubmitting = false,
  disabled = false,
  submitType = "submit",
  showSubmit = true,
  className = "",
  submitDataTutorial,
}: AdminFormFooterProps) {
  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed footer */}
      <div className="h-20" aria-hidden="true" />
      
      {/* Fixed footer container */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-60 border-t border-gray-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:border-gray-800 dark:bg-gray-900 ${className}`}
      >
        {/* Content wrapper - matches sidebar offset */}
        <div className="ml-0 lg:ml-[290px]">
          <div className="flex items-center justify-end gap-3 px-6 py-4">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {cancelLabel}
            </button>

            {/* Submit Button */}
            {showSubmit && (
              <button
                type={submitType}
                onClick={submitType === "button" ? onSubmit : undefined}
                disabled={isSubmitting || disabled}
                data-tutorial={submitDataTutorial}
                className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
