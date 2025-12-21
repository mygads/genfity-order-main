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

interface RestaurantBannerProps {
  imageUrl?: string | null;
  bannerUrl?: string | null;
  merchantName: string;
}

export default function RestaurantBanner({ imageUrl, bannerUrl, merchantName }: RestaurantBannerProps) {
  // Use bannerUrl if available, otherwise fall back to imageUrl (logo)
  const displayImage = bannerUrl || imageUrl || '/images/no-outlet.png';

  return (
    <div
      className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
      style={{
        height: '214px',
        borderRadius: '0 0 8px 8px', // Bottom corners only
      }}
    >
      {/* Banner Image */}
      <div className="relative w-full h-full">
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
    </div>
  );
}

