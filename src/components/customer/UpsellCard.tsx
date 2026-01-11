/**
 * Upsell Card Component - Compact Menu Card for Upselling
 * 
 * @description
 * Small, compact card for upselling suggestions at checkout
 * Matches existing HorizontalMenuSection styling
 */

'use client';

import LazyMenuImage from './LazyMenuImage';

interface UpsellCardProps {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    currency?: string;
    onAdd: (id: string) => void;
    addLabel?: string;
}

export default function UpsellCard({
    id,
    name,
    price,
    imageUrl,
    currency = 'AUD',
    onAdd,
    addLabel = '+ Add',
}: UpsellCardProps) {

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
        }).format(amount);
    };

    return (
        <div
            className="shrink-0 bg-white"
            style={{
                width: '140px',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
            }}
        >
            {/* Image - 140px x 100px */}
            <div
                style={{
                    position: 'relative',
                    width: '140px',
                    height: '100px',
                    backgroundColor: '#f3f4f6',
                }}
            >
                <LazyMenuImage
                    src={imageUrl}
                    alt={name}
                    className="object-cover"
                    sizes="140px"
                    rootMargin="200px"
                    scrollDirection="horizontal"
                />
            </div>

            {/* Content */}
            <div style={{ padding: '8px 10px 10px' }}>
                {/* Name - 1 line with ellipsis */}
                <h4
                    className="line-clamp-1"
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'rgb(0, 0, 0)',
                        lineHeight: '1.3',
                        marginBottom: '4px',
                    }}
                >
                    {name}
                </h4>

                {/* Price */}
                <p
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'rgb(107, 114, 128)',
                        marginBottom: '8px',
                    }}
                >
                    {formatPrice(price)}
                </p>

                {/* Add Button */}
                <button
                    onClick={() => onAdd(id)}
                    className="w-full flex items-center justify-center hover:bg-orange-50 transition-colors"
                    style={{
                        height: '26px',
                        border: '1px solid rgb(240, 90, 40)',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: 'rgb(240, 90, 40)',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    {addLabel}
                </button>
            </div>
        </div>
    );
}
