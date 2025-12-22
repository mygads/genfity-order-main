'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';

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

      // ✅ REMOVED: No more auto-redirect from cached mode
      // User should always see mode selection when visiting merchant page directly
      // Cached mode is only used as a convenience, not for auto-redirect

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
    return (
      <>
        {/* Banner Skeleton - Match RestaurantBanner (214px) */}
        <div
          className="relative w-full bg-gray-200 dark:bg-gray-700 animate-pulse"
          style={{ height: '214px', borderRadius: '0 0 8px 8px' }}
        />

        {/* Merchant Info Card Skeleton */}
        <div className="px-3 -mt-6 relative z-10">
          <div
            className="p-4 bg-white dark:bg-gray-800 rounded-2xl animate-pulse"
            style={{
              border: '0.66px solid #E6E6E6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>

        {/* How to use Section Skeleton */}
        <div className="px-3 my-4 mt-12">
          <div className="text-center">
            <div className="w-48 h-5 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />

            {/* Steps Skeleton */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-1" />
                <div className="w-10 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-1" />
                <div className="w-10 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-1" />
                <div className="w-10 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selection Skeleton */}
        <div className="px-3 mb-6">
          <div className="text-center">
            <div className="w-56 h-5 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />

            <div className="space-y-3">
              <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-auto px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </>
    );
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

      {/* BANNER - Matching Order Page Style */}
      <RestaurantBanner
        bannerUrl={merchant.bannerUrl}
        imageUrl={merchant.logoUrl}
        merchantName={merchant.name}
      />

      {/* Merchant Info Card - Matching Order Page Style */}
      <div className="px-3 -mt-6 relative z-10">
        <RestaurantInfoCard
          name={merchant.name}
          openingHours={(merchant.openingHours || []).map(h => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime || '',
            closeTime: h.closeTime || '',
            isClosed: h.isClosed,
          }))}
          onClick={() => setShowOutletInfo(true)}
        />
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

