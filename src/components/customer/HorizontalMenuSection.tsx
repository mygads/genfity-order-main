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
    id: string; // ✅ String from API (BigInt serialized)
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
    getItemQuantityInCart?: (menuId: string) => number; // Get quantity of item in cart
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
}

export default function HorizontalMenuSection({
    title,
    items,
    currency = 'AUD',
    onViewAll,
    onItemClick,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
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
                        const isLowStock = item.trackStock && item.stockQty !== null && item.stockQty > 0 && item.stockQty < 10;
                        const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                        const isInCart = quantityInCart > 0;

                        return (
                            <div
                                key={item.id}
                                className={`shrink-0 w-40 bg-white dark:bg-gray-800 rounded-lg transition-all overflow-hidden ${isInCart
                                    ? 'border-l-4 border-l-orange-500'
                                    : ''
                                    } ${isAvailable ? '' : 'opacity-60'
                                    }`}
                                style={{
                                    boxShadow: isInCart
                                        ? '0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.06)'
                                        : '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
                                    border: isInCart ? undefined : '0.5px solid rgb(229 231 235 / 1)',
                                }}
                            >
                                {/* Clickable Image Area */}
                                <div
                                    onClick={() => isAvailable && onItemClick?.(item)}
                                    className={`p-3 pb-0 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                    role="button"
                                    tabIndex={isAvailable ? 0 : -1}
                                >
                                    {/* Image */}
                                    <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                        <Image
                                            src={item.imageUrl || '/images/default-menu.png'}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            sizes="160px"
                                        />

                                        {/* Low Stock Badge - Bottom left */}
                                        {isLowStock && !isInCart && (
                                            <div className="absolute bottom-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                Stock &lt; 10
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-1 mt-2">
                                        <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">
                                            {item.name}
                                        </h3>

                                        {/* Price or Status */}
                                        <div>
                                            {!isAvailable ? (
                                                <p className="text-red-500 font-medium text-sm">Sold out</p>
                                            ) : item.isPromo && item.promoPrice ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-gray-900 dark:text-white">
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

                                {/* Bottom Action Area */}
                                <div className="px-3 pb-3 pt-2">
                                    {!isAvailable ? (
                                        <div className="h-9" />
                                    ) : isInCart ? (
                                        <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDecreaseQty?.(item.id);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-l-lg transition-colors"
                                                aria-label="Decrease quantity"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white min-w-6 text-center">
                                                {quantityInCart}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onIncreaseQty?.(item.id);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-r-lg transition-colors"
                                                aria-label="Increase quantity"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onItemClick?.(item);
                                            }}
                                            className="w-full h-9 border border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400 rounded-lg text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                        >
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
