/**
 * Restaurant Banner Component
 * 
 * @description
 * Banner image for merchant with fallback to no-outlet.png
 * Simple and clean design without zoom controls
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

interface RestaurantBannerProps {
  imageUrl?: string | null;
  merchantName: string;
}

export default function RestaurantBanner({ imageUrl, merchantName }: RestaurantBannerProps) {
  return (
    <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
      {/* Banner Image */}
      <div className="relative w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || '/images/no-outlet.png'}
          alt={merchantName}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/no-outlet.png';
          }}
        />
      </div>
    </div>
  );
}
