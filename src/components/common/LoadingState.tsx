/**
 * LoadingState Component - Unified Loading UI
 * 
 * @description
 * Reusable loading component with context-aware messages.
 * Provides consistent minimalist design across all customer pages.
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 * - Minimal & clean design
 * - Subtle spinner animation
 * - Context-aware messaging
 * - Dark mode support
 * - Mobile-first responsive
 * 
 * @usage
 * ```tsx
 * <LoadingState type="page" message="Loading menu..." />
 * <LoadingState type="inline" message="Loading orders..." />
 * <LoadingState type="fullscreen" message="Processing order..." />
 * ```
 */

interface LoadingStateProps {
    /**
     * Type of loading display
     * - page: Full page loading (with safe area padding)
     * - inline: Inline loading (for content sections)
     * - fullscreen: Fullscreen overlay (for critical operations)
     * - button: Inline text for buttons
     */
    type?: 'page' | 'inline' | 'fullscreen' | 'button';

    /**
     * Context-specific loading message
     * Examples:
     * - "Loading menu..."
     * - "Loading order history..."
     * - "Processing order..."
     * - "Saving account..."
     */
    message?: string;

    /**
     * Size of spinner
     * - sm: 32px (inline use)
     * - md: 48px (default)
     * - lg: 64px (fullscreen)
     */
    size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({
    type = 'page',
    message = 'Loading...',
    size = 'md',
}: LoadingStateProps) {
    // Spinner size classes
    const spinnerSizes = {
        sm: 'w-8 h-8 border-3',
        md: 'w-12 h-12 border-4',
        lg: 'w-16 h-16 border-4',
    };

    const spinnerClass = spinnerSizes[size];

    /**
     * Spinner Component - Consistent across all types
     */
    const Spinner = () => (
        <div
            className={`${spinnerClass} border-brand-500 border-t-transparent rounded-full animate-spin`}
            role="status"
            aria-label={message}
        />
    );

    /**
     * Message Component - Optional text below spinner
     */
    const Message = () => (
        message ? (
            <p className="text-sm text-gray-600 mt-3">
                {message}
            </p>
        ) : null
    );

    /**
     * Page Loading - Full page with centered content
     */
    if (type === 'page') {
        return (
            <div className="flex flex-col min-h-screen max-w-105 mx-auto bg-white items-center justify-center">
                <Spinner />
                <Message />
            </div>
        );
    }

    /**
     * Inline Loading - For content sections (e.g., order history tab)
     */
    if (type === 'inline') {
        return (
            <div className="text-center py-20">
                <div className="flex justify-center mb-4">
                    <Spinner />
                </div>
                <Message />
            </div>
        );
    }

    /**
     * Fullscreen Loading - Overlay for critical operations
     */
    if (type === 'fullscreen') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <Spinner />
                    </div>
                    <Message />
                </div>
            </div>
        );
    }

    /**
     * Button Loading - Simple text for button states
     */
    if (type === 'button') {
        return <span>{message}</span>;
    }

    // Default fallback
    return (
        <div className="flex items-center justify-center p-8">
            <Spinner />
            <Message />
        </div>
    );
}

/**
 * Context-Specific Loading Messages
 * 
 * Use these constants for consistent messaging:
 */
export const LOADING_MESSAGES = {
    // Page loads
    MERCHANT: 'Loading restaurant...',
    MENU: 'Loading menu...',
    ORDER_HISTORY: 'Loading order history...',
    ORDER_DETAILS: 'Loading order details...',
    PROFILE: 'Loading profile...',

    // Actions
    SIGNING_IN: 'Signing in...',
    SAVING_ACCOUNT: 'Saving account...',
    PROCESSING_ORDER: 'Processing order...',
    CREATING_ORDER: 'Creating order...',

    // Cart operations
    LOADING_CART: 'Loading cart...',
    UPDATING_CART: 'Updating cart...',

    // Generic
    LOADING: 'Loading...',
    PLEASE_WAIT: 'Please wait...',
} as const;
