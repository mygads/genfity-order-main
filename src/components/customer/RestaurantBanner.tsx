/**
 * Restaurant Banner Component - Burjo ESB Style
 * 
 * @description
 * Banner image for merchant with fallback to no-outlet.png
 * Matches Burjo ESB reference:
 * - Height: 214px
 * - Border radius: 8px bottom corners
 * - Object-fit: cover
 * 
 * @specification Burjo ESB Reference
 */

'use client';

import { useState, useEffect } from 'react';

interface RestaurantBannerProps {
  imageUrl?: string | null;
  bannerUrl?: string | null;
  merchantName: string;
  isClosed?: boolean; // When true, apply gray overlay
}

export default function RestaurantBanner({ imageUrl, bannerUrl, merchantName, isClosed = false }: RestaurantBannerProps) {
  // Use a cache-busting parameter that updates every 30 seconds
  // This ensures fresh images are loaded when banner is updated
  const [cacheBuster, setCacheBuster] = useState(() => Math.floor(Date.now() / 30000));

  useEffect(() => {
    // Update cache buster when bannerUrl changes
    setCacheBuster(Math.floor(Date.now() / 30000));
  }, [bannerUrl]);

  // Use bannerUrl if available, otherwise fall back to imageUrl (logo)
  const baseImage = bannerUrl || imageUrl || '/images/no-outlet.png';

  // Add cache-busting for external URLs (blob storage) to prevent stale cached images
  const displayImage = baseImage.startsWith('http')
    ? `${baseImage}${baseImage.includes('?') ? '&' : '?'}v=${cacheBuster}`
    : baseImage;

  return (
    <div
      className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
      style={{
        height: '214px',
        borderRadius: '0 0 8px 8px', // Bottom corners only
      }}
    >
      {/* Banner Image */}
      <div className={`relative w-full h-full ${isClosed ? 'grayscale opacity-60' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={merchantName}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/no-outlet.png';
          }}
        />
      </div>
      
      {/* Gray overlay when closed */}
      {isClosed && (
        <div 
          className="absolute inset-0 bg-gray-900/30 pointer-events-none"
          style={{ borderRadius: '0 0 8px 8px' }}
        />
      )}
    </div>
  );
}

