"use client";

import React from "react";
import Image from "next/image";

interface ImagePopupModalProps {
  show: boolean;
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

/**
 * Image Popup Modal Component
 * 
 * @description
 * Displays a full-size image in a modal overlay when clicked.
 * Provides a clean, professional viewing experience.
 * 
 * Features:
 * - Click outside to close
 * - ESC key to close
 * - Smooth transitions
 * - Responsive sizing
 */
export default function ImagePopupModal({
  show,
  imageUrl,
  altText,
  onClose,
}: ImagePopupModalProps) {
  // Handle ESC key press
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-110"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative h-full w-full">
          <Image
            src={imageUrl}
            alt={altText}
            width={1200}
            height={1200}
            className="h-auto w-auto max-h-[90vh] max-w-[90vw] object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
