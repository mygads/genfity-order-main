/**
 * useStoreStatus Hook
 * 
 * Fetches real-time store status from API (not cached).
 * Uses SWR for automatic revalidation and caching on client-side.
 * 
 * @specification copilot-instructions.md - Never cache store status
 */

'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { isStoreEffectivelyOpen, isWithinSchedule, getMinutesUntilClose } from '@/lib/utils/storeStatus';

interface OpeningHour {
  id: string;
  dayOfWeek: number;
  isClosed: boolean;
  is24Hours?: boolean;
  openTime?: string;
  closeTime?: string;
}

interface StoreStatusResponse {
  isOpen: boolean;
  timezone: string;
  isDineInEnabled: boolean;
  isTakeawayEnabled: boolean;
  dineInLabel: string | null;
  takeawayLabel: string | null;
  dineInScheduleStart: string | null;
  dineInScheduleEnd: string | null;
  takeawayScheduleStart: string | null;
  takeawayScheduleEnd: string | null;
  openingHours: OpeningHour[];
  serverTime: string;
}

interface UseStoreStatusResult {
  // Loading & Error states
  isLoading: boolean;
  error: Error | null;
  
  // Store status
  storeOpen: boolean;
  
  // Mode availability
  isDineInEnabled: boolean;
  isTakeawayEnabled: boolean;
  isDineInAvailable: boolean;
  isTakeawayAvailable: boolean;
  
  // Labels
  dineInLabel: string;
  takeawayLabel: string;
  
  // Time info
  minutesUntilClose: number | null;
  timezone: string;
  openingHours: OpeningHour[];
  
  // Refetch function
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    cache: 'no-store', // Never cache
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch store status');
  }
  
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch store status');
  }
  
  return data.data as StoreStatusResponse;
};

/**
 * Hook to fetch real-time store status
 * 
 * @param merchantCode - The merchant code to fetch status for
 * @param options - SWR options
 * @returns Store status data and helpers
 */
export function useStoreStatus(
  merchantCode: string,
  options?: {
    refreshInterval?: number; // Default: 30000 (30 seconds)
    revalidateOnFocus?: boolean; // Default: true
  }
): UseStoreStatusResult {
  const { refreshInterval = 30000, revalidateOnFocus = true } = options || {};
  
  const { data, error, isLoading, mutate } = useSWR<StoreStatusResponse>(
    merchantCode ? `/api/public/merchants/${merchantCode}/status` : null,
    fetcher,
    {
      refreshInterval, // Refresh every 30 seconds by default
      revalidateOnFocus, // Refresh when user returns to tab
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );
  
  // Calculate derived values
  const result = useMemo((): Omit<UseStoreStatusResult, 'isLoading' | 'error' | 'refresh'> => {
    if (!data) {
      return {
        storeOpen: true, // Default to open while loading
        isDineInEnabled: true,
        isTakeawayEnabled: true,
        isDineInAvailable: true,
        isTakeawayAvailable: true,
        dineInLabel: 'Dine In',
        takeawayLabel: 'Pick Up',
        minutesUntilClose: null,
        timezone: 'UTC',
        openingHours: [],
      };
    }
    
    // Check if store is effectively open
    const storeOpen = isStoreEffectivelyOpen({
      isOpen: data.isOpen,
      openingHours: data.openingHours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
        is24Hours: h.is24Hours,
      })),
      timezone: data.timezone,
    });
    
    // Check mode schedules
    const isDineInWithinSchedule = isWithinSchedule(
      data.dineInScheduleStart,
      data.dineInScheduleEnd,
      data.timezone
    );
    const isTakeawayWithinSchedule = isWithinSchedule(
      data.takeawayScheduleStart,
      data.takeawayScheduleEnd,
      data.timezone
    );
    
    // Mode is available if enabled AND within schedule
    const isDineInAvailable = data.isDineInEnabled && isDineInWithinSchedule;
    const isTakeawayAvailable = data.isTakeawayEnabled && isTakeawayWithinSchedule;
    
    // Calculate minutes until close
    const minutesUntilClose = storeOpen
      ? getMinutesUntilClose(data.openingHours, data.timezone)
      : null;
    
    return {
      storeOpen,
      isDineInEnabled: data.isDineInEnabled,
      isTakeawayEnabled: data.isTakeawayEnabled,
      isDineInAvailable,
      isTakeawayAvailable,
      dineInLabel: data.dineInLabel || 'Dine In',
      takeawayLabel: data.takeawayLabel || 'Pick Up',
      minutesUntilClose,
      timezone: data.timezone,
      openingHours: data.openingHours,
    };
  }, [data]);
  
  return {
    isLoading,
    error: error || null,
    ...result,
    refresh: () => mutate(),
  };
}

export default useStoreStatus;
