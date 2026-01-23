/**
 * Special For You Section Component
 * 
 * @description
 * Horizontal scrolling section showing menu items from customer's completed orders.
 * Compact card design (150px width, 100px image height) for a sleek horizontal look.
 * Only shown when customer is logged in and has completed orders.
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getCustomerAuth } from '@/lib/utils/localStorage';

interface RecentOrderItem {
    menuId: string;
    menuName: string;
    menuPrice: number;
    menuImageUrl: string | null;
    orderCount: number;
    isAvailable: boolean;
    // Note: isPromo/promoPrice removed from API - promo computed from SpecialPrice
    isPromo?: boolean;
    promoPrice?: number | null;
}

interface RecentOrdersSectionProps {
    merchantCode: string;
    currency?: string;
    onMenuClick?: (menuId: string) => void;
    getItemQuantityInCart?: (menuId: string) => number;
    onIncreaseQty?: (menuId: string) => void;
    onDecreaseQty?: (menuId: string) => void;
}

export default function RecentOrdersSection({
    merchantCode,
    currency = 'AUD',
    onMenuClick,
    getItemQuantityInCart,
    onIncreaseQty,
    onDecreaseQty,
}: RecentOrdersSectionProps) {
    const [items, setItems] = useState<RecentOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Format price based on currency
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

    // Fetch recent orders on mount
    useEffect(() => {
        const fetchRecentOrders = async () => {
            const auth = getCustomerAuth();

            if (!auth?.accessToken) {
                setIsLoggedIn(false);
                setIsLoading(false);
                return;
            }

            setIsLoggedIn(true);

            try {
                const response = await fetch(
                    `/api/customer/orders/recent?merchantCode=${merchantCode}&limit=10`,
                    {
                        headers: {
                            Authorization: `Bearer ${auth.accessToken}`,
                        },
                    }
                );

                const data = await response.json();

                if (data.success && data.data?.items) {
                    // Normalize IDs to string to avoid strict equality mismatches (string vs number)
                    setItems(
                        (Array.isArray(data.data.items) ? data.data.items : []).map((raw: any) => ({
                            menuId: String(raw.menuId),
                            menuName: String(raw.menuName ?? ''),
                            menuPrice: typeof raw.menuPrice === 'string' ? parseFloat(raw.menuPrice) : Number(raw.menuPrice ?? 0),
                            menuImageUrl: raw.menuImageUrl ?? null,
                            orderCount: Number(raw.orderCount ?? 0),
                            isAvailable: Boolean(raw.isAvailable),
                            isPromo: Boolean(raw.isPromo),
                            promoPrice:
                                raw.promoPrice === null || raw.promoPrice === undefined
                                    ? null
                                    : (typeof raw.promoPrice === 'string' ? parseFloat(raw.promoPrice) : Number(raw.promoPrice)),
                        }))
                    );
                }
            } catch (error) {
                console.error('Failed to fetch recent orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecentOrders();
    }, [merchantCode]);

    // Don't render anything if not logged in, loading, or no items
    if (!isLoggedIn || isLoading || items.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Section Header - Matches HorizontalMenuSection */}
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
                    Special For You
                </h2>
            </div>

            {/* Horizontal Scroll Container - Matches HorizontalMenuSection */}
            <div className="px-4 overflow-x-auto scrollbar-hide">
                <div className="flex pb-2" style={{ gap: '10px' }}>
                    {items.map((item) => {
                        const quantityInCart = getItemQuantityInCart
                            ? getItemQuantityInCart(item.menuId)
                            : 0;
                        const isInCart = quantityInCart > 0;
                        const displayPrice = item.isPromo && item.promoPrice
                            ? item.promoPrice
                            : item.menuPrice;

                        return (
                            <div
                                key={item.menuId}
                                onClick={() => item.isAvailable && onMenuClick?.(item.menuId)}
                                className={`shrink-0 bg-white px-3 pt-3 pb-2 ${item.isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                style={{
                                    width: '150px', // Compact width
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                    borderBottom: isInCart ? '4px solid rgb(240, 90, 40)' : 'none',
                                }}
                            >
                                {/* Image Container - 100px height for compact look */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!item.isAvailable) return;
                                        onMenuClick?.(item.menuId);
                                    }}
                                    className={item.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
                                    style={{
                                        position: 'relative',
                                        width: '126px',
                                        height: '100px',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f3f4f6',
                                    }}
                                >
                                    <Image
                                        src={item.menuImageUrl || '/images/default-menu.png'}
                                        alt={item.menuName}
                                        fill
                                        className="object-cover"
                                        sizes="126px"
                                    />

                                    {/* Sold Out Overlay */}
                                    {!item.isAvailable && (
                                        <div
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                        >
                                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>
                                                Sold Out
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content Area - Matches HorizontalMenuSection */}
                                <div style={{ marginTop: '8px' }}>
                                    {/* Product Name */}
                                    <h3
                                        className="line-clamp-2"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: 'rgb(0, 0, 0)',
                                            lineHeight: '1.3',
                                            minHeight: '32px',
                                        }}
                                    >
                                        {item.menuName}
                                    </h3>

                                    {/* Price */}
                                    <div style={{ marginTop: '6px' }}>
                                        {!item.isAvailable ? (
                                            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700 }}>Sold out</p>
                                        ) : item.isPromo && item.promoPrice ? (
                                            <div className="flex items-center gap-2">
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                    {formatPrice(item.promoPrice)}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                                    {formatPrice(item.menuPrice)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                {formatPrice(displayPrice)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Add Button - Matches HorizontalMenuSection style */}
                                    <div style={{ marginTop: '6px' }}>
                                        {item.isAvailable && (
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
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onDecreaseQty?.(item.menuId); }}
                                                        className="flex items-center justify-center hover:bg-orange-50 transition-colors"
                                                        style={{ width: '32px', height: '100%', color: 'rgb(240, 90, 40)' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgb(0, 0, 0)' }}>
                                                        {quantityInCart}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onIncreaseQty?.(item.menuId); }}
                                                        className="flex items-center justify-center hover:bg-orange-50 transition-colors"
                                                        style={{ width: '32px', height: '100%', color: 'rgb(240, 90, 40)' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); onMenuClick?.(item.menuId); }}
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
                                                    Add
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
