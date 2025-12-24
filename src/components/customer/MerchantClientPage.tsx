'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OutletInfoModal from '@/components/customer/OutletInfoModal';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';
import { isStoreEffectivelyOpen, isWithinSchedule as isWithinScheduleUtil } from '@/lib/utils/storeStatus';
import { useToast } from '@/hooks/useToast';

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
    isOpen?: boolean; // Manual toggle from database
    timezone?: string; // Merchant timezone
    isDineInEnabled?: boolean;
    isTakeawayEnabled?: boolean;
    dineInLabel?: string | null;
    takeawayLabel?: string | null;
    dineInScheduleStart?: string | null;
    dineInScheduleEnd?: string | null;
    takeawayScheduleStart?: string | null;
    takeawayScheduleEnd?: string | null;
    openingHours: OpeningHour[];
}

interface MerchantClientPageProps {
    merchant: MerchantData;
    merchantCode: string;
}

/**
 * Check if current time is within a schedule range
 * Uses the unified utility from storeStatus.ts
 */
function isWithinSchedule(scheduleStart?: string | null, scheduleEnd?: string | null, timezone?: string): boolean {
    return isWithinScheduleUtil(scheduleStart, scheduleEnd, timezone);
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
    const { showToast } = useToast();
    const [showOutletInfo, setShowOutletInfo] = useState(false);

    // Use unified store status utility (checks both isOpen toggle AND opening hours)
    const storeOpen = isStoreEffectivelyOpen({
        isOpen: merchant.isOpen,
        openingHours: merchant.openingHours.map(h => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
            is24Hours: h.is24Hours,
        })),
        timezone: merchant.timezone,
    });
    
    // Check which sale modes are enabled (default to true if not set)
    const isDineInEnabled = merchant.isDineInEnabled ?? true;
    const isTakeawayEnabled = merchant.isTakeawayEnabled ?? true;

    // Check if modes are within their scheduled hours
    const isDineInWithinSchedule = isWithinSchedule(merchant.dineInScheduleStart, merchant.dineInScheduleEnd, merchant.timezone);
    const isTakeawayWithinSchedule = isWithinSchedule(merchant.takeawayScheduleStart, merchant.takeawayScheduleEnd, merchant.timezone);

    // Mode is available if enabled AND within schedule
    const isDineInAvailable = isDineInEnabled && isDineInWithinSchedule;
    const isTakeawayAvailable = isTakeawayEnabled && isTakeawayWithinSchedule;

    // Custom labels (fallback to defaults)
    const dineInLabel = merchant.dineInLabel || 'Dine In';
    const takeawayLabel = merchant.takeawayLabel || 'Pick Up';

    const handleModeSelect = (selectedMode: 'dinein' | 'takeaway') => {
        // Save mode to localStorage
        localStorage.setItem(`mode_${merchantCode}`, selectedMode);

        // Always redirect to order page (it will handle closed/unavailable state)
        router.replace(`/${merchantCode}/order?mode=${selectedMode}`);
        
        // Show toast if mode is unavailable
        if (selectedMode === 'dinein' && !isDineInAvailable) {
            showToast({
                variant: 'warning',
                title: 'Mode Unavailable',
                message: `${dineInLabel} is currently unavailable`,
                duration: 4000
            });
        } else if (selectedMode === 'takeaway' && !isTakeawayAvailable) {
            showToast({
                variant: 'warning',
                title: 'Mode Unavailable',
                message: `${takeawayLabel} is currently unavailable`,
                duration: 4000
            });
        }
    };

    // If only one mode is enabled and available, auto-redirect to order page
    useEffect(() => {
        if (!storeOpen) return;
        
        if (isDineInAvailable && !isTakeawayAvailable) {
            // Only dine-in available, auto-redirect
            router.replace(`/${merchantCode}/order?mode=dinein`);
        } else if (!isDineInAvailable && isTakeawayAvailable) {
            // Only takeaway available, auto-redirect
            router.replace(`/${merchantCode}/order?mode=takeaway`);
        }
    }, [storeOpen, isDineInAvailable, isTakeawayAvailable, merchantCode, router]);

    return (
        <>
            {/* BANNER - Matching Order Page Style - Gray overlay when closed */}
            <RestaurantBanner
                bannerUrl={merchant.bannerUrl}
                imageUrl={merchant.logoUrl}
                merchantName={merchant.name}
                isClosed={!storeOpen}
            />

            {/* Merchant Info Card - Shows CLOSED badge when closed, clickable to order page */}
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
                    isClosed={!storeOpen}
                />
            </div>

            {/* How to use Genfity Order Section - Gray overlay when closed */}
            <div className={`px-3 my-4 ${!storeOpen ? 'opacity-50 grayscale' : ''}`}>
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

            {/* Mode Selection Section - Always show if at least one mode is configured */}
            {(isDineInEnabled || isTakeawayEnabled) && (
                <div className={`px-3 mb-6 ${!storeOpen ? 'opacity-60' : ''}`}>
                    <div className="text-center">
                        <h3 className="my-4 mb-4 text-base font-semibold text-gray-900 dark:text-white">
                            How would you like to eat today?
                        </h3>

                        {/* Mode Selection Buttons - Always visible, grayed when unavailable */}
                        <div className="space-y-3">
                            {/* Dine In Button - Always show if enabled */}
                            {isDineInEnabled && (
                                <button
                                    id="mode-dinein"
                                    onClick={() => handleModeSelect('dinein')}
                                    className={`w-full h-12 border rounded-lg text-base font-medium shadow-sm transition-colors duration-200 shadow-lg flex items-center justify-center gap-2 ${
                                        storeOpen && isDineInAvailable
                                            ? 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                                    }`}
                                >
                                    <span>{dineInLabel}</span>
                                    {(!storeOpen || !isDineInAvailable) && (
                                        <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                            UNAVAILABLE NOW
                                        </span>
                                    )}
                                    {isDineInAvailable && !isDineInWithinSchedule && (
                                        <span className="text-xs text-gray-400">
                                            ({merchant.dineInScheduleStart} - {merchant.dineInScheduleEnd})
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Pick Up Button - Always show if enabled */}
                            {isTakeawayEnabled && (
                                <button
                                    id="mode-takeaway"
                                    onClick={() => handleModeSelect('takeaway')}
                                    className={`w-full h-12 border rounded-lg text-base font-medium shadow-sm transition-colors duration-200 shadow-lg flex items-center justify-center gap-2 ${
                                        storeOpen && isTakeawayAvailable
                                            ? 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                                    }`}
                                >
                                    <span>{takeawayLabel}</span>
                                    {(!storeOpen || !isTakeawayAvailable) && (
                                        <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                            UNAVAILABLE NOW
                                        </span>
                                    )}
                                    {isTakeawayAvailable && !isTakeawayWithinSchedule && (
                                        <span className="text-xs text-gray-400">
                                            ({merchant.takeawayScheduleStart} - {merchant.takeawayScheduleEnd})
                                        </span>
                                    )}
                                </button>
                            )}
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
