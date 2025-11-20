/**
 * Horizontal Menu Section Component
 * 
 * @description
 * Horizontal scrolling menu section with "View All" button
 * Shows menu items in a grid/carousel layout
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

import Image from 'next/image';

interface MenuItem {
    id: number;
    name: string;
    description?: string;
    price: number;
    imageUrl: string | null;
    stockQty: number | null;
    isActive: boolean;
    trackStock: boolean;
    isPromo?: boolean;
    promoPrice?: number;
}

interface HorizontalMenuSectionProps {
    title: string;
    items: MenuItem[];
    currency?: string; // Merchant currency (e.g., "AUD", "IDR", "USD")
    onViewAll?: () => void;
    onItemClick?: (item: MenuItem) => void;
    getItemQuantityInCart?: (menuId: number) => number; // Get quantity of item in cart
}

export default function HorizontalMenuSection({
    title,
    items,
    currency = 'AUD',
    onViewAll,
    onItemClick,
    getItemQuantityInCart,
}: HorizontalMenuSectionProps) {
    // Format currency based on merchant settings
    const formatPrice = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-4">
                <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    {title}
                </h2>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                    >
                        View All
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 12l4-4-4-4" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Menu Items Horizontal Scroll */}
            <div className="px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-2">
                    {items.map((item) => {
                        const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
                        const isLowStock = item.trackStock && item.stockQty !== null && item.stockQty > 0 && item.stockQty <= 10;
                        const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                        const isInCart = quantityInCart > 0;

                        return (
                            <div
                                key={item.id}
                                onClick={() => isAvailable && onItemClick?.(item)}
                                className={`shrink-0 w-40 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-2 transition-all ${isInCart
                                    ? 'border-orange-500 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
                                    } ${isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                                    }`}
                                role="button"
                                tabIndex={isAvailable ? 0 : -1}
                            >
                                {/* Image */}
                                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700">
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            sizes="160px"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <span className="text-4xl">🍽️</span>
                                        </div>
                                    )}

                                    {/* Quantity Badge - Priority over stock badge */}
                                    {isInCart ? (
                                        <div className="absolute top-2 right-2 bg-orange-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                                            {quantityInCart}
                                        </div>
                                    ) : isLowStock ? (
                                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded text-xs font-medium text-orange-600 dark:text-orange-400">
                                            Stock &lt; {item.stockQty}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col gap-2 p-3">
                                    <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>

                                    {/* Price or Status */}
                                    <div>
                                        {!isAvailable ? (
                                            <p className="text-red-500 font-medium text-sm">Sold out</p>
                                        ) : item.isPromo && item.promoPrice ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold text-orange-500">
                                                    {formatPrice(item.promoPrice)}
                                                </span>
                                                <span className="text-xs text-gray-400 line-through">
                                                    {formatPrice(item.price)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-gray-900 dark:text-white font-semibold">
                                                {formatPrice(item.price)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
