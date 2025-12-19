/**
 * Detailed Menu Section Component
 * 
 * @description
 * List-style menu section for category-based menu items
 * with description and "Add" button
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

import Image from 'next/image';

interface MenuItem {
    id: string; // ✅ String from API (BigInt serialized)
    name: string;
    description: string;
    price: number;
    imageUrl: string | null;
    stockQty: number | null;
    isActive: boolean;
    trackStock: boolean;
    isPromo?: boolean;
    isSpicy?: boolean;
    isBestSeller?: boolean;
    isSignature?: boolean;
    isRecommended?: boolean;
    promoPrice?: number;
    addonCategories?: Array<{
        id: string;
        name: string;
    }>;
}

interface DetailedMenuSectionProps {
    title: string;
    items: MenuItem[];
    currency?: string; // Merchant currency
    onAddItem?: (item: MenuItem) => void;
    getItemQuantityInCart?: (menuId: string) => number; // Get quantity of item in cart
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
}

export default function DetailedMenuSection({
    title,
    items,
    currency = 'AUD',
    onAddItem,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
}: DetailedMenuSectionProps) {
    if (items.length === 0) return null;

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
        <section className="px-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                {items.map((item, index) => {
                    const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
                    const isLowStock = item.trackStock && item.stockQty !== null && item.stockQty > 0 && item.stockQty < 10;
                    const hasAddons = item.addonCategories && item.addonCategories.length > 0;
                    const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                    const isInCart = quantityInCart > 0;

                    return (
                        <div
                            key={item.id}
                            className={`flex gap-4 pb-4 ${isInCart ? 'border-l-4 border-l-orange-500 pl-3 -ml-4' : ''} ${index < items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700 mb-4' : ''
                                }`}
                        >
                            {/* Image */}
                            <div 
                                className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer"
                                onClick={() => isAvailable && onAddItem?.(item)}
                            >
                                <Image
                                    src={item.imageUrl || '/images/default-menu.png'}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                                {/* Low Stock Badge */}
                                {isLowStock && !isInCart && (
                                    <div className="absolute bottom-1 left-1 bg-orange-500 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        Stock &lt; 10
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div 
                                className="flex-1 flex flex-col justify-between min-w-0 cursor-pointer"
                                onClick={() => isAvailable && onAddItem?.(item)}
                            >
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {item.name}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                    {/* Menu Badges */}
                                    {(item.isSpicy || item.isBestSeller || item.isSignature || item.isRecommended) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.isSpicy && (
                                                <span>
                                                    🌶️
                                                </span>
                                            )}
                                            {item.isBestSeller && (
                                                <span>
                                                    ⭐
                                                </span>
                                            )}
                                            {item.isSignature && (
                                                <span>
                                                    👑
                                                </span>
                                            )}
                                            {item.isRecommended && (
                                                <span>
                                                    👍
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Price Display - Check for Promo */}
                                {item.isPromo && item.promoPrice ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {formatPrice(item.promoPrice)}
                                        </span>
                                        <span className="text-xs text-gray-400 line-through">
                                            {formatPrice(item.price)}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                                        {formatPrice(item.price)}
                                    </p>
                                )}
                            </div>

                            {/* Action */}
                            <div className="shrink-0 flex items-center">
                                {!isAvailable ? (
                                    <p className="text-red-500 text-sm font-medium">Sold out</p>
                                ) : isInCart ? (
                                    /* Quantity Controls */
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDecreaseQty?.(item.id);
                                            }}
                                            className="w-5 h-5 flex items-center justify-center text-black border border-black dark:border-orange-700 rounded-full hover:bg-gray-200 dark:hover:bg-orange-900/40 transition-colors"
                                            aria-label="Decrease quantity"
                                        >
                                            -
                                        </button>
                                        <span className="w-5 h-5 text-center text-sm font-bold text-gray-900 dark:text-white">
                                            {quantityInCart}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onIncreaseQty?.(item.id);
                                            }}
                                            className="w-5 h-5 flex items-center justify-center text-black border border-black dark:border-orange-700 rounded-full hover:bg-gray-200 dark:hover:bg-orange-900/40 transition-colors"
                                            aria-label="Increase quantity"
                                        >
                                            +
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onAddItem?.(item)}
                                        className="px-4 py-0.5 text-sm font-medium rounded-md transition-all border border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                        title="Add to cart"
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
