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
 * @description
 * Modal for dine-in customers to input their table number.
 * Table number is saved to localStorage and used throughout the ordering flow.
 * 
 * @specification
 * - Full-screen overlay modal
 * - Numeric input for table number (1-99)
 * - Save to localStorage: table:{merchantCode}
 * - Auto-fill from localStorage if exists
 * - Reset after checkout success
 * 
 * @localStorage
 * - Key: genfity_table_{merchantCode}
 * - Value: { merchantCode, tableNumber, setAt }
 * - Cleared after order completed or user returns to merchant page
 */
export default function TableNumberModal({
  merchantCode,
  isOpen,
  onClose,
  onConfirm,
}: TableNumberModalProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');

  // Load saved table number on mount
  useEffect(() => {
    if (isOpen) {
      const saved = getTableNumber(merchantCode);
      if (saved && saved.tableNumber) {
        setTableNumber(saved.tableNumber);
      }
    }
  }, [isOpen, merchantCode]);

  const handleConfirm = () => {
    setError('');

    // Validate input
    if (!tableNumber.trim()) {
      setError('Masukkan nomor meja');
      return;
    }

    const num = parseInt(tableNumber);
    if (isNaN(num) || num < 1 || num > 999) {
      setError('Nomor meja tidak valid (1-999)');
      return;
    }

    // Save to localStorage
    saveTableNumber(merchantCode, tableNumber);

    // Callback
    onConfirm(tableNumber);
  };

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

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-[420px] mx-auto animate-slideUp">
        <div className="bg-white rounded-t-2xl shadow-2xl">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {/* Icon & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <span className="text-3xl">🍽️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Nomor Meja
              </h2>
              <p className="text-sm text-gray-600">
                Masukkan nomor meja Anda untuk melanjutkan
              </p>
            </div>

            {/* Input */}
            <div className="mb-6">
              <label
                htmlFor="tableNumber"
                className="block text-xs font-semibold text-gray-700 mb-2"
              >
                Nomor Meja
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
                placeholder="Contoh: 5"
                autoFocus
                className="w-full h-14 px-4 text-2xl text-center font-bold border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 text-center">
                Nomor meja dapat ditemukan di meja Anda
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98] shadow-sm"
              >
                Konfirmasi
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
