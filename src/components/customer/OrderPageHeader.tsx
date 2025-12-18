'use client';

import { ArrowLeft, History, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { useState, useEffect } from 'react';

interface OrderPageHeaderProps {
  merchantName: string;
  merchantLogo: string | null;
  isSticky: boolean;
  onBackClick: () => void;
  tableNumber?: string | null;
  mode?: 'dinein' | 'takeaway';
  showTableBadge?: boolean;
}

/**
 * ✅ Order Page Header Component
 * Matches reference header.tsx pattern with sticky behavior
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */
export default function OrderPageHeader({
  merchantName,
  merchantLogo,
  isSticky,
  onBackClick,
  tableNumber,
  mode,
  showTableBadge = false,
}: OrderPageHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const merchantCode = params.merchantCode as string;
  const currentMode = searchParams.get('mode') || mode || 'takeaway';

  // Check if user is logged in
  useEffect(() => {
    const auth = getCustomerAuth();
    setIsLoggedIn(auth !== null);
  }, []);

  // Determine if we should show table number state (dine-in with table number and sticky and scrolled past table card)
  const showTableNum = isSticky && mode === 'dinein' && tableNumber && showTableBadge;

  const handleHistoryClick = () => {
    router.push(`/${merchantCode}/history?mode=${currentMode}`);
  };

  const handleProfileClick = () => {
    router.push(`/${merchantCode}/profile?ref=${encodeURIComponent(`/${merchantCode}/order?mode=${currentMode}`)}`);
  };

  return (
    <header
      data-header
      data-main-header
      className={`sticky-toolbar transition-all duration-300 ${isSticky ? 'active' : ''
        } ${showTableNum ? 'show-table-num' : ''
        } fixed top-0 left-0 right-0 z-50 max-w-[420px] mx-auto ${isSticky
          ? 'bg-white dark:bg-gray-800'
          : 'bg-transparent'
        }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section - Back Button + Logo + Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={onBackClick}
              className={`p-2 -ml-2 rounded-full transition-colors shrink-0 ${isSticky
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'bg-white hover:bg-gray-100'
                }`}
              aria-label="Go back"
            >
              <ArrowLeft className={`w-5 h-5 ${isSticky ? 'text-gray-900 dark:text-white' : 'text-gray-900'
                }`} />
            </button>

            {/* Show merchant info only when sticky */}
            {isSticky && (
              <>
                {merchantLogo && (
                  <div className="shrink-0">
                    <Image
                      src={merchantLogo}
                      alt={merchantName}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  </div>
                )}

                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {merchantName}
                </h1>

                {/* Table Number Badge (shown when sticky + dine-in) */}
                {showTableNum && (
                  <div className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded shrink-0">
                    Table {tableNumber}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Section - History + Profile Icons (only show when logged in) */}
          {isLoggedIn && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleHistoryClick}
                className={`p-2 rounded-full transition-colors ${isSticky
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-100'
                  }`}
                aria-label="Order History"
              >
                <History className={`w-5 h-5 ${isSticky ? 'text-gray-900 dark:text-white' : 'text-gray-900'
                  }`} />
              </button>
              <button
                onClick={handleProfileClick}
                className={`p-2 rounded-full transition-colors ${isSticky
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-100'
                  }`}
                aria-label="Profile"
              >
                <User className={`w-5 h-5 ${isSticky ? 'text-gray-900 dark:text-white' : 'text-gray-900'
                  }`} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
