/**
 * Mode Unavailable Modal
 * 
 * @description
 * Shows a notification when the customer's selected order mode (Dine In or Takeaway)
 * becomes unavailable during their ordering session.
 * 
 * Provides options to:
 * 1. Switch to the alternative mode (if available)
 * 2. Continue browsing (go back to merchant page)
 * 
 * @specification copilot-instructions.md - Mode Transition Handling
 */

"use client";

import React from "react";

interface ModeUnavailableModalProps {
  isOpen: boolean;
  currentMode: 'dinein' | 'takeaway' | 'delivery';
  alternativeMode: 'dinein' | 'takeaway' | 'delivery' | null;
  dineInLabel?: string;
  takeawayLabel?: string;
  deliveryLabel?: string;
  onSwitchMode: () => void;
  onGoBack: () => void;
}

const ModeUnavailableModal: React.FC<ModeUnavailableModalProps> = ({
  isOpen,
  currentMode,
  alternativeMode,
  dineInLabel = 'Dine In',
  takeawayLabel = 'Takeaway',
  deliveryLabel = 'Delivery',
  onSwitchMode,
  onGoBack,
}) => {
  if (!isOpen) return null;

  const getLabel = (m: 'dinein' | 'takeaway' | 'delivery') => {
    if (m === 'dinein') return dineInLabel;
    if (m === 'takeaway') return takeawayLabel;
    return deliveryLabel;
  };

  const currentModeLabel = getLabel(currentMode);
  const alternativeModeLabel = alternativeMode ? getLabel(alternativeMode) : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onGoBack}
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-7 w-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="mb-2 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
                    {currentModeLabel} Not Available
          </h3>
        </div>

        {/* Message */}
        <div className="mb-6 text-center">
          <p className="text-sm text-gray-600">
            {alternativeMode ? (
              <>
                The <span className="font-medium">{currentModeLabel}</span> mode is no longer available at this time.
                Would you like to switch to <span className="font-medium">{alternativeModeLabel}</span> instead?
              </>
            ) : (
              <>
                The store is currently not accepting <span className="font-medium">{currentModeLabel}</span> orders.
                Please try again later.
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {alternativeMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="h-12 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            >
              Switch to {alternativeModeLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onGoBack}
            className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {alternativeMode ? 'Go Back' : 'Return to Store'}
          </button>
        </div>

        {/* Cart Notice */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Your cart items will be preserved when switching modes
        </p>
      </div>
    </div>
  );
};

export default ModeUnavailableModal;
