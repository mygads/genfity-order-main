'use client';

import { useState, useEffect } from 'react';
import { saveTableNumber, getTableNumber } from '@/lib/utils/localStorage';

interface TableNumberModalProps {
  merchantCode: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableNumber: string) => void;
}

/**
 * GENFITY Table Number Selection Modal
 * 
 * Ultra-minimal mobile-first modal for dine-in table number input.
 * 
 * Design principles:
 * - Mobile-first: max-w-[420px] centered
 * - Clean typography with proper hierarchy
 * - English labels for accessibility
 * - Dark mode support throughout
 * - Minimal visual elements, maximum readability
 * - Bottom sheet style with smooth animations
 * 
 * @localStorage
 * - Key: genfity_table_{merchantCode}
 * - Value: { merchantCode, tableNumber, setAt }
 * 
 * @validation
 * - Range: 1-999
 * - Required field
 * - Numeric input only
 */
export default function TableNumberModal({
  merchantCode,
  isOpen,
  onClose,
  onConfirm,
}: TableNumberModalProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');

  /**
   * Load saved table number on mount
   */
  useEffect(() => {
    if (isOpen) {
      const saved = getTableNumber(merchantCode);
      if (saved && saved.tableNumber) {
        setTableNumber(saved.tableNumber);
        console.log('📍 Auto-filled table number:', saved.tableNumber);
      }
    }
  }, [isOpen, merchantCode]);

  /**
   * Handle table number confirmation with validation
   */
  const handleConfirm = () => {
    setError('');

    if (!tableNumber.trim()) {
      setError('Please enter a table number');
      return;
    }

    const num = parseInt(tableNumber);
    if (isNaN(num) || num < 1 || num > 999) {
      setError('Invalid table number (1-999)');
      return;
    }

    saveTableNumber(merchantCode, tableNumber);
    console.log('✅ Table number saved:', tableNumber);
    onConfirm(tableNumber);
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal - Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center animate-slideUp">
        <div className="w-full max-w-[420px] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {/* Icon & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-full mb-3">
                <span className="text-2xl">🍽️</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Table Number
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter your table number to continue
              </p>
            </div>

            {/* Input */}
            <div className="mb-6">
              <label
                htmlFor="tableNumber"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2"
              >
                Table Number <span className="text-orange-500">*</span>
              </label>
              <input
                id="tableNumber"
                type="number"
                inputMode="numeric"
                min="1"
                max="999"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 5"
                autoFocus
                className="w-full h-14 px-4 text-2xl text-center font-bold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-all"
              />
              {error && (
                <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 text-center" role="alert">
                  {error}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 text-center">
                Table number can be found on your table
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-[0.98] border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors active:scale-[0.98] shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
