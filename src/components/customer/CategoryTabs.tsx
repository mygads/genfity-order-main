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
 * ✅ Category Tabs Component
 * Matches reference category-tabs.tsx pattern with sticky behavior
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */
export default function CategoryTabs({
    categories,
    activeTab,
    onTabClick,
}: CategoryTabsProps) {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="max-w-[420px] mx-auto">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-0 min-w-max px-4">
                        {/* All Categories Tab */}
                        <button
                            onClick={() => onTabClick('all')}
                            className={`shrink-0 px-4 py-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'all'
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            ALL MENU
                        </button>

                        {/* Category Tabs */}
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => onTabClick(category.id)}
                                className={`shrink-0 px-4 py-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === category.id
                                        ? 'border-orange-500 text-orange-500'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {category.name.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
