'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { isCustomerAuthenticated } from '@/lib/utils/localStorage';

interface OpeningHour {
  id: string;
  merchantId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string;  // "09:00"
  closeTime: string; // "22:00"
  isClosed: boolean;
}

interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
  city: string;
  state: string;
  openingHours: OpeningHour[];
}

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
 * - History + Profile buttons (ALWAYS visible)
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
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);

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
   * Fetch merchant info
   */
  useEffect(() => {
    if (!merchantCode) return;

    fetch(`/api/public/merchants/${merchantCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMerchantInfo(data.data);
        }
      })
      .catch(err => console.error('Error fetching merchant:', err));
  }, [merchantCode]);

  /**
   * ✅ Calculate real-time merchant status
   * 
   * @description
   * Checks if merchant is currently open based on:
   * - Current day of week (0 = Sunday, 6 = Saturday)
   * - Current time vs opening hours
   * - isClosed flag for specific days
   * 
   * @specification copilot-instructions.md - Business Logic
   */
  const getMerchantStatus = (): { isOpen: boolean; statusText: string } => {
    if (!merchantInfo?.openingHours) {
      return { isOpen: false, statusText: 'Unknown' };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const todayHours = merchantInfo.openingHours.find(
      (hour: { dayOfWeek: number; isClosed: boolean; openTime: string; closeTime: string }) => hour.dayOfWeek === currentDay
    );

    if (!todayHours || todayHours.isClosed) {
      return { isOpen: false, statusText: 'Closed' };
    }

    const isOpen = currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;

    return {
      isOpen,
      statusText: isOpen ? 'Open' : 'Closed'
    };
  };

  /**
   * ✅ Build ref URL with proper query string format
   * 
   * @description
   * Generates ref parameter for navigation with correct format:
   * - Landing page: /
   * - Order page: /KOPI001/order?mode=dinein
   * - Always use ? for first param, & for subsequent params
   * 
   * @specification copilot-instructions.md - URL Format Standard
   */
  const buildRefUrl = () => {
    if (!merchantCode) {
      return '/';
    }

    let refUrl = `/${merchantCode}`;

    if (mode) {
      refUrl += `/order?mode=${mode}`;
    }

    return refUrl;
  };

  /**
   * ✅ Handle profile click
   * 
   * @description
   * Navigate to profile page with proper query string.
   * If not authenticated, will be redirected to login by profile page middleware.
   * 
   * @specification copilot-instructions.md - URL Format Standard
   */
  const handleProfileClick = () => {
    if (!merchantCode) {
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}/profile?ref=%2F${lastMerchant}`);
      } else {
        // No merchant context - go to generic profile or prompt
        router.push('/profile?ref=%2F');
      }
      return;
    }

    const refUrl = buildRefUrl();
    const encodedRef = encodeURIComponent(refUrl);
    
    let url = `/${merchantCode}/profile`;
    
    if (mode) {
      url += `?mode=${mode}&ref=${encodedRef}`;
    } else {
      url += `?ref=${encodedRef}`;
    }

    console.log('🔗 Profile URL:', url);
    router.push(url);
  };

  /**
   * ✅ Handle history click
   * 
   * @description
   * Navigate to history page with proper query string.
   * If not authenticated, will be redirected to login by history page middleware.
   * 
   * @specification copilot-instructions.md - URL Format Standard
   */
  const handleHistoryClick = () => {
    if (!merchantCode) {
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}/history?ref=%2F${lastMerchant}`);
      } else {
        // No merchant context - go to generic history or prompt
        router.push('/history?ref=%2F');
      }
      return;
    }

    const refUrl = buildRefUrl();
    const encodedRef = encodeURIComponent(refUrl);
    
    let url = `/${merchantCode}/history`;
    
    if (mode) {
      url += `?mode=${mode}&ref=${encodedRef}`;
    } else {
      url += `?ref=${encodedRef}`;
    }

    console.log('🔗 History URL:', url);
    router.push(url);
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
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            {/* ========================================
                ✅ ALWAYS VISIBLE: History Button
            ======================================== */}
            <button
              onClick={handleHistoryClick}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${isAuthenticated 
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' 
                  : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 dark:text-gray-500'
                }
              `}
              aria-label="Order History"
              title={isAuthenticated ? 'Riwayat Pesanan' : 'Login untuk melihat riwayat'}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="transition-colors"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              
              {/* ✅ Optional: Badge for unauthenticated state */}
            </button>

            {/* ========================================
                ✅ ALWAYS VISIBLE: Profile Button
            ======================================== */}
            <button
              onClick={handleProfileClick}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${isAuthenticated 
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' 
                  : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 dark:text-gray-500'
                }
              `}
              aria-label="Profile"
              title={isAuthenticated ? 'Profil Saya' : 'Login untuk melihat profil'}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="transition-colors"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              
              {/* ✅ Optional: Badge for unauthenticated state */}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
