'use client';

import { useState, useEffect } from 'react';
import { saveTableNumber, getTableNumber } from '@/lib/utils/localStorage';
import { useTranslation } from '@/lib/i18n/useTranslation';

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
  const { t } = useTranslation();
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // ✅ Handle smooth close
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

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
      setError(t('customer.table.enterNumber'));
      return;
    }

    const num = parseInt(tableNumber);
    if (isNaN(num) || num < 1 || num > 999) {
      setError(t('customer.table.invalid'));
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
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        onClick={handleClose}
      />

      {/* Modal - Bottom Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-[100] flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <div className="w-full max-w-[500px] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white" style={{ margin: 0, lineHeight: 'normal' }}>
              {t('customer.table.title')}
            </h2>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('common.close')}
            >
              <svg width="18" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {/* Input Field */}
            <div className="mb-4">
              <label
                htmlFor="tableNumber"
                className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
              >
                {t('customer.table.title')}<span className="text-red-500">*</span>
              </label>
              <input
                id="tableNumber"
                type="text"
                maxLength={50}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('customer.table.enterNumber')}
                autoFocus
                className="w-full h-12 px-4 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 dark:focus:border-orange-400 transition-all"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Footer Button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleConfirm}
              disabled={!tableNumber.trim()}
              className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-fadeOut {
          animation: fadeOut 0.25s ease-in forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.25s ease-in forwards;
        }
      `}</style>
    </>
  );
}
