'use client';

import { useEffect } from 'react';
import { CustomerLanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';

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
    // Force light mode for customer pages - override any dark mode setting
    useEffect(() => {
        // Store original dark class state to restore when leaving customer pages
        const hadDarkClass = document.documentElement.classList.contains('dark');
        
        // Remove dark class for customer pages
        document.documentElement.classList.remove('dark');
        
        // Cleanup: restore dark class if it was present when unmounting
        return () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || hadDarkClass) {
                document.documentElement.classList.add('dark');
            }
        };
    }, []);

    return (
        <CustomerLanguageProvider>
            <CartProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-white" data-theme="light">
                        {/* Centered container - mobile-first layout like Burjo reference */}
                        <div className="customer-page-container flex flex-col min-h-screen max-w-[500px] mx-auto bg-white scrollbar-hide">
                            {children}
                        </div>
                    </div>
                </ToastProvider>
            </CartProvider>
        </CustomerLanguageProvider>
    );
}
