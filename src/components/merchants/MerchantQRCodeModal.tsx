"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface MerchantQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantName: string;
  merchantCode: string;
  merchantUrl: string;
}

/**
 * Merchant QR Code Modal Component
 * Displays QR code for merchant's customer page
 * Allows downloading QR code as PNG
 */
const MerchantQRCodeModal: React.FC<MerchantQRCodeModalProps> = ({
  isOpen,
  onClose,
  merchantName,
  merchantCode,
  merchantUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    // Generate QR code
    QRCode.toCanvas(
      canvasRef.current,
      merchantUrl,
      {
        width: 300,
        margin: 2,
        color: {
          dark: "#6366f1", // brand-500
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      },
      (error) => {
        if (error) {
          console.error("Error generating QR code:", error);
          return;
        }
        
        // Generate data URL for download
        if (canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          setQrDataUrl(dataUrl);
        }
      }
    );
  }, [isOpen, merchantUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `${merchantCode}-qr-code.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-99998 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-99999 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              QR Code
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {merchantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code Display */}
        <div className="mb-6">
          <div className="flex justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>
          
          {/* URL Display */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">URL:</p>
            <p className="mt-1 break-all text-sm text-gray-700 dark:text-gray-300">
              {merchantUrl}
            </p>
          </div>
        </div>

        {/* Download Button */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download QR Code (PNG)
          </button>
        </div>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Customers can scan this QR code to access your online store
        </p>
      </div>
    </>
  );
};

export default MerchantQRCodeModal;
