/**
 * Detailed Menu Section Component - Burjo ESB Style
 * 
 * Supports multiple view modes:
 * - list: Current layout, 1 item per row with 70x70 image
 * - grid-2: 2 cards per row, styled like HorizontalMenuSection
 * - grid-3: 3 cards per row, compact view
 */

'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import FavoriteButton from './FavoriteButton';
import LazyMenuImage from './LazyMenuImage';
import { ViewMode } from './ViewModeToggle';

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
    merchantCode?: string;
    onAddItem?: (item: MenuItem) => void;
    getItemQuantityInCart?: (menuId: string) => number;
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
    storeOpen?: boolean;
    viewMode?: ViewMode;
}

export default function DetailedMenuSection({
    title,
    items,
    currency = 'AUD',
    merchantCode = '',
    onAddItem,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
    storeOpen = true,
    viewMode = 'list',
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

    // ========================================
    // LIST VIEW (Original Layout)
    // ========================================
    const renderListView = () => (
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

                        {/* Image - Fixed 70x70px with lazy loading */}
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
                            <LazyMenuImage
                                src={item.imageUrl}
                                alt={item.name}
                                className="object-cover"
                                sizes="70px"
                                rootMargin="300px"
                                priority={index < 3}
                            />
                            {/* Favorite Button */}
                            {merchantCode && (
                                <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                                    <FavoriteButton
                                        merchantCode={merchantCode}
                                        menuId={item.id}
                                        size="sm"
                                    />
                                </div>
                            )}
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

                                {/* Button Area */}
                                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    {/* Low Stock Indicator */}
                                    {isAvailable && storeOpen && item.trackStock && item.stockQty !== null && item.stockQty <= 10 && (
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#f97316' }}>
                                            {t('customer.menu.onlyLeft', { count: item.stockQty })}
                                        </span>
                                    )}
                                    {!storeOpen ? (
                                        null
                                    ) : !isAvailable ? (
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
    );

    // ========================================
    // GRID VIEW (2 or 3 columns)
    // ========================================
    const renderGridView = () => {
        const columns = viewMode === 'grid-3' ? 3 : 2;
        const imageSize = viewMode === 'grid-3' ? 100 : 140;

        return (
            <div
                style={{
                    padding: '0 16px',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: '12px',
                }}
            >
                {items.map((item, index) => {
                    const isAvailable = item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));
                    const quantityInCart = getItemQuantityInCart ? getItemQuantityInCart(item.id) : 0;
                    const isInCart = quantityInCart > 0;

                    return (
                        <div
                            key={item.id}
                            className={`bg-white ${isAvailable ? '' : 'opacity-60'}`}
                            style={{
                                borderRadius: '10px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                                borderBottom: isInCart ? '4px solid rgb(240, 90, 40)' : 'none',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Image Container */}
                            <div
                                onClick={() => isAvailable && onAddItem?.(item)}
                                className={isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '1',
                                    maxHeight: `${imageSize}px`,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: '#f3f4f6',
                                    marginBottom: '10px',
                                }}
                            >
                                <LazyMenuImage
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="object-cover"
                                    sizes={`${imageSize}px`}
                                    rootMargin="400px"
                                    priority={index < 4}
                                />

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
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Product Name */}
                                <h3
                                    className="line-clamp-2"
                                    style={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: viewMode === 'grid-3' ? '13px' : '14px',
                                        fontWeight: 700,
                                        color: 'rgb(0, 0, 0)',
                                        lineHeight: '1.3',
                                        minHeight: viewMode === 'grid-3' ? '32px' : '36px',
                                        margin: 0,
                                    }}
                                >
                                    {item.name}
                                </h3>

                                {/* Description - only in grid-2 */}
                                {viewMode === 'grid-2' && item.description && (
                                    <p
                                        className="line-clamp-2"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '11px',
                                            color: '#6b7280',
                                            lineHeight: '1.4',
                                            margin: '4px 0 0 0',
                                            minHeight: '30px',
                                        }}
                                    >
                                        {item.description}
                                    </p>
                                )}

                                {/* Badges */}
                                {(item.isSpicy || item.isBestSeller || item.isSignature || item.isRecommended) && (
                                    <div className="flex flex-wrap" style={{ gap: '4px', marginTop: '6px', marginBottom: '4px' }}>
                                        {item.isBestSeller && (
                                            <div style={{ width: '20px', height: '20px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" fill className="object-cover" />
                                            </div>
                                        )}
                                        {item.isSignature && (
                                            <div style={{ width: '20px', height: '20px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/signature.png" alt="Signature" fill className="object-cover" />
                                            </div>
                                        )}
                                        {item.isSpicy && (
                                            <div style={{ width: '20px', height: '20px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/spicy.png" alt="Spicy" fill className="object-cover" />
                                            </div>
                                        )}
                                        {item.isRecommended && (
                                            <div style={{ width: '20px', height: '20px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                                                <Image src="/images/menu-badges/recommended.png" alt="Recommended" fill className="object-cover" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price */}
                                <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                                    {!isAvailable ? (
                                        <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>{t('customer.menu.soldOut')}</p>
                                    ) : item.isPromo && item.promoPrice ? (
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                {formatPrice(item.promoPrice)}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                                {formatPrice(item.price)}
                                            </span>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(0, 0, 0)', margin: 0 }}>
                                            {formatPrice(item.price)}
                                        </p>
                                    )}
                                </div>

                                {/* Low Stock Indicator */}
                                {isAvailable && storeOpen && item.trackStock && item.stockQty !== null && item.stockQty <= 10 && (
                                    <p style={{ fontSize: '11px', fontWeight: 500, color: '#f97316', marginTop: '2px' }}>
                                        {t('customer.menu.onlyLeft', { count: item.stockQty })}
                                    </p>
                                )}

                                {/* Add Button */}
                                <div style={{ marginTop: '8px' }}>
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
                                                onClick={(e) => { e.stopPropagation(); onAddItem?.(item); }}
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
        );
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
            {viewMode === 'list' ? renderListView() : renderGridView()}
        </section>
    );
}
