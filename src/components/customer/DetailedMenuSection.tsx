/**
 * Detailed Menu Section Component - Burjo ESB Style
 * 
 * Layout:
 * - Image: Fixed 70x70px, top-left
 * - Title: Top right of image
 * - Description: Below title, with ellipsis
 * - Badges: Below description
 * - Price + Add Button: Bottom row (price left, button right)
 * - Sold out: Replaces Add button, red text
 */

'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface MenuItem {
    id: string;
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
    currency?: string;
    onAddItem?: (item: MenuItem) => void;
    getItemQuantityInCart?: (menuId: string) => number;
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
    storeOpen?: boolean; // When false, hide Add button and apply gray overlay
}

export default function DetailedMenuSection({
    title,
    items,
    currency = 'AUD',
    onAddItem,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
    storeOpen = true,
}: DetailedMenuSectionProps) {
    const { t } = useTranslation();

    if (items.length === 0) return null;

    const formatPrice = (amount: number): string => {
        if (currency === 'IDR') {
            return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
        }
        const symbol = currency === 'AUD' ? 'A$' : currency === 'USD' ? '$' : currency;
        return `${symbol}${amount.toFixed(2)}`;
    };

    return (
        <section style={{ position: 'relative' }}>
            {/* Section Header */}
            <h2
                style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'rgb(33, 37, 41)',
                    padding: '0 16px',
                    marginBottom: '8px',
                }}
            >
                {title}
            </h2>

            {/* Menu Items */}
            <div style={{ padding: '0 16px' }}>
                {items.map((item, index) => {
                    const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
                    const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                    const isInCart = quantityInCart > 0;

                    return (
                        <div
                            key={item.id}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                gap: '12px',
                                paddingTop: '16px',
                                paddingBottom: '16px',
                                borderBottom: index < items.length - 1 ? '2px solid #e4e2e2ff' : 'none',
                            }}
                        >
                            {/* Border Left for item in cart */}
                            {isInCart && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: '-16px',
                                        top: '10px',
                                        bottom: '10px',
                                        width: '4px',
                                        backgroundColor: '#F05A28',
                                        borderRadius: '0 2px 2px 0',
                                    }}
                                />
                            )}

                            {/* Image - Fixed 70x70px */}
                            <div
                                onClick={() => isAvailable && onAddItem?.(item)}
                                style={{
                                    position: 'relative',
                                    width: '70px',
                                    height: '70px',
                                    flexShrink: 0,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: '#f3f4f6',
                                    cursor: isAvailable ? 'pointer' : 'default',
                                    filter: isAvailable ? 'none' : 'grayscale(100%)',
                                    opacity: isAvailable ? 1 : 0.6,
                                }}
                            >
                                <Image
                                    src={item.imageUrl || '/images/default-menu.png'}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="70px"
                                />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                {/* Title */}
                                <h4
                                    onClick={() => isAvailable && onAddItem?.(item)}
                                    className="line-clamp-2"
                                    style={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: isAvailable ? '#000000' : '#9CA3AF',
                                        lineHeight: '1.4',
                                        margin: 0,
                                        cursor: isAvailable ? 'pointer' : 'default',
                                    }}
                                >
                                    {item.name}
                                </h4>

                                {/* Description */}
                                {item.description && (
                                    <p
                                        onClick={() => isAvailable && onAddItem?.(item)}
                                        className="line-clamp-2"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            fontWeight: 400,
                                            color: isAvailable ? '#222222ff' : '#9CA3AF',
                                            lineHeight: '1.5',
                                            margin: '4px 0 0 0',
                                            cursor: isAvailable ? 'pointer' : 'default',
                                        }}
                                    >
                                        {item.description}
                                    </p>
                                )}

                                {/* Badges */}
                                {(item.isSpicy || item.isBestSeller || item.isSignature || item.isRecommended) && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                        {item.isBestSeller && (
                                            <div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" fill className="object-contain" />
                                            </div>
                                        )}
                                        {item.isSignature && (
                                            <div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/signature.png" alt="Signature" fill className="object-contain" />
                                            </div>
                                        )}
                                        {item.isSpicy && (
                                            <div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/spicy.png" alt="Spicy" fill className="object-contain" />
                                            </div>
                                        )}
                                        {item.isRecommended && (
                                            <div style={{ width: '28px', height: '28px', position: 'relative', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/recommended.png" alt="Recommended" fill className="object-contain" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bottom Row: Price + Button */}
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: 'auto',
                                        paddingTop: '8px',
                                    }}
                                >
                                    {/* Price */}
                                    <div onClick={() => isAvailable && onAddItem?.(item)} style={{ cursor: isAvailable ? 'pointer' : 'default' }}>
                                        {item.isPromo && item.promoPrice ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: isAvailable ? '#000000' : '#9CA3AF' }}>
                                                    {formatPrice(item.promoPrice)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#9CA3AF', textDecoration: 'line-through' }}>
                                                    {formatPrice(item.price)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: isAvailable ? '#000000' : '#9CA3AF' }}>
                                                {formatPrice(item.price)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Button Area - Add / Quantity / Sold out - Hide when store closed */}
                                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        {/* Low Stock Indicator */}
                                        {isAvailable && storeOpen && item.trackStock && item.stockQty !== null && item.stockQty <= 10 && (
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#f97316' }}>
                                                {t('customer.menu.onlyLeft', { count: item.stockQty })}
                                            </span>
                                        )}
                                        {!storeOpen ? (
                                            /* Store closed - no add button */
                                            null
                                        ) : !isAvailable ? (
                                            /* Sold out text */
                                            <span
                                                style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: '#EF4444',
                                                    fontFamily: 'Inter, sans-serif',
                                                }}
                                            >
                                                {t('customer.menu.soldOut')}
                                            </span>
                                        ) : isInCart ? (
                                            /* Quantity Controls */
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    height: '32px',
                                                    border: '1px solid #F05A28',
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDecreaseQty?.(item.id); }}
                                                    style={{
                                                        width: '32px',
                                                        height: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: '#F05A28',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                    }}
                                                >
                                                    −
                                                </button>
                                                <span
                                                    style={{
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: '#000000',
                                                        minWidth: '20px',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {quantityInCart}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onIncreaseQty?.(item.id); }}
                                                    style={{
                                                        width: '32px',
                                                        height: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: '#F05A28',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            /* Add Button */
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAddItem?.(item); }}
                                                style={{
                                                    height: '32px',
                                                    padding: '0 20px',
                                                    border: '1px solid #F05A28',
                                                    borderRadius: '8px',
                                                    backgroundColor: 'transparent',
                                                    color: '#F05A28',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    fontFamily: 'Inter, sans-serif',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {t('common.add')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
