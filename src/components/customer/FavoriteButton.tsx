'use client';

import { useState, useEffect, useCallback } from 'react';
import { toggleFavorite, isFavorite } from '@/lib/utils/localStorage';

interface FavoriteButtonProps {
    merchantCode: string;
    menuId: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * FavoriteButton Component
 * 
 * Heart icon button to toggle favorite status for menu items.
 * Uses localStorage for persistence and listens for updates from other components.
 */
export default function FavoriteButton({
    merchantCode,
    menuId,
    className = '',
    size = 'md',
}: FavoriteButtonProps) {
    const [isFavorited, setIsFavorited] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Check initial favorite status
    useEffect(() => {
        setIsFavorited(isFavorite(merchantCode, menuId));
    }, [merchantCode, menuId]);

    // Listen for favorites updates from other components
    useEffect(() => {
        const handleFavoritesUpdate = (e: CustomEvent) => {
            if (e.detail?.merchantCode === merchantCode && e.detail?.menuId === menuId) {
                setIsFavorited(e.detail.action === 'add');
            }
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate as EventListener);
        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate as EventListener);
        };
    }, [merchantCode, menuId]);

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        const newState = toggleFavorite(merchantCode, menuId);
        setIsFavorited(newState);

        // Reset animation
        setTimeout(() => setIsAnimating(false), 300);
    }, [merchantCode, menuId]);

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
    };

    const iconSizes = {
        sm: 14,
        md: 18,
        lg: 22,
    };

    return (
        <button
            onClick={handleToggle}
            className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        bg-white/90 
        backdrop-blur-sm
        shadow-sm
        hover:scale-110
        active:scale-95
        transition-all duration-200
        ${isAnimating ? 'animate-pulse' : ''}
        ${className}
      `}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <svg
                width={iconSizes[size]}
                height={iconSizes[size]}
                viewBox="0 0 24 24"
                fill={isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`
          transition-colors duration-200
          ${isFavorited
                        ? 'text-red-500'
                        : 'text-gray-400 hover:text-red-400'
                    }
        `}
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    );
}
