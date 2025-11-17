/**
 * OrderNumberDisplay Component
 * 
 * Displays orderNumber for payment reference
 * Features: Copy to clipboard, QR code integration
 */

'use client';

import React, { useState } from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';

interface OrderNumberDisplayProps {
  orderNumber: string;
  showQRCode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: {
    container: 'p-3',
    text: 'text-xl',
    label: 'text-xs',
    button: 'h-8 px-3 text-xs',
  },
  md: {
    container: 'p-4',
    text: 'text-2xl',
    label: 'text-sm',
    button: 'h-10 px-4 text-sm',
  },
  lg: {
    container: 'p-6',
    text: 'text-3xl',
    label: 'text-base',
    button: 'h-12 px-6 text-base',
  },
};

export const OrderNumberDisplay: React.FC<OrderNumberDisplayProps> = ({
  orderNumber,
  showQRCode = true,
  size = 'md',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const sizeStyle = SIZE_STYLES[size];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={className}>
      {/* Order Number Display */}
      <div
        className={`
          bg-brand-50 dark:bg-brand-900/20 
          border-2 border-brand-200 dark:border-brand-800 
          rounded-xl ${sizeStyle.container}
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className={`${sizeStyle.label} text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide mb-1`}>
              Order Number
            </p>
            <p className={`${sizeStyle.text} font-black text-brand-700 dark:text-brand-300 font-mono tracking-wider`}>
              {orderNumber}
            </p>
            <p className={`${sizeStyle.label} text-brand-500 dark:text-brand-500 mt-1`}>
              For payment reference
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`
                ${sizeStyle.button}
                rounded-lg
                bg-brand-500 hover:bg-brand-600
                text-white font-medium
                transition-colors duration-150
                shadow-sm hover:shadow-md
                flex items-center gap-2
              `}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* QR Code Button */}
            {showQRCode && (
              <button
                onClick={() => setShowQR(!showQR)}
                className={`
                  ${sizeStyle.button}
                  rounded-lg
                  border border-brand-300 dark:border-brand-700
                  bg-white dark:bg-gray-900
                  text-brand-700 dark:text-brand-300
                  font-medium
                  transition-colors duration-150
                  hover:bg-brand-50 dark:hover:bg-brand-900/30
                  flex items-center gap-2
                `}
                title="Show QR Code"
              >
                <span>📱</span>
                <span>{showQR ? 'Hide QR' : 'Show QR'}</span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        {showQR && showQRCode && (
          <div className="mt-4 pt-4 border-t-2 border-brand-200 dark:border-brand-800">
            <QRCodeDisplay
              value={orderNumber}
              label="Scan to verify order"
              size={200}
            />
          </div>
        )}
      </div>
    </div>
  );
};
