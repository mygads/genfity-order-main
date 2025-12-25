'use client';

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
    return (
        <CustomerLanguageProvider>
            <CartProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-white">
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
