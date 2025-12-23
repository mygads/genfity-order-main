'use client';

import { ArrowLeft, Search, Menu, User } from 'lucide-react';
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
  onSearchClick?: () => void;
}

/**
 * ✅ Order Page Header Component - Burjo ESB Style
 * 
 * Matches Burjo ESB reference exactly:
 * - Height: 55px
 * - Background: transparent (initial) → white (sticky)
 * - Icon buttons: 36x36px, circular, white background
 * - Icons: Back, Search, Menu/Account
 * - Store name appears when sticky
 * 
 * @specification Burjo ESB Reference
 */
export default function OrderPageHeader({
  merchantName,
  // merchantLogo prop is currently unused but kept for interface consistency
  merchantLogo: _merchantLogo,
  isSticky,
  onBackClick,
  tableNumber,
  mode,
  showTableBadge = false,
  onSearchClick,
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

  // Determine if we should show table number (dine-in with table number and sticky)
  const showTableNum = isSticky && mode === 'dinein' && tableNumber && showTableBadge;

  const handleProfileClick = () => {
    router.push(`/${merchantCode}/profile?ref=${encodeURIComponent(`/${merchantCode}/order?mode=${currentMode}`)}`);
  };

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    }
  };

  // Icon button base styles - 36x36px, circular, white bg
  const iconButtonClass = `
    w-9 h-9 flex items-center justify-center rounded-full 
    bg-white shadow-sm
    hover:bg-gray-50 active:scale-95
    transition-all duration-200
  `;

  return (
    <>
      {/* Sticky Table Number Bar - Appears above header when scrolled (Burjo style) */}
      {showTableNum && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] max-w-[500px] mx-auto"
          style={{
            backgroundColor: '#fff7ed',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#212529',
          }}
        >
          Table {tableNumber}
        </div>
      )}

      {/* Main Header - Burjo ESB Style */}
      <header
        data-header
        data-main-header
        className={`fixed left-0 right-0 z-50 max-w-[500px] mx-auto transition-all duration-300`}
        style={{
          top: showTableNum ? '40px' : '0',
          height: '55px',
          backgroundColor: isSticky ? '#ffffff' : 'transparent',
          boxShadow: isSticky ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left Section - Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackClick}
              className={iconButtonClass}
              aria-label="Go back"
              style={{
                boxShadow: isSticky ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <ArrowLeft className="w-5 h-5 text-[#212529]" />
            </button>

            {/* Store Name - Only show when sticky */}
            {isSticky && (
              <h1
                className="text-base font-bold text-[#212529] truncate max-w-[180px]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {merchantName}
              </h1>
            )}
          </div>

          {/* Right Section - Search + Menu/Account Icons */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={handleSearchClick}
              className={iconButtonClass}
              aria-label="Search"
              style={{
                boxShadow: isSticky ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <Search className="w-5 h-5 text-[#212529]" />
            </button>

            {/* Menu/Account Button */}
            <button
              onClick={handleProfileClick}
              className={iconButtonClass}
              aria-label="Menu"
              style={{
                boxShadow: isSticky ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {isLoggedIn ? (
                <User className="w-5 h-5 text-[#212529]" />
              ) : (
                <Menu className="w-5 h-5 text-[#212529]" />
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

