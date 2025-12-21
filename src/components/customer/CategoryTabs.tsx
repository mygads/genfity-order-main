'use client';

interface Category {
    id: string;
    name: string;
}

interface CategoryTabsProps {
    categories: Category[];
    activeTab: string;
    onTabClick: (categoryId: string) => void;
}

/**
 * ✅ Category Tabs Component - Burjo ESB Style
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
}: CategoryTabsProps) {
    return (
        <div
            className="bg-white relative"
            style={{
                height: '48px',
                borderBottom: '1px solid #E6E6E6',
            }}
        >
            <div className="max-w-[500px] mx-auto h-full">
                <div className="overflow-x-auto scrollbar-hide h-full">
                    <div className="flex gap-0 min-w-max px-4 h-full">
                        {/* All Categories Tab */}
                        <button
                            onClick={() => onTabClick('all')}
                            className="shrink-0 relative h-full flex items-center"
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                padding: '0 16px',
                                color: '#000000',
                            }}
                        >
                            ALL MENU
                            {/* Active indicator - positioned at very bottom */}
                            {activeTab === 'all' && (
                                <span
                                    className="absolute bottom-0 left-4 right-4"
                                    style={{
                                        height: '2.67px',
                                        backgroundColor: '#f05a28',
                                    }}
                                />
                            )}
                        </button>

                        {/* Category Tabs */}
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => onTabClick(category.id)}
                                className="shrink-0 relative h-full flex items-center"
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '0 16px',
                                    color: '#000000',
                                }}
                            >
                                {category.name.toUpperCase()}
                                {/* Active indicator - positioned at very bottom */}
                                {activeTab === category.id && (
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
