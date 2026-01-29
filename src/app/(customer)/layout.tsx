'use client';

import { useEffect, useRef } from 'react';
import { CustomerLanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';

/**
 * Customer Layout Wrapper
 * 
 * This layout wraps all customer-facing pages with consistent styling:
 * - White background covering entire viewport (outer area)
 * - Centered content with max-width 500px (mobile-like appearance on desktop)
 * - Border on left/right ONLY on tablet/desktop (min-width > 500px)
 * - No border on mobile (width <= 500px)
 * - Multi-language support via CustomerLanguageProvider
 * - FORCED LIGHT MODE: Customer pages do not support dark mode
 * 
 * Note: For auth pages (login, forgot-password, etc), this provides default EN locale.
 * For merchant pages, the [merchantCode] layout will override with merchant currency.
 * 
 * Reference: ESB Order (Burjo) - https://esborder.qs.esb.co.id/
 */

interface CustomerLayoutProps {
    children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
    const { theme, setTheme, isInitialized } = useTheme();
    const previousThemeRef = useRef<'light' | 'dark' | null>(null);
    const hasCapturedRef = useRef(false);

    // Force light mode for customer pages - coordinate via ThemeContext to avoid DOM/theme desync.
    useEffect(() => {
        if (!isInitialized) return;

        if (!hasCapturedRef.current) {
            previousThemeRef.current = theme;
            hasCapturedRef.current = true;
        }

        if (theme !== 'light') setTheme('light');
    }, [isInitialized, setTheme, theme]);

    useEffect(() => {
        return () => {
            const previousTheme = previousThemeRef.current;
            if (previousTheme && isInitialized) setTheme(previousTheme);
        };
    }, [isInitialized, setTheme]);

    return (
        <CustomerLanguageProvider>
            <CartProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-white" data-theme="light">
                        {/* Centered container - mobile-first layout like Burjo reference */}
                        <div className="customer-page-container flex flex-col min-h-screen max-w-125 mx-auto bg-white scrollbar-hide">
                            {children}
                        </div>
                    </div>
                </ToastProvider>
            </CartProvider>
        </CustomerLanguageProvider>
    );
}
