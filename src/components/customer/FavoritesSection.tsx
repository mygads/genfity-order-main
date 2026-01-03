'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getFavorites, toggleFavorite } from '@/lib/utils/localStorage';

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl: string | null;
    stockQty: number | null;
    isActive: boolean;
    trackStock: boolean;
}

interface FavoritesSectionProps {
    merchantCode: string;
    currency?: string;
    allMenuItems: MenuItem[];
    onItemClick?: (item: MenuItem) => void;
    storeOpen?: boolean;
}

/**
 * FavoritesSection Component
 * 
 * Displays a horizontally scrolling list of favorite menu items.
 * Only shown if the user has at least one favorite.
 */
export default function FavoritesSection({
    merchantCode,
    currency = 'AUD',
    allMenuItems,
    onItemClick,
    storeOpen = true,
}: FavoritesSectionProps) {
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

    // Load favorites on mount
    useEffect(() => {
        const ids = getFavorites(merchantCode);
        setFavoriteIds(ids);
    }, [merchantCode]);

    // Listen for favorites updates
    useEffect(() => {
        const handleFavoritesUpdate = () => {
            const ids = getFavorites(merchantCode);
            setFavoriteIds(ids);
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
        };
    }, [merchantCode]);

    // Get favorite menu items
    const favoriteItems = Array.isArray(allMenuItems) 
        ? allMenuItems.filter(item => favoriteIds.includes(item.id))
        : [];

    // Don't render if no favorites
    if (favoriteItems.length === 0) return null;

    const formatPrice = (amount: number): string => {
        if (currency === 'IDR') {
            return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
        }
        const symbol = currency === 'AUD' ? 'A$' : currency === 'USD' ? '$' : currency;
        return `${symbol}${amount.toFixed(2)}`;
    };

    const handleRemoveFavorite = (e: React.MouseEvent, menuId: string) => {
        e.stopPropagation();
        toggleFavorite(merchantCode, menuId);
    };

    return (
        <div className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center justify-between px-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-red-500">❤️</span>
                    Your Favorites
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {favoriteItems.length} items
                </span>
            </div>

            {/* Horizontal Scroll */}
            <div className="px-4 overflow-x-auto scrollbar-hide">
                <div className="flex pb-2" style={{ gap: '10px' }}>
                    {favoriteItems.map((item) => {
                        const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));

                        return (
                            <div
                                key={item.id}
                                onClick={() => isAvailable && storeOpen && onItemClick?.(item)}
                                className={`shrink-0 bg-white px-3 pt-3 pb-2 ${isAvailable && storeOpen ? 'cursor-pointer' : 'opacity-60'}`}
                                style={{
                                    width: '140px',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                                }}
                            >
                                {/* Image */}
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '116px',
                                        height: '116px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f3f4f6',
                                    }}
                                >
                                    <Image
                                        src={item.imageUrl || '/images/default-menu.png'}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                        sizes="116px"
                                    />
                                    {/* Remove Favorite Button */}
                                    <button
                                        onClick={(e) => handleRemoveFavorite(e, item.id)}
                                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-red-50 transition-colors"
                                        aria-label="Remove from favorites"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Name */}
                                <h4 className="mt-2 text-xs font-semibold text-gray-900 dark:text-white line-clamp-2">
                                    {item.name}
                                </h4>

                                {/* Price */}
                                <p className="mt-1 text-xs font-bold text-orange-600">
                                    {formatPrice(item.price)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
