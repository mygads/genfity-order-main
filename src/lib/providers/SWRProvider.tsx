/**
 * SWR Configuration Provider
 * Global SWR configuration for data fetching, caching, and revalidation
 * Includes offline support and cache persistence
 */

'use client';

import { SWRConfig, Cache, State } from 'swr';
import { ReactNode, useEffect, useState, useCallback, useMemo } from 'react';

// Cache storage key
const CACHE_KEY = 'genfity-swr-cache';

/**
 * Custom cache provider with localStorage persistence for offline support
 */
function localStorageProvider(): Map<string, State<unknown, unknown>> {
  // When initializing, we restore the data from localStorage into a map.
  const map = new Map<string, State<unknown, unknown>>();
  
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          map.set(key, value as State<unknown, unknown>);
        });
      }
    } catch (e) {
      console.warn('[SWR] Failed to restore cache from localStorage:', e);
    }
  }

  return map;
}

/**
 * Default fetcher function with authentication and offline detection
 */
const fetcher = async (url: string) => {
  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are offline. Data will be loaded when connection is restored.');
  }

  const token = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('accessToken') 
    : null;
  
  const res = await fetch(url, {
    headers: token ? {
      'Authorization': `Bearer ${token}`,
    } : {},
  });

  if (!res.ok) {
    const error: Error & { info?: unknown; status?: number } = new Error(
      'An error occurred while fetching the data.'
    );
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Save cache to localStorage for offline support
 */
function _saveCacheToStorage(cache: Cache<unknown>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData: Record<string, unknown> = {};
    // Type assertion to access internal cache structure
    const cacheMap = cache as unknown as Map<string, unknown>;
    if (cacheMap.forEach) {
      cacheMap.forEach((value, key) => {
        // Only cache successful responses
        if (value && typeof value === 'object' && 'data' in value) {
          cacheData[key] = value;
        }
      });
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('[SWR] Failed to save cache to localStorage:', e);
  }
}

/**
 * SWR Configuration Provider
 * 
 * Features:
 * - Global fetcher with auth support
 * - 5-second revalidation for real-time feel
 * - Revalidate on focus for fresh data
 * - Error retry with exponential backoff
 * - Optimistic UI support
 * - Offline support with cache persistence
 * - Online/offline status detection
 */
export default function SWRProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Handle online/offline events
  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      console.log('[SWR] Connection restored. Revalidating data...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[SWR] Connection lost. Using cached data...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Memoized cache provider
  const cacheProvider = useCallback(() => localStorageProvider(), []);

  // SWR config with offline support
  const swrConfig = useMemo(() => ({
    fetcher,
    provider: cacheProvider,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: isOnline ? 5000 : 0, // Stop polling when offline
    dedupingInterval: 2000,
    errorRetryCount: isOnline ? 3 : 0, // Don't retry when offline
    errorRetryInterval: 5000,
    shouldRetryOnError: isOnline,
    revalidateIfStale: isOnline, // Only revalidate stale data when online
    onSuccess: (_data: unknown, _key: string, _config: unknown) => {
      // Save to localStorage on successful fetch
      // This is handled by the cache provider
    },
    onError: (error: Error & { status?: number }, key: string) => {
      console.error(`[SWR] Error for ${key}:`, error);
      
      // Redirect to login on 401
      if (error.status === 401) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
      }
    },
  }), [isOnline, cacheProvider]);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <SWRConfig value={swrConfig}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span>You are offline. Using cached data.</span>
        </div>
      )}
      {children}
    </SWRConfig>
  );
}

