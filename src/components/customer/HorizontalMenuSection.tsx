/**
 * Horizontal Menu Section Component - Burjo ESB Style
 * 
 * @description
 * Horizontal scrolling menu section with grid cards
 * Matches Burjo ESB design specifications exactly
 */

'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import FavoriteButton from './FavoriteButton';

interface MenuItem {
    id: string;
    name: string;
    description?: string;
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
}

interface HorizontalMenuSectionProps {
    title: string;
    items: MenuItem[];
    currency?: string;
    merchantCode?: string;
    onViewAll?: () => void;
    onItemClick?: (item: MenuItem) => void;
    getItemQuantityInCart?: (menuId: string) => number;
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
    isPromoSection?: boolean; // Flag to show promo badge
    storeOpen?: boolean; // When false, hide Add button
}

export default function HorizontalMenuSection({
    title,
    items,
    currency = 'AUD',
    merchantCode = '',
    onViewAll,
    onItemClick,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
    isPromoSection = false,
    storeOpen = true,
}: HorizontalMenuSectionProps) {
    const { t } = useTranslation();

    const formatPrice = (amount: number): string => {
        if (currency === 'IDR') {
            return `Rp ${new Intl.NumberFormat('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Math.round(amount))}`;
        }
        if (currency === 'AUD') {
            return `A$${amount.toFixed(2)}`;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-3">
            {/* Section Header - Burjo Style: 16px, 700 weight, Inter, dark gray */}
            <div className="flex items-center justify-between px-4">
                <h2
                    className="uppercase"
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'rgb(33, 37, 41)',
                        letterSpacing: '0.025em',
                    }}
                >
                    {title}
                </h2>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
                    >
                        {t('common.viewAll')}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 12l4-4-4-4" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Horizontal Scroll Container */}
            <div className="px-4 overflow-x-auto scrollbar-hide">
                <div className="flex pb-2" style={{ gap: '10px' }}>
                    {items.map((item) => {
                        const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
                        const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                        const isInCart = quantityInCart > 0;

                        return (
                            <div
                                key={item.id}
                                className={`shrink-0 bg-white px-4 pt-4 pb-3 ${isAvailable ? '' : 'opacity-60'}`}
                                style={{
                                    width: '210px',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                                    borderBottom: isInCart ? '4px solid rgb(240, 90, 40)' : 'none',
                                }}
                            >
                                {/* Image Container - 178px square */}
                                <div
                                    onClick={() => isAvailable && onItemClick?.(item)}
                                    className={isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
                                    style={{
                                        position: 'relative',
                                        width: '178px',
                                        height: '178px',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f3f4f6',
                                    }}
                                >
                                    <Image
                                        src={item.imageUrl || '/images/default-menu.png'}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                        sizes="178px"
                                    />

                                    {/* Promo Badge - only show if isPromoSection */}
                                    {isPromoSection && (
                                        <div
                                            className="absolute top-2 left-2"
                                            style={{
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '20px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {t('customer.menu.promo')}
                                        </div>
                                    )}

                                    {/* Favorite Button */}
                                    {merchantCode && (
                                        <div className="absolute top-2 right-2">
                                            <FavoriteButton
                                                merchantCode={merchantCode}
                                                menuId={item.id}
                                                size="sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div style={{ marginTop: '10px' }}>
                                    {/* Product Name - 14px, 600 weight, max 2 lines */}
                                    <h3
                                        className="line-clamp-2"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: 'rgb(0, 0, 0)',
                                            lineHeight: '1.3',
                                            minHeight: '36px', // Fixed height for 2 lines
                                        }}
                                    >
                                        {item.name}
                                    </h3>

                                    {/* Badges - 24px circular */}
                                    {(item.isSpicy || item.isBestSeller || item.isSignature || item.isRecommended) && (
                                        <div className="flex flex-wrap" style={{ gap: '4px', marginTop: '8px', marginBottom: '4px' }}>
                                            {item.isBestSeller && (
                                                <div style={{ width: '24px', height: '24px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" fill className="object-cover" />
                                                </div>
                                            )}
                                            {item.isSignature && (
                                                <div style={{ width: '24px', height: '24px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <Image src="/images/menu-badges/signature.png" alt="Signature" fill className="object-cover" />
                                                </div>
                                            )}
                                            {item.isSpicy && (
                                                <div style={{ width: '24px', height: '24px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <Image src="/images/menu-badges/spicy.png" alt="Spicy" fill className="object-cover" />
                                                </div>
                                            )}
                                            {item.isRecommended && (
                                                <div style={{ width: '24px', height: '24px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <Image src="/images/menu-badges/recommended.png" alt="Recommended" fill className="object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Price - 14px, 600 weight */}
                                    <div style={{ marginTop: '8px' }}>
                                        {!isAvailable ? (
                                            <p style={{ color: '#ef4444', fontSize: '15px', fontWeight: 700 }}>{t('customer.menu.soldOut')}</p>
                                        ) : item.isPromo && item.promoPrice ? (
                                            <div className="flex items-center gap-2">
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                    {formatPrice(item.promoPrice)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                                    {formatPrice(item.price)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                {formatPrice(item.price)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Low Stock Indicator - Show when stock <= 10 */}
                                    {isAvailable && storeOpen && item.trackStock && item.stockQty !== null && item.stockQty <= 10 && (
                                        <p style={{ fontSize: '12px', fontWeight: 500, color: '#f97316', marginTop: '4px' }}>
                                            {t('customer.menu.onlyLeft', { count: item.stockQty })}
                                        </p>
                                    )}

                                    {/* Add Button - 28px height, 8px radius, orange border - Hide when store closed */}
                                    <div style={{ marginTop: '6px' }}>
                                        {isAvailable && storeOpen && (
                                            isInCart ? (
                                                <div
                                                    className="flex items-center justify-between"
                                                    style={{
                                                        height: '28px',
                                                        border: '0.66px solid rgb(240, 90, 40)',
                                                        borderRadius: '8px',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDecreaseQty?.(item.id); }}
                                                        className="flex items-center justify-center hover:bg-orange-50 transition-colors"
                                                        style={{ width: '36px', height: '100%', color: 'rgb(240, 90, 40)' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                        {quantityInCart}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onIncreaseQty?.(item.id); }}
                                                        className="flex items-center justify-center hover:bg-orange-50 transition-colors"
                                                        style={{ width: '36px', height: '100%', color: 'rgb(240, 90, 40)' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                                                    className="w-full flex items-center justify-center hover:bg-orange-50 transition-colors"
                                                    style={{
                                                        height: '28px',
                                                        border: '0.66px solid rgb(240, 90, 40)',
                                                        borderRadius: '8px',
                                                        backgroundColor: 'transparent',
                                                        color: 'rgb(240, 90, 40)',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        fontFamily: 'Inter, sans-serif',
                                                    }}
                                                >
                                                    {t('common.add')}
                                                </button>
                                            )
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
