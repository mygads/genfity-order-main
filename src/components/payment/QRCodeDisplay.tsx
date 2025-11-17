/**
 * QRCodeDisplay Component
 * 
 * Generate and display QR code from orderNumber
 * Includes download QR image functionality
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  showDownload?: boolean;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 256,
  label,
  showDownload = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Generate QR code
    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#1f2937', // gray-800
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H', // High error correction
      },
      (err) => {
        if (err) {
          console.error('QR Code generation error:', err);
          setError('Failed to generate QR code');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      // Convert canvas to blob and download
      canvasRef.current.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${value}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  if (error) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <p className="text-error-600 dark:text-error-400">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Label */}
      {label && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
          {label}
        </p>
      )}

      {/* QR Code Canvas */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: size,
            height: size,
          }}
        />
      </div>

      {/* Order Number Text */}
      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
        {value}
      </p>

      {/* Download Button */}
      {showDownload && (
        <button
          onClick={handleDownload}
          className="
            h-10 px-4 rounded-lg
            border border-gray-200 dark:border-gray-800
            bg-white dark:bg-gray-900
            text-gray-800 dark:text-white
            font-medium text-sm
            hover:bg-gray-50 dark:hover:bg-gray-800
            transition-colors duration-150
            flex items-center gap-2
          "
        >
          <span>📥</span>
          <span>Download QR Code</span>
        </button>
      )}
    </div>
  );
};
