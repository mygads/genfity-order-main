/**
 * Promo Menu Section Component
 * 
 * @description
 * Display promotional menu items in full-width cards
 * with red border accent
 * 
 * @specification copilot-instructions.md - Component Reusability
 */

'use client';

import Image from 'next/image';

interface PromoItem {
    id: number;
    name: string;
    price: number;
    promoPrice?: number;
    imageUrl: string | null;
}

interface PromoMenuSectionProps {
    items: PromoItem[];
    currency?: string; // Merchant currency
    onItemClick?: (item: PromoItem) => void;
    getItemQuantityInCart?: (menuId: number) => number; // Get quantity of item in cart
}

export default function PromoMenuSection({ items, currency = 'AUD', onItemClick, getItemQuantityInCart }: PromoMenuSectionProps) {
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-4">
                <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    Promo
                </h2>
            </div>

            {/* Menu Items Horizontal Scroll */}
            <div className="px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-2">
                    {items.map((item) => {
                        const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                        const isInCart = quantityInCart > 0;

                        return (
                            <div
                                key={item.id}
                                onClick={() => onItemClick?.(item)}
                                className={`shrink-0 w-40 bg-white dark:bg-gray-800 rounded-lg transition-all p-3 ${isInCart
                                    ? 'ring-2 ring-orange-500'
                                    : ''
                                    } cursor-pointer`}
                                style={{
                                    boxShadow: isInCart
                                        ? '0 8px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.06)'
                                        : '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
                                    border: '0.5px solid',
                                    borderColor: 'rgb(229 231 235 / 1)', // gray-200
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                {/* Image - Contained within card with rounded corners */}
                                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    <Image
                                        src={item.imageUrl || '/images/default-menu.png'}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                        sizes="160px"
                                    />

                                    {/* Quantity Badge */}
                                    {isInCart && (
                                        <div className="absolute top-2 right-2 bg-orange-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                                            {quantityInCart}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col gap-2 mt-2">
                                    <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>

                                    {/* Price */}
                                    <div>
                                        {item.promoPrice ? (
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
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
