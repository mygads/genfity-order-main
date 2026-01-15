'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Menu Preview Card Component
 * 
 * Customer-facing preview of a menu item showing:
 * - Image, name, description
 * - Price (with promo pricing if applicable)
 * - Available addon categories
 * - Stock status
 * 
 * Used in Menu Builder preview tab to show how customers will see the menu
 */

interface AddonCategory {
  id: number;
  name: string;
  minSelection: number;
  maxSelection?: number;
}

interface MenuPreviewCardProps {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isPromo?: boolean;
  promoPrice?: number;
  trackStock?: boolean;
  stockQty?: number;
  addonCategories?: AddonCategory[];
  isActive?: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
}

export default function MenuPreviewCard({
  name,
  description,
  price,
  imageUrl,
  isPromo = false,
  promoPrice,
  trackStock = false,
  stockQty,
  addonCategories = [],
  isActive = true,
  isSpicy = false,
  isBestSeller = false,
  isSignature = false,
  isRecommended = false,
}: MenuPreviewCardProps) {
  const displayPrice = isPromo && promoPrice ? promoPrice : price;
  const hasDiscount = isPromo && promoPrice && promoPrice < price;
  const isOutOfStock = trackStock && (stockQty === null || stockQty === undefined || stockQty <= 0);
  const isLowStock = trackStock && stockQty !== null && stockQty !== undefined && stockQty > 0 && stockQty <= 5;

  const [imgSrc, setImgSrc] = React.useState(imageUrl || '/images/placeholder-food.png');

  React.useEffect(() => {
    setImgSrc(imageUrl || '/images/placeholder-food.png');
  }, [imageUrl]);

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg shadow-md overflow-hidden border border-stroke dark:border-stroke-dark transition-transform hover:scale-[1.02]">
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={name}
            fill
            className="object-cover"
            onError={() => {
              setImgSrc('/images/placeholder-food.png');
            }}
            unoptimized={imgSrc.startsWith('blob:')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {!isActive && (
            <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Tidak Aktif
            </span>
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              PROMO
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
              Habis
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Stok Terbatas
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="text-lg font-bold mb-2 line-clamp-2">{name}</h3>

        {/* Menu Attribute Badges */}
        {(isSpicy || isBestSeller || isSignature || isRecommended) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {isSpicy && (
              <div
                className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-brand-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                title="Spicy"
              >
                <Image
                  src="/images/menu-badges/spicy.png"
                  alt="Spicy"
                  fill
                  className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                />
              </div>
            )}
            {isBestSeller && (
              <div
                className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                title="Best Seller"
              >
                <Image
                  src="/images/menu-badges/best-seller.png"
                  alt="Best Seller"
                  fill
                  className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                />
              </div>
            )}
            {isSignature && (
              <div
                className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                title="Signature"
              >
                <Image
                  src="/images/menu-badges/signature.png"
                  alt="Signature"
                  fill
                  className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                />
              </div>
            )}
            {isRecommended && (
              <div
                className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                title="Recommended"
              >
                <Image
                  src="/images/menu-badges/recommended.png"
                  alt="Recommended"
                  fill
                  className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                />
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-xl font-bold text-primary">
            Rp {displayPrice.toLocaleString('id-ID')}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              Rp {price.toLocaleString('id-ID')}
            </span>
          )}
        </div>

        {/* Stock Info */}
        {trackStock && stockQty !== null && stockQty !== undefined && stockQty > 0 && (
          <div className="mb-3">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Stok:</span>
              <span className={`font-medium ${isLowStock ? 'text-amber-600' : 'text-success'}`}>
                {stockQty} tersedia
              </span>
            </div>
          </div>
        )}

        {/* Addon Categories */}
        {addonCategories.length > 0 && (
          <div className="border-t border-stroke dark:border-stroke-dark pt-3 mt-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Pilihan Tambahan:
            </p>
            <div className="space-y-1">
              {addonCategories.map((addon) => (
                <div key={addon.id} className="flex items-start text-xs text-gray-600 dark:text-gray-400">
                  <span className="mr-1">•</span>
                  <span>
                    {addon.name}
                    {addon.minSelection > 0 && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          className={`w-full mt-4 py-2 rounded font-medium transition-colors ${isOutOfStock || !isActive
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          disabled={isOutOfStock || !isActive}
        >
          {isOutOfStock ? 'Stok Habis' : !isActive ? 'Tidak Tersedia' : 'Tambah ke Keranjang'}
        </button>
      </div>
    </div>
  );
}
