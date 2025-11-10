'use client';

import { useState, FormEvent } from 'react';

interface TableNumberModalProps {
  merchantCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tableNumber: number) => void;
}

/**
 * Table Number Input Modal - Center Overlay
 * 
 * Based on FRONTEND_SPECIFICATION.md:
 * - Center overlay (not bottom sheet)
 * - Input validation 1-50
 * - localStorage key: table_{merchantCode}_dinein
 * - Auto-show if dine-in mode && no table number
 * - User cannot proceed without table number
 */
export default function TableNumberModal({
  merchantCode,
  isOpen,
  onClose,
  onSave,
}: TableNumberModalProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(tableNumber);
    
    // Validation: 1-50
    if (isNaN(num) || num < 1 || num > 50) {
      setError('Nomor meja harus antara 1-50');
      return;
    }

    // Save to localStorage
    const key = `table_${merchantCode}_dinein`;
    localStorage.setItem(key, num.toString());

    // Callback
    onSave(num);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - rgba(0,0,0,0.5), z-index 250 */}
      <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4">
        {/* Center Modal - Max-width 320px */}
        <div className="bg-white rounded-xl max-w-[320px] w-full p-6 shadow-2xl">
          {/* Title - 20px/700 */}
          <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-2 text-center">
            Nomor Meja
          </h2>

          {/* Description - 14px/400 */}
          <p className="text-sm text-[#666666] mb-6 text-center">
            Masukkan nomor meja Anda
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Input - Height 48px */}
            <input
              type="number"
              min="1"
              max="50"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: 21"
              className="w-full h-12 px-4 text-center text-lg font-semibold border border-[#E0E0E0] rounded-lg text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all mb-2"
              autoFocus
              required
            />

            {/* Error Message */}
            {error && (
              <p className="text-xs text-[#EF4444] mb-4 text-center">
                {error}
              </p>
            )}

            {/* Validation Hint */}
            <p className="text-xs text-[#999999] mb-6 text-center">
              Masukkan nomor antara 1-50
            </p>

            {/* Submit Button - 48px */}
            <button
              type="submit"
              disabled={!tableNumber}
              className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simpan
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
