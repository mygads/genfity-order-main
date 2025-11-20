'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isCustomerAuthenticated } from '@/lib/utils/localStorage';

interface CustomerHeaderProps {
  merchantCode?: string;
  mode?: 'dinein' | 'takeaway';
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * Customer Header Component
 * 
 * @description
 * Reusable header for customer-facing pages with:
 * - Brand logo/title
 * - Back button (conditional)
 * - Auth buttons (Sign In OR Profile + History)
 * - Hydration-safe auth detection
 * 
 * @specification copilot-instructions.md - Component Reusability
 * 
 * @param merchantCode - Merchant code for navigation context (optional)
 * @param mode - Order mode (dinein/takeaway) for ref parameter (optional)
 * @param title - Header title (default: merchant code)
 * @param showBackButton - Show back arrow (default: false)
 * @param onBack - Custom back handler (default: router.back())
 * 
 * @example
 * // Landing page (no merchant context)
 * <CustomerHeader title="GENFITY" showBackButton={false} />
 * 
 * // Order page (with merchant context)
 * <CustomerHeader 
 *   merchantCode="KOPI001" 
 *   mode="dinein"
 *   showBackButton={true}
 * />
 */
export default function CustomerHeader({
  merchantCode,
  mode,
  title,
  showBackButton = false,
  onBack,
}: CustomerHeaderProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * ✅ Hydration-safe auth detection with debug logging
   * 
   * @specification copilot-instructions.md - Emergency Troubleshooting
   */
  useEffect(() => {
    setIsMounted(true);
    const authStatus = isCustomerAuthenticated();
    setIsAuthenticated(authStatus);
    console.log('🔐 [CUSTOMER HEADER] Initial auth check:', authStatus);

    const handleAuthChange = () => {
      const newAuthStatus = isCustomerAuthenticated();
      console.log('🔐 [CUSTOMER HEADER] Auth state changed:', newAuthStatus);
      setIsAuthenticated(newAuthStatus);
    };

    // Listen for storage changes (logout from another tab)
    window.addEventListener('storage', handleAuthChange);

    // Listen for custom auth events (logout from same tab)
    window.addEventListener('customerAuthChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('customerAuthChange', handleAuthChange);
    };
  }, []);

  /**
   * ✅ FIXED: Build ref URL with proper query string format
   * 
   * @description
   * Generates ref parameter for navigation with correct format:
   * - Landing page: /
   * - Order page: /KOPI001/order?mode=dinein
   * - Always use ? for first param, & for subsequent params
   * 
   * @specification STEP_02 - URL query string format
   */
  const buildRefUrl = () => {
    if (!merchantCode) {
      return '/';
    }

    // Base path: /KOPI001
    let refUrl = `/${merchantCode}`;

    // If we have mode, add it to ref URL
    if (mode) {
      refUrl += `/order?mode=${mode}`;
    }

    return refUrl;
  };

  /**
   * ✅ FIXED: Handle profile click with correct URL format
   * 
   * @description
   * Navigate to profile page with proper query string:
   * - Format: /KOPI001/profile?mode=dinein&ref=...
   * - NOT: /KOPI001/profile&mode=... (404 error)
   * 
   * @specification copilot-instructions.md - URL Format Standard
   */
  const handleProfileClick = () => {
    if (!merchantCode) {
      // No merchant context - try to get last visited merchant
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}/profile?ref=%2F${lastMerchant}`);
      } else {
        alert('Masukkan kode merchant terlebih dahulu');
      }
      return;
    }

    // ✅ Build URL with proper query string format
    const refUrl = buildRefUrl();
    const encodedRef = encodeURIComponent(refUrl);
    
    // Start with ? for first query param

    let url = `/${merchantCode}/profile`;
    
    // Add mode if available

    if (mode) {
      url += `?mode=${mode}`;
      // Use & for subsequent params
      url += `&ref=${encodedRef}`;
    } else {
      // No mode, ref is first param
      url += `?ref=${encodedRef}`;
    }

    console.log('🔗 Profile URL:', url);
    router.push(url);
  };

  /**
   * ✅ FIXED: Handle history click with correct URL format
   * 
   * @description
   * Navigate to history page with proper query string:
   * - Format: /KOPI001/history?mode=dinein&ref=...
   * - NOT: /KOPI001/history&mode=... (404 error)
   * 
   * @specification copilot-instructions.md - URL Format Standard
   */
  const handleHistoryClick = () => {
    if (!merchantCode) {
      // No merchant context - try to get last visited merchant
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}/history?ref=%2F${lastMerchant}`);
      } else {
        alert('Masukkan kode merchant terlebih dahulu');
      }
      return;
    }

    // ✅ Build URL with proper query string format
    const refUrl = buildRefUrl();
    const encodedRef = encodeURIComponent(refUrl);

    let url = `/${merchantCode}/history`;

    if (mode) {
      url += `?mode=${mode}`;
      // Use & for subsequent params
      url += `&ref=${encodedRef}`;
    } else {
      // No mode, ref is first param
      url += `?ref=${encodedRef}`;
    }

    console.log('🔗 History URL:', url);
    router.push(url);
  };

  /**
   * Handle sign in click
   * 
   * @description
   * Navigate to login page with ref parameter for return URL.
   */
  const handleSignInClick = () => {
    const refUrl = buildRefUrl();
    const encodedRef = encodeURIComponent(refUrl);
    router.push(`/login?ref=${encodedRef}`);
  };

  /**
   * Handle back button click
   */
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* ========================================
          LEFT: Back Button (Conditional)
      ======================================== */}
      {showBackButton && (
        <button
          onClick={handleBackClick}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* ========================================
          CENTER: Merchant Info
      ======================================== */}
      <div className="flex-1 flex items-center gap-3 ml-2">
        {/* Merchant Logo */}
        {merchantInfo?.logoUrl && (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500 shrink-0 relative">
            <Image
              src={merchantInfo.logoUrl}
              alt={merchantInfo.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Merchant Name & Status */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {title || merchantInfo?.name || (merchantCode ? merchantCode.toUpperCase() : 'GENFITY')}
          </h1>
          {merchantInfo && (() => {
            const { isOpen, statusText } = getMerchantStatus();
            return (
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`truncate ${isOpen ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {merchantInfo.city}, {merchantInfo.state} • {statusText}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========================================
          RIGHT: Action Buttons
      ======================================== */}
      <div className="flex items-center gap-2 ml-2">
        {!isMounted ? (
          /* ✅ Loading placeholder during hydration */
          <div className="flex gap-2">
            <div className="w-20 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        ) : merchantCode && isAuthenticated ? (
          /* ✅ AUTHENTICATED WITH MERCHANT: Show History & Profile buttons */
          <>
            {/* History Button */}
            <button
              onClick={handleHistoryClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200"
              aria-label="Order History"
              title="Order History"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Profile Button */}
            <button
              onClick={handleProfileClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200"
              aria-label="Profile"
              title="Profile"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </>
        ) : merchantCode && !isAuthenticated ? (
          /* ✅ NOT AUTHENTICATED WITH MERCHANT: Show Sign In button */
          <button
            onClick={() => {
              const refUrl = buildRefUrl();
              const encodedRef = encodeURIComponent(refUrl);
              const loginUrl = `/login?merchant=${merchantCode}${mode ? `&mode=${mode}` : ''}&ref=${encodedRef}`;
              console.log('🔗 [CUSTOMER HEADER] Navigate to login:', loginUrl);
              router.push(loginUrl);
            }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Sign In"
          >
            Sign In
          </button>
        ) : null}
      </div>
    </header>
  );
}
