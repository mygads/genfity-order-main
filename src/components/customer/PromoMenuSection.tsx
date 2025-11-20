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
        <div className="space-y-3">
            {/* Header */}
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white px-4">
                Promo
            </h2>

            {/* Horizontal Scroll Container */}
            <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 px-4 pb-2">
                    {items.map((item) => {
                        const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                        const isInCart = quantityInCart > 0;

                        return (
                            <div
                                key={item.id}
                                onClick={() => onItemClick?.(item)}
                                className="flex-shrink-0 w-[280px] cursor-pointer active:scale-[0.98] transition-transform"
                            >
                                {/* Card */}
                                <div className={`relative overflow-hidden rounded-xl border-2 ${isInCart
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                        : 'border-red-500 bg-white dark:bg-gray-800'
                                    }`}>
                                    {/* Image */}
                                    <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                                sizes="280px"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <span className="text-4xl">🎉</span>
                                            </div>
                                        )}

                                        {/* Promo Badge */}
                                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-md font-bold text-xs">
                                            PROMO
                                        </div>

                                        {/* Quantity Badge */}
                                        {isInCart && (
                                            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                                {quantityInCart}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
                                                {item.name}
                                            </h3>
                                            {isInCart && (
                                                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                    In Cart
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-bold text-orange-500">
                                                {formatPrice(item.promoPrice || item.price)}
                                            </p>
                                            {item.promoPrice && (
                                                <p className="text-xs text-gray-400 line-through">
                                                    {formatPrice(item.price)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom scrollbar hide styles */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
