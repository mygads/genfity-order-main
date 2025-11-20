'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TableNumberModal from '@/components/customer/TableNumberModal';
import Image from 'next/image';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

interface MerchantPageProps {
  params: Promise<{
    merchantCode: string;
  }>;
}

interface MerchantData {
  id: bigint;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  coverImageUrl?: string;
  openingHours: {
    id: bigint;
    dayOfWeek: number;
    isClosed: boolean;
    is24Hours: boolean;
    openTime?: string;
    closeTime?: string;
  }[];
}

/**
 * GENFITY - Order Mode Selection Page
 * 
 * Ultra-minimal mobile-first design for selecting dine-in or takeaway mode.
 * 
 * Design principles:
 * - Mobile-first: max-w-[420px] centered layout
 * - Clean typography with proper hierarchy
 * - English labels for accessibility
 * - Dark mode support throughout
 * - Minimal visual elements, maximum readability
 * 
 * Flow:
 * 1. Check localStorage for cached mode → auto-redirect if found
 * 2. Show merchant info with clean layout
 * 3. User selects "Dine In" or "Takeaway"
 * 4. For dine-in: show table number modal first
 * 5. Navigate to order page with selected mode
 * 
 * @param {Promise<{merchantCode: string}>} params - Route params
 */
export default function MerchantModePage({ params }: MerchantPageProps) {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState<string>('');
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutletInfo, setShowOutletInfo] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  useEffect(() => {
    params.then(({ merchantCode: code }) => {
      setMerchantCode(code);

      // Check localStorage for cached mode
      const cachedMode = localStorage.getItem(`mode_${code}`);
      if (cachedMode === 'dinein' || cachedMode === 'takeaway') {
        router.replace(`/${code}/order?mode=${cachedMode}`);
        return;
      }

      // Fetch merchant data
      fetchMerchant(code);
    });
  }, [params, router]);

  const fetchMerchant = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/merchants/${code}`);

      if (!response.ok) {
        const errorData = await response.json();

        // Check if merchant is disabled
        if (errorData.error === 'MERCHANT_DISABLED') {
          throw new Error('This merchant is currently inactive');
        }

        throw new Error('Merchant not found');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to load merchant data');
      }

      setMerchant(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Failed to fetch merchant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSelect = (selectedMode: 'dinein' | 'takeaway') => {
    // Save mode to localStorage
    localStorage.setItem(`mode_${merchantCode}`, selectedMode);

    // For dine-in, show table number modal first
    if (selectedMode === 'dinein') {
      setShowTableModal(true);
    } else {
      // For takeaway, go directly to order page
      router.replace(`/${merchantCode}/order?mode=${selectedMode}`);
    }
  };

  const handleTableNumberConfirm = (_tableNumber: string) => {
    setShowTableModal(false);
    // Navigate to order page with dine-in mode
    router.push(`/${merchantCode}/order?mode=dinein`);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (isLoading) {
    return <LoadingState type="page" message={LOADING_MESSAGES.MERCHANT} />;
  }

  if (error || !merchant) {
    return (
      <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900 items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl">😕</span>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            {error || 'Merchant Not Found'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please check the merchant code and try again
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[420px] mx-auto bg-white dark:bg-gray-900">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between h-14 px-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
            {merchant.name}
          </h1>
          <div className="w-5" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Merchant Banner - Minimal Height */}
      <div className="relative h-40 w-full overflow-hidden">
        {merchant.coverImageUrl ? (
          <>
            <Image
              src={merchant.coverImageUrl}
              alt={merchant.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        )}
      </div>

      {/* Merchant Info - Clean & Minimal */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          {merchant.name}
        </h2>

        <div className="space-y-2">
          {merchant.address && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex items-start gap-2">
              <span className="text-base shrink-0">📍</span>
              <span>{merchant.address}</span>
            </p>
          )}

          {merchant.phone && (
            <a
              href={`tel:${merchant.phone}`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            >
              <span className="text-base">📞</span>
              <span>{merchant.phone}</span>
            </a>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="text-base">🕐</span>
            <span>
              {merchant.openingHours?.[0]?.is24Hours
                ? 'Open 24 Hours'
                : merchant.openingHours?.[0]?.isClosed
                  ? 'Closed'
                  : `${merchant.openingHours?.[0]?.openTime || '08:00'} - ${merchant.openingHours?.[0]?.closeTime || '22:00'}`}
            </span>
          </p>
        </div>

        {/* View Details Toggle */}
        <button
          onClick={() => setShowOutletInfo(!showOutletInfo)}
          className="mt-4 text-sm font-medium text-orange-500 dark:text-orange-400 flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
        >
          View Operating Hours
          <svg
            className={`w-4 h-4 transition-transform ${showOutletInfo ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Operating Hours (Expandable) */}
      {showOutletInfo && merchant.openingHours && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Operating Hours</h3>
          <div className="space-y-2">
            {merchant.openingHours
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((hours) => (
                <div
                  key={hours.id.toString()}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dayNames[hours.dayOfWeek]}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {hours.isClosed
                      ? 'Closed'
                      : hours.is24Hours
                        ? 'Open 24 Hours'
                        : `${hours.openTime} - ${hours.closeTime}`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Mode Selection - Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-6">
            Choose Order Type
          </h2>

          {/* Dine In Button */}
          <button
            onClick={() => handleModeSelect('dinein')}
            className="w-full h-14 bg-orange-500 text-white rounded-lg font-semibold text-base hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="text-xl">🍽️</span>
            Dine In
          </button>

          {/* Takeaway Button */}
          <button
            onClick={() => handleModeSelect('takeaway')}
            className="w-full h-14 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold text-base hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700"
          >
            <span className="text-xl">🛍️</span>
            Takeaway
          </button>
        </div>
      </div>

      {/* Description (Optional) */}
      {merchant.description && (
        <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">About Us</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {merchant.description}
          </p>
        </div>
      )}

      {/* Table Number Modal */}
      <TableNumberModal
        merchantCode={merchantCode}
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onConfirm={handleTableNumberConfirm}
      />
    </div>
  );
}

