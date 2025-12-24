'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';

interface OpeningHour {
    id: string;
    dayOfWeek: number;
    isClosed: boolean;
    is24Hours?: boolean;
    openTime?: string;
    closeTime?: string;
}

interface MerchantData {
    id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
    phone?: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    isDineInEnabled?: boolean;
    isTakeawayEnabled?: boolean;
    openingHours: OpeningHour[];
}

interface MerchantClientPageProps {
    merchant: MerchantData;
    merchantCode: string;
}

/**
 * Check if store is currently open based on opening hours
 */
function isStoreOpen(openingHours: OpeningHour[]): boolean {
    if (!openingHours || openingHours.length === 0) return true; // Default to open if no hours defined

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);

    // If no hours for today, assume closed
    if (!todayHours) return false;

    // If explicitly closed
    if (todayHours.isClosed) return false;

    // If 24 hours
    if (todayHours.is24Hours) return true;

    // Check time range
    if (todayHours.openTime && todayHours.closeTime) {
        return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
    }

    return true; // Default to open if times not defined
}

/**
 * GENFITY - Order Mode Selection Page (Client Component)
 * 
 * Handles:
 * - Mode selection (dine-in/takeaway)
 * - Store open/closed status with grayed out UI
 * - Outlet info modal
 */
export default function MerchantClientPage({ merchant, merchantCode }: MerchantClientPageProps) {
    const router = useRouter();
    const [showOutletInfo, setShowOutletInfo] = useState(false);

    const storeOpen = isStoreOpen(merchant.openingHours);
    
    // Check which sale modes are enabled (default to true if not set)
    const isDineInEnabled = merchant.isDineInEnabled ?? true;
    const isTakeawayEnabled = merchant.isTakeawayEnabled ?? true;

    const handleModeSelect = (selectedMode: 'dinein' | 'takeaway') => {
        if (!storeOpen) return; // Prevent selection when store is closed

        // Save mode to localStorage
        localStorage.setItem(`mode_${merchantCode}`, selectedMode);

        // Go directly to order page
        router.replace(`/${merchantCode}/order?mode=${selectedMode}`);
    };

    // If only one mode is enabled, auto-redirect to order page
    useEffect(() => {
        if (!storeOpen) return;
        
        if (isDineInEnabled && !isTakeawayEnabled) {
            // Only dine-in enabled, auto-redirect
            router.replace(`/${merchantCode}/order?mode=dinein`);
        } else if (!isDineInEnabled && isTakeawayEnabled) {
            // Only takeaway enabled, auto-redirect
            router.replace(`/${merchantCode}/order?mode=takeaway`);
        }
    }, [storeOpen, isDineInEnabled, isTakeawayEnabled, merchantCode, router]);

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

            {/* Store Closed Banner */}
            {!storeOpen && (
                <div className="px-3 mt-4">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                Store is Currently Closed
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Please check our opening hours and come back later
                        </p>
                    </div>
                </div>
            )}

            {/* How to use Genfity Order Section */}
            <div className={`px-3 my-4 ${!storeOpen ? 'opacity-50' : ''}`}>
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

            {/* Mode Selection Section - Only show if both modes enabled */}
            {isDineInEnabled && isTakeawayEnabled && (
                <div className="px-3 mb-6">
                    <div className="text-center">
                        <h3 className={`my-4 mb-4 text-base font-semibold text-gray-900 dark:text-white ${!storeOpen ? 'opacity-50' : ''}`}>
                            How would you like to eat today?
                        </h3>

                        {/* Mode Selection Buttons */}
                        <div className="space-y-3">
                            {/* Dine In Button */}
                            <button
                                id="mode-dinein"
                                onClick={() => handleModeSelect('dinein')}
                                disabled={!storeOpen}
                                className={`w-full h-12 border rounded-lg text-base font-medium shadow-sm transition-colors duration-200 shadow-lg ${storeOpen
                                    ? 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                    }`}
                            >
                                Dine In
                            </button>

                            {/* Pick Up Button */}
                            <button
                                id="mode-takeaway"
                                onClick={() => handleModeSelect('takeaway')}
                                disabled={!storeOpen}
                                className={`w-full h-12 border rounded-lg text-base font-medium shadow-sm transition-colors duration-200 shadow-lg ${storeOpen
                                    ? 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                    }`}
                            >
                                Pick Up
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Show message if no modes enabled */}
            {!isDineInEnabled && !isTakeawayEnabled && (
                <div className="px-3 mb-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                        <p className="text-amber-700 dark:text-amber-300 font-medium">
                            Ordering is currently unavailable
                        </p>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                            Please contact the merchant for more information
                        </p>
                    </div>
                </div>
            )}

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
                    openingHours: merchant.openingHours.map(h => ({
                        ...h,
                        is24Hours: h.is24Hours ?? false,
                    })),
                }}
            />
        </>
    );
}
