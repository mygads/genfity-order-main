'use client';

/**
 * Customer Layout Wrapper
 * 
 * This layout wraps all customer-facing pages with consistent styling:
 * - White background covering entire viewport (outer area)
 * - Centered content with max-width 500px (mobile-like appearance on desktop)
 * - Border on left/right ONLY on tablet/desktop (min-width > 500px)
 * - No border on mobile (width <= 500px)
 * 
 * Reference: ESB Order (Burjo) - https://esborder.qs.esb.co.id/
 * 
 * CSS Analysis from Burjo:
 * - .page-container { max-width: 500px; margin: 0 auto; background: #fafafd; }
 * - @media (min-width: 501px) { border-left: 1px solid #eee; border-right: 1px solid #eee; }
 */

interface CustomerLayoutProps {
    children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
    return (
        <div className="min-h-screen bg-white">
            {/* Centered container - mobile-first layout like Burjo reference */}
            <div className="customer-page-container flex flex-col min-h-screen max-w-[500px] mx-auto bg-[#fafafd]">
                {children}
            </div>
        </div>
    );
}
