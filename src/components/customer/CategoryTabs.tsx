'use client';

import { useRef, useEffect } from 'react';

interface Category {
    id: string;
    name: string;
}

interface SpecialCategory {
    id: string;
    name: string;
}

interface CategoryTabsProps {
    categories: Category[];
    activeTab: string;
    onTabClick: (categoryId: string) => void;
    specialCategories?: SpecialCategory[]; // Promo, Best Seller, Recommendation
}

/**
 * ✅ Category Tabs Component - Burjo ESB Style with Auto-Scroll
 * 
 * Features:
 * - Auto-scrolls active tab to leftmost position
 * - Support for special categories (Promo, Best Seller, Recommendation)
 * - Smooth scroll animation
 * 
 * Matches Burjo ESB reference:
 * - Container height: 48px
 * - Background: #ffffff
 * - Text: 14px, weight 600
 * - Active tab: 2.67px solid #f05a28 bottom border at very bottom
 * - Inactive tab: transparent border
 * 
 * @specification Burjo ESB Reference
 */
export default function CategoryTabs({
    categories,
    activeTab,
    onTabClick,
    specialCategories = [],
}: CategoryTabsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Auto-scroll active tab to leftmost position when activeTab changes
    useEffect(() => {
        const activeTabElement = tabRefs.current[activeTab];
        const scrollContainer = scrollContainerRef.current;

        if (activeTabElement && scrollContainer) {
            // Calculate scroll position to put active tab at leftmost
            // Account for the container padding (16px)
            const containerPadding = 16;
            const scrollLeft = activeTabElement.offsetLeft - containerPadding;

            scrollContainer.scrollTo({
                left: Math.max(0, scrollLeft),
                behavior: 'smooth'
            });
        }
    }, [activeTab]);

    // Combine special categories and regular categories
    const allTabs = [...specialCategories, ...categories];

    return (
        <div
            className="bg-white relative"
            style={{
                height: '48px',
                borderBottom: '1px solid #E6E6E6',
            }}
        >
            <div className="max-w-[500px] mx-auto h-full">
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scrollbar-hide h-full"
                >
                    <div className="flex gap-0 min-w-max px-4 h-full">
                        {/* All Tabs (Special Categories + Regular Categories) */}
                        {allTabs.map((tab) => (
                            <button
                                key={tab.id}
                                ref={(el) => {
                                    tabRefs.current[tab.id] = el;
                                }}
                                onClick={() => onTabClick(tab.id)}
                                className="shrink-0 relative h-full flex items-center"
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '0 16px',
                                    color: '#000000',
                                }}
                            >
                                {tab.name.toUpperCase()}
                                {/* Active indicator - positioned at very bottom */}
                                {activeTab === tab.id && (
                                    <span
                                        className="absolute bottom-0 left-4 right-4"
                                        style={{
                                            height: '2.67px',
                                            backgroundColor: '#f05a28',
                                        }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
