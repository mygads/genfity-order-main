/**
 * View Mode Toggle Component
 * 
 * Toggle between list view and grid views (2 or 3 columns)
 * Saves preference to localStorage for persistence
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaList, FaTh, FaThLarge } from 'react-icons/fa';

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
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const modes = useMemo(
        () => [
            { mode: 'list' as const, icon: <FaList size={14} />, label: 'List View' },
            { mode: 'grid-2' as const, icon: <FaThLarge size={14} />, label: 'Grid 2 Columns' },
            { mode: 'grid-3' as const, icon: <FaTh size={14} />, label: 'Grid 3 Columns' },
        ],
        []
    );

    const current = modes.find((m) => m.mode === value) ?? modes[0];

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const el = containerRef.current;
            if (!el) return;
            if (event.target instanceof Node && el.contains(event.target)) return;
            setOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative inline-flex z-[500]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={current.label}
                title={current.label}
            >
                <span className="text-orange-500">{current.icon}</span>
                <FaChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            <div
                role="menu"
                aria-hidden={!open}
                className={`absolute right-0 top-full z-[1000] mt-2 w-52 origin-top-right rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1 transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'}`}
            >
                {modes.map(({ mode, icon, label }) => {
                    const isActive = value === mode;
                    return (
                        <button
                            key={mode}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                onChange(mode);
                                setStoredViewMode(mode);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive
                                    ? 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={`${isActive ? 'text-orange-500' : 'text-gray-400'}`}>{icon}</span>
                                <span className="font-medium">{label}</span>
                            </span>
                            {isActive ? <span className="text-xs font-semibold">Active</span> : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
