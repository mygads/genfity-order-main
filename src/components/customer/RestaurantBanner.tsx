/**
 * Restaurant Banner Component
 * 
 * @description
 * Banner image for merchant with zoom controls
 * Similar to reference layout
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';

interface RestaurantBannerProps {
  imageUrl?: string | null;
  merchantName: string;
}

export default function RestaurantBanner({ imageUrl, merchantName }: RestaurantBannerProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.6));
  };

  return (
    <div className="relative w-full h-48 bg-gradient-to-b from-gray-300 to-gray-400 overflow-hidden">
      {/* Background Image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={merchantName}
          fill
          className="object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
          priority
        />
      ) : (
        // Placeholder illustration (simple building)
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative w-64 h-40">
            {/* Roof */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gray-500 flex gap-2 px-4 items-center justify-between">
              <div className="w-8 h-6 bg-gray-300 rounded-sm"></div>
              <div className="w-8 h-6 bg-white rounded-sm"></div>
              <div className="w-8 h-6 bg-gray-300 rounded-sm"></div>
              <div className="w-8 h-6 bg-white rounded-sm"></div>
              <div className="w-8 h-6 bg-gray-300 rounded-sm"></div>
            </div>
            
            {/* Building body */}
            <div className="absolute top-8 left-0 right-0 bottom-0 bg-gray-500 flex gap-3 p-4 items-start justify-between">
              {/* Left window */}
              <div className="w-16 h-24 bg-white rounded-lg border-4 border-gray-400 flex flex-col">
                <div className="flex-1 bg-gradient-to-br from-blue-100 to-blue-50 rounded-t-md"></div>
                <div className="h-1 bg-gray-300"></div>
                <div className="flex-1 bg-gradient-to-br from-blue-100 to-blue-50 rounded-b-md"></div>
              </div>
              
              {/* Center door */}
              <div className="w-16 h-24 bg-white rounded-lg border-4 border-gray-400">
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              
              {/* Right window */}
              <div className="w-16 h-24 bg-white rounded-lg border-4 border-gray-400 flex flex-col">
                <div className="flex-1 bg-gradient-to-br from-blue-100 to-blue-50 rounded-t-md"></div>
                <div className="h-1 bg-gray-300"></div>
                <div className="flex-1 bg-gradient-to-br from-blue-100 to-blue-50 rounded-b-md"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-gray-700/70 text-white flex items-center justify-center text-xl font-bold backdrop-blur-sm transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-gray-700/70 text-white flex items-center justify-center text-xl font-bold backdrop-blur-sm transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
