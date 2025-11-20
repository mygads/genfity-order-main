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
   * ✅ Hydration-safe auth detection
   * 
   * @specification copilot-instructions.md - Emergency Troubleshooting
   */
  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(isCustomerAuthenticated());

    const handleAuthChange = () => {
      setIsAuthenticated(isCustomerAuthenticated());
    };

    window.addEventListener('storage', handleAuthChange);
    return () => window.removeEventListener('storage', handleAuthChange);
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
    
    // Start with ? for first query param
    let url = `/${merchantCode}/history`;
    
    // Add mode if available
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
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Back Button or Logo */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Kembali"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary-dark"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {!showBackButton && (
            <span className="text-2xl">🍽️</span>
          )}
          
          <span className="text-lg font-bold text-primary-dark">
            {title || merchantCode?.toUpperCase() || 'GENFITY'}
          </span>
        </div>

        {/* Right: Auth Buttons */}
        <div className="flex items-center gap-2">
          {!isMounted ? (
            /* Loading placeholder during hydration */
            <div className="w-20 h-8 bg-secondary rounded-lg animate-pulse" />
          ) : isAuthenticated ? (
            <>
              {/* History Icon */}
              <button
                onClick={handleHistoryClick}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Riwayat"
                title="Riwayat Pesanan"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary-dark"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>

              {/* Profile Icon */}
              <button
                onClick={handleProfileClick}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Akun"
                title="Profil Saya"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary-dark"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </>
          ) : (
            /* Sign In Button */
            <button
              onClick={handleSignInClick}
              className="text-sm font-medium text-primary hover:text-primary-dark px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
