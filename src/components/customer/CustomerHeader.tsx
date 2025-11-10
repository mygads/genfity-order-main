'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { isCustomerAuthenticated } from '@/lib/utils/localStorage';

interface CustomerHeaderProps {
  merchantCode?: string;
  mode?: 'dinein' | 'takeaway';
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
}

/**
 * GENFITY Customer Header Component
 * 
 * @description
 * Reusable header for all customer pages in app/(customer)
 * Shows conditional Profile and History buttons based on auth status
 * 
 * @specification FRONTEND_SPECIFICATION.md - TopBar component
 * - Height: 56px
 * - Background: white with subtle shadow
 * - Left: Back button (24px icon)
 * - Center: Title (16/24 semibold)
 * - Right: Profile + History icons (authenticated) OR Sign In link (guest)
 * 
 * @navigation
 * - Profile: /[merchantCode]/profile?mode=[mode]&ref=[currentPath]
 * - History: /[merchantCode]/history?mode=[mode]&ref=[currentPath]
 * - Sign In: /login?merchant=[merchantCode]&mode=[mode]&ref=[currentPath]
 * - Back: Custom onBack or router.back()
 */
export default function CustomerHeader({
  merchantCode,
  mode,
  showBackButton = true,
  onBack,
  title,
}: CustomerHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    setIsAuthenticated(isCustomerAuthenticated());

    // Listen for auth changes
    const handleAuthChange = () => {
      setIsAuthenticated(isCustomerAuthenticated());
    };

    window.addEventListener('storage', handleAuthChange);
    return () => window.removeEventListener('storage', handleAuthChange);
  }, []);

  // Build reference URL for navigation
  const buildRefUrl = () => {
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    return encodeURIComponent(currentPath);
  };

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Navigate to profile page
  const handleProfileClick = () => {
    if (!merchantCode) {
      router.push('/profile');
      return;
    }

    const modeParam = mode ? `?mode=${mode}` : '';
    const refParam = `&ref=${buildRefUrl()}`;
    router.push(`/${merchantCode}/profile${modeParam}${refParam}`);
  };

  // Navigate to history page
  const handleHistoryClick = () => {
    if (!merchantCode) {
      router.push('/history');
      return;
    }

    const modeParam = mode ? `?mode=${mode}` : '';
    const refParam = `&ref=${buildRefUrl()}`;
    router.push(`/${merchantCode}/history${modeParam}${refParam}`);
  };

  // Navigate to login page
  const handleSignInClick = () => {
    const merchantParam = merchantCode ? `?merchant=${merchantCode}` : '';
    const modeParam = mode ? `&mode=${mode}` : '';
    const refParam = `&ref=${buildRefUrl()}`;
    router.push(`/login${merchantParam}${modeParam}${refParam}`);
  };

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 max-w-[420px] mx-auto">
        {/* Left: Back Button */}
        <div className="flex items-center">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Kembali"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-700"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Title */}
        {title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-900 truncate max-w-[200px]">
            {title}
          </h1>
        )}

        {/* Right: Auth Buttons */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* History Button */}
              <button
                onClick={handleHistoryClick}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Riwayat Pesanan"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-700"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>

              {/* Profile Button */}
              <button
                onClick={handleProfileClick}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Profil"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-700"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </>
          ) : (
            /* Sign In Link */
            <button
              onClick={handleSignInClick}
              className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
