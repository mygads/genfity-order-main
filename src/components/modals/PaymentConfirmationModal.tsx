'use client';

import { formatCurrency } from '@/lib/utils/format';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalAmount: number;
  breakdown?: {
    subtotal: number;
    serviceCharge: number;
    tax: number;
  };
}

/**
 * Payment Confirmation Modal - Center Overlay
 * 
 * @specification FRONTEND_SPECIFICATION.md - Payment Confirmation
 * 
 * @description
 * Shows order total with breakdown before payment:
 * - Subtotal (base price)
 * - Service charge (5%)
 * - Tax (merchant-specific %)
 * - Total amount
 */
export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  breakdown,
}: PaymentConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - rgba(0,0,0,0.5), z-index 300 */}
      <div
        className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Center Modal - Max-width 320px */}
        <div
          className="bg-white rounded-xl max-w-[320px] w-full p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Question Icon - 48x48px */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF5F0] flex items-center justify-center text-3xl">
              ❓
            </div>
          </div>

          {/* Title - 20px/700 */}
          <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-2 text-center">
            Proses pembayaran sekarang?
          </h2>

          {/* Message - 14px/400 */}
          <p className="text-sm text-[#666666] mb-4 text-center">
            Pastikan pesanan Anda sudah benar
          </p>

          {/* ✅ FIXED: Total Recap with Breakdown */}
          <div className="bg-[#F9F9F9] rounded-lg p-3 mb-6">
            {breakdown ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Subtotal</span>
                  <span className="text-[#1A1A1A]">{formatCurrency(breakdown.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Biaya Layanan (5%)</span>
                  <span className="text-[#1A1A1A]">{formatCurrency(breakdown.serviceCharge)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Pajak</span>
                  <span className="text-[#1A1A1A]">{formatCurrency(breakdown.tax)}</span>
                </div>
                <div className="pt-2 border-t border-[#E0E0E0]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#666666]">Total:</span>
                    <span className="text-base font-bold text-[#FF6A35]">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[#666666]">Total:</span>
                <span className="text-base font-bold text-[#FF6A35]">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {/* Cek Lagi Button - 44px, outline */}
            <button
              onClick={onClose}
              className="flex-1 h-11 bg-white border-2 border-[#FF6A35] text-[#FF6A35] text-sm font-semibold rounded-lg hover:bg-[#FFF5F0] transition-all duration-200 active:scale-[0.98]"
            >
              Cek Lagi
            </button>

            {/* Bayar Sekarang Button - 44px, primary */}
            <button
              onClick={onConfirm}
              className="flex-1 h-11 bg-[#FF6A35] text-white text-sm font-semibold rounded-lg hover:bg-[#F1592A] transition-all duration-200 active:scale-[0.98]"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
