'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalAmount: number;
  currency?: string;
  breakdown?: {
    subtotal: number;
    serviceCharge?: number;
    tax: number;
  };
}

/**
 * Payment Confirmation Modal - ESB Bottom Sheet Style
 * 
 * Modal slides up from bottom with rounded top corners
 * matching ESB design exactly
 */
export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: PaymentConfirmationModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Handle smooth close
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <>
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
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-fade-out { animation: fadeOut 0.3s ease-in forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        .animate-slide-down { animation: slideDown 0.3s ease-in forwards; }
      `}</style>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[300] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={handleClose}
      />

      {/* Bottom Sheet Modal - ESB Style */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[301] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px 16px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* Cashier Illustration - ESB Style */}
          <div className="flex justify-center mt-2 mb-4">
            <Image
              src="/images/ic-pay-now.svg"
              alt="Payment confirmation"
              width={200}
              height={160}
              priority
            />
          </div>

          {/* Title - ESB Style */}
          <h3
            className="text-center mb-6"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1A1A1A',
              lineHeight: '24px'
            }}
          >
            Process payment now?
          </h3>

          {/* Buttons Row - ESB Style */}
          <div
            className="flex justify-between gap-3"
            style={{ padding: '0 8px' }}
          >
            {/* Check Again Button - Outline Style */}
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                height: '48px',
                backgroundColor: 'white',
                border: '1px solid #F05A28',
                borderRadius: '8px',
                color: '#F05A28',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Check Again
            </button>

            {/* Payment Now Button - Primary Style */}
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                height: '48px',
                backgroundColor: '#F05A28',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Payment Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
