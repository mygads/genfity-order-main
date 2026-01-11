/**
 * Upsell Section Component - Horizontal Scrolling Suggestions
 * 
 * @description
 * Container for upselling suggestions with title and horizontal scroll
 * Used at checkout to suggest add-ons, drinks, or complementary items
 */

'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import UpsellCard from './UpsellCard';
import { FaPlus } from 'react-icons/fa';

interface UpsellItem {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
}

interface UpsellSectionProps {
    title: string;
    subtitle?: string;
    items: UpsellItem[];
    currency?: string;
    onAddItem: (id: string) => void;
}

export default function UpsellSection({
    title,
    subtitle,
    items,
    currency = 'AUD',
    onAddItem,
}: UpsellSectionProps) {
    const { t } = useTranslation();

    if (items.length === 0) return null;

    return (
        <div
            className=""
            style={{
                borderRadius: '12px',
                marginBottom: '16px',
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: '12px' }}>
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'rgb(240, 90, 40)',
                        }}
                    >
                        <FaPlus className="text-white" style={{ fontSize: '10px' }} />
                    </div>
                    <h3
                        style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'rgb(33, 37, 41)',
                        }}
                    >
                        {title}
                    </h3>
                </div>
                {subtitle && (
                    <p
                        style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            color: 'rgb(107, 114, 128)',
                            marginTop: '4px',
                            marginLeft: '32px',
                        }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Horizontal Scroll Container */}
            <div className="overflow-x-auto scrollbar-hide" style={{ marginLeft: '-4px', marginRight: '-4px' }}>
                <div className="flex" style={{ gap: '10px', paddingLeft: '4px', paddingRight: '4px', paddingBottom: '4px' }}>
                    {items.map((item) => (
                        <UpsellCard
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            price={item.price}
                            imageUrl={item.imageUrl}
                            currency={currency}
                            onAdd={onAddItem}
                            addLabel={t('customer.upsell.add') || '+ Add'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
