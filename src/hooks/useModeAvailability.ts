'use client';

import { useState, useEffect, useCallback } from 'react';

interface ModeAvailabilityResult {
    isAvailable: boolean;
    modeClosesAt: string | null; // HH:mm
    minutesUntilClose: number | null;
    estimatedPickupTime: number; // minutes from now
    canOrderForPickup: boolean; // Will mode still be open at pickup time?
    warningMessage: string | null;
}

// Note: _ModeSchedule is reserved for future use when adding per-day mode schedules
interface _ModeSchedule {
    startTime: string;
    endTime: string;
    isActive: boolean;
}

/**
 * Hook to check if ordering mode will be available at estimated pickup time
 * 
 * @param merchantCode - The merchant code
 * @param mode - 'dinein' | 'takeaway'
 * @param estimatedMinutes - Estimated preparation/pickup time in minutes (default 15)
 */
export function useModeAvailability(
    merchantCode: string,
    mode: 'dinein' | 'takeaway',
    estimatedMinutes: number = 15
): ModeAvailabilityResult {
    const [result, setResult] = useState<ModeAvailabilityResult>({
        isAvailable: true,
        modeClosesAt: null,
        minutesUntilClose: null,
        estimatedPickupTime: estimatedMinutes,
        canOrderForPickup: true,
        warningMessage: null,
    });

    const checkAvailability = useCallback(async () => {
        try {
            // Fetch merchant info which has mode schedules
            const response = await fetch(`/api/public/merchants/${merchantCode}`);
            const data = await response.json();

            if (!data.success) {
                return;
            }

            const merchant = data.data;
            const now = new Date();
            const dayOfWeek = now.getDay();

            // ✅ FIRST: Check if store is manually opened (isOpen flag)
            // If isOpen is true, store is open regardless of schedule
            if (merchant.isOpen === true) {
                console.log('[useModeAvailability] Store is manually open, bypassing schedule check');
                setResult({
                    isAvailable: true,
                    modeClosesAt: null,
                    minutesUntilClose: null,
                    estimatedPickupTime: estimatedMinutes,
                    canOrderForPickup: true,
                    warningMessage: null,
                });
                return;
            }

            // Get mode-specific schedule end time
            let modeScheduleEnd: string | null = null;

            // First check for mode-specific global schedule
            if (mode === 'dinein') {
                modeScheduleEnd = merchant.dineInScheduleEnd || null;
            } else {
                modeScheduleEnd = merchant.takeawayScheduleEnd || null;
            }

            // If no mode-specific schedule, check opening hours
            if (!modeScheduleEnd && merchant.openingHours) {
                const todayHours = merchant.openingHours.find(
                    (h: { dayOfWeek: number }) => h.dayOfWeek === dayOfWeek
                );
                if (todayHours && !todayHours.isClosed) {
                    modeScheduleEnd = todayHours.closeTime;
                }
            }

            if (!modeScheduleEnd) {
                // No schedule defined, assume available
                setResult({
                    isAvailable: true,
                    modeClosesAt: null,
                    minutesUntilClose: null,
                    estimatedPickupTime: estimatedMinutes,
                    canOrderForPickup: true,
                    warningMessage: null,
                });
                return;
            }

            // Parse schedule end time
            const [endHour, endMinute] = modeScheduleEnd.split(':').map(Number);
            const closeTime = new Date();
            closeTime.setHours(endHour, endMinute, 0, 0);

            // Calculate minutes until close
            const diffMs = closeTime.getTime() - now.getTime();
            const minutesUntilClose = Math.floor(diffMs / 60000);

            // Check if mode is currently available
            const isAvailable = minutesUntilClose > 0;

            // Calculate if order can be picked up before close
            // Add buffer of 5 minutes for safety
            const canOrderForPickup = minutesUntilClose >= (estimatedMinutes + 5);

            // Generate warning message if needed
            let warningMessage: string | null = null;
            if (!isAvailable) {
                warningMessage = `${mode === 'dinein' ? 'Dine In' : 'Takeaway'} is now closed`;
            } else if (!canOrderForPickup) {
                warningMessage = `${mode === 'dinein' ? 'Dine In' : 'Takeaway'} closes at ${modeScheduleEnd}. Your estimated pickup time is ${estimatedMinutes} minutes. Please try again tomorrow or switch modes.`;
            } else if (minutesUntilClose <= 30) {
                warningMessage = `${mode === 'dinein' ? 'Dine In' : 'Takeaway'} closes in ${minutesUntilClose} minutes`;
            }

            setResult({
                isAvailable,
                modeClosesAt: modeScheduleEnd,
                minutesUntilClose,
                estimatedPickupTime: estimatedMinutes,
                canOrderForPickup,
                warningMessage,
            });
        } catch (error) {
            console.error('Error checking mode availability:', error);
        }
    }, [merchantCode, mode, estimatedMinutes]);

    useEffect(() => {
        checkAvailability();

        // Re-check every minute
        const interval = setInterval(checkAvailability, 60000);
        return () => clearInterval(interval);
    }, [checkAvailability]);

    return result;
}
