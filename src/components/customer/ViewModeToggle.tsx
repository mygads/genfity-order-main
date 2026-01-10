/**
 * View Mode Toggle Component
 * 
 * Toggle between list view and grid views (2 or 3 columns)
 * Saves preference to localStorage for persistence
 */

'use client';

import { FaList, FaTh, FaThLarge } from 'react-icons/fa';

export type ViewMode = 'list' | 'grid-2' | 'grid-3';

interface ViewModeToggleProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const STORAGE_KEY = 'menu_view_mode';

export function getStoredViewMode(): ViewMode {
    if (typeof window === 'undefined') return 'list';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'list' || stored === 'grid-2' || stored === 'grid-3') {
        return stored;
    }
    return 'list';
}

export function setStoredViewMode(mode: ViewMode): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
    }
}

export default function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
    const modes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'list', icon: <FaList size={14} />, label: 'List View' },
        { mode: 'grid-2', icon: <FaThLarge size={14} />, label: 'Grid 2 Columns' },
        { mode: 'grid-3', icon: <FaTh size={14} />, label: 'Grid 3 Columns' },
    ];

    return (
        <div
            className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1"
            style={{ gap: '2px' }}
        >
            {modes.map(({ mode, icon, label }) => (
                <button
                    key={mode}
                    onClick={() => {
                        onChange(mode);
                        setStoredViewMode(mode);
                    }}
                    className={`p-2 rounded-md transition-all duration-200 ${value === mode
                            ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    aria-label={label}
                    title={label}
                >
                    {icon}
                </button>
            ))}
        </div>
    );
}
