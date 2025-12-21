'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
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
  logoUrl?: string | null;
  bannerUrl?: string | null;
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

    // Go directly to order page for both modes
    // Table number modal will appear in order page if needed
    router.replace(`/${merchantCode}/order?mode=${selectedMode}`);
  };

  if (isLoading) {
    return <LoadingState type="page" message={LOADING_MESSAGES.MERCHANT} />;
  }

  if (error || !merchant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
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
    <>

      {/* BANNER 1 - WITH HEADER (Transparent & Overlay) */}
      <div className="relative w-full h-32 mb-4">
        {/* Banner Image */}
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={merchant.bannerUrl || '/images/no-outlet.png'}
            alt={merchant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/no-outlet.png';
            }}
          />
        </div>

        {/* Header Overlay - Transparent & Absolute */}
        <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
          <div className="flex items-center justify-between px-4 py-2">
            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title (Empty in original design) */}
            <div className="grow text-center font-semibold text-gray-900 dark:text-white" style={{ fontSize: '1.2rem' }}>
            </div>
          </div>
        </header>

        {/* Merchant Info Section - Floating Card */}
        <div className="absolute left-4 right-4 -bottom-8">
          <div
            className="flex items-center px-4 py-3 cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]"
            onClick={() => setShowOutletInfo(!showOutletInfo)}
          >
            {/* Merchant Logo */}
            <div className="w-12 h-12 rounded overflow-hidden shrink-0 mr-3 bg-gray-100 dark:bg-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={merchant.logoUrl || '/images/no-outlet.png'}
                alt={merchant.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/no-outlet.png';
                }}
              />
            </div>

            {/* Merchant Name */}
            <div className="grow font-medium text-gray-900 dark:text-white">
              {merchant.name}
            </div>

            {/* Chevron Right Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </div>
        </div>

      </div>

      {/* How to use Genfity Order Section */}
      <div className="px-3 my-4">
        <div className="text-center">
          <h3 className="my-4 mb-2 text-base font-semibold text-gray-900 dark:text-white">
            How to use Genfity Order
          </h3>

          {/* Steps: Order → Pay → Eat */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Step 1: Order */}
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/step-order.png"
                alt="Order"
                className="w-14 h-14 mb-1"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Order</span>
            </div>

            {/* Arrow */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>

            {/* Step 2: Pay */}
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/step-pay.png"
                alt="Pay"
                className="w-14 h-14 mb-1"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Pay</span>
            </div>

            {/* Arrow */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>

            {/* Step 3: Eat */}
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/step-eat.png"
                alt="Eat"
                className="w-14 h-14 mb-1"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Eat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection Section */}
      <div className="px-3 mb-6">
        <div className="text-center">
          <h3 className="my-4 mb-4 text-base font-semibold text-gray-900 dark:text-white">
            How would you like to eat today?
          </h3>

          {/* Mode Selection Buttons */}
          <div className="space-y-3">
            {/* Dine In Button */}
            <button
              id="mode-dinein"
              onClick={() => handleModeSelect('dinein')}
              className="w-full h-12 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-base font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              Dine In
            </button>

            {/* Pick Up Button */}
            <button
              id="mode-takeaway"
              onClick={() => handleModeSelect('takeaway')}
              className="w-full h-12 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-base font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              Pick Up
            </button>
          </div>
        </div>
      </div>

      {/* Footer - Powered by Genfity */}
      <div className="mt-auto px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Powered by</span>
          <span className="font-semibold text-gray-900 dark:text-white">Genfity</span>
        </div>
      </div>




      {/* Outlet Info Modal */}
      <OutletInfoModal
        isOpen={showOutletInfo}
        onClose={() => setShowOutletInfo(false)}
        merchant={{
          name: merchant.name,
          address: merchant.address,
          phone: merchant.phone,
          openingHours: merchant.openingHours,
        }}
      />
    </>
  );
}

