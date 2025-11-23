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
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string | null;
    stockQty: number | null;
    isActive: boolean;
    trackStock: boolean;
    isPromo?: boolean;
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
    getItemQuantityInCart?: (menuId: number) => number; // Get quantity of item in cart
}

export default function DetailedMenuSection({
    title,
    items,
    currency = 'AUD',
    onAddItem,
    getItemQuantityInCart,
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
                    const hasAddons = item.addonCategories && item.addonCategories.length > 0;
                    const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                    const isInCart = quantityInCart > 0;

                    return (
                        <div
                            key={item.id}
                            className={`flex gap-4 pb-4 ${index < items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700 mb-4' : ''
                                }`}
                        >
                            {/* Image */}
                            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                <Image
                                    src={item.imageUrl || '/images/default-menu.png'}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                                {/* Quantity Badge - Show when item is in cart */}
                                {isInCart && (
                                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                                        {quantityInCart}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {item.name}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                    {hasAddons && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Customizable
                                        </p>
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
                                ) : (
                                    <button
                                        onClick={() => onAddItem?.(item)}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${isInCart
                                            ? 'border-2 border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                            : 'border border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                            }`}
                                        title={isInCart ? 'Edit or add more' : 'Add to cart'}
                                    >
                                        {isInCart ? 'Edit' : 'Add'}
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
