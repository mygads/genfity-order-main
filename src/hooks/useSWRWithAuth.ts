/**
 * GENFITY Custom SWR Hook with Authentication
 *
 * @description
 * A reusable hook that wraps SWR with authentication handling.
 * Automatically:
 * - Delays fetching until component is mounted (hydration-safe)
 * - Checks for auth token before fetching
 * - Redirects to login if no token
 * - Provides consistent loading/error states
 *
 * @example
 * ```typescript
 * const { data, error, isLoading, mutate } = useSWRWithAuth<MenuData[]>(
 *   '/api/merchant/menu',
 *   { refreshInterval: 10000 } // Optional: Poll every 10 seconds
 * );
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { SWRConfiguration, KeyedMutator } from 'swr';

// Custom fetcher with auth header
const authFetcher = async (url: string) => {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error: Error & { status?: number; info?: unknown } = new Error(
      'An error occurred while fetching the data.'
    );
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export interface UseSWRWithAuthOptions<T> extends SWRConfiguration<T> {
  /** Skip authentication check (for public endpoints) */
  skipAuth?: boolean;
  /** Custom redirect path if no token */
  loginRedirect?: string;
  /** Whether to skip the initial mount check */
  skipMountCheck?: boolean;
}

export interface UseSWRWithAuthReturn<T> {
  /** The fetched data */
  data: T | undefined;
  /** Error if fetch failed */
  error: Error | undefined;
  /** True during initial load */
  isLoading: boolean;
  /** True if validating/revalidating */
  isValidating: boolean;
  /** True when component is mounted (client-side) */
  isMounted: boolean;
  /** Function to mutate the data */
  mutate: KeyedMutator<T>;
  /** Function to trigger a refresh */
  refresh: () => Promise<T | undefined>;
}

/**
 * SWR hook with authentication and hydration safety
 *
 * @param key - The API endpoint or null to skip fetching
 * @param options - SWR configuration options
 * @returns SWR data, error, loading states, and utilities
 */
export function useSWRWithAuth<T = unknown>(
  key: string | null,
  options?: UseSWRWithAuthOptions<T>
): UseSWRWithAuthReturn<T> {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hasToken, setHasToken] = useState(true);

  const {
    skipAuth = false,
    loginRedirect = '/admin/login',
    skipMountCheck = false,
    ...swrOptions
  } = options || {};

  // Handle mount state to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);

    if (!skipAuth) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setHasToken(false);
        router.push(loginRedirect);
      }
    }
  }, [router, skipAuth, loginRedirect]);

  // Determine the actual key to use
  const actualKey = (() => {
    if (skipMountCheck) return key;
    if (!isMounted) return null;
    if (!skipAuth && !hasToken) return null;
    return key;
  })();

  // Use SWR with auth fetcher
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    actualKey,
    authFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      ...swrOptions,
    }
  );

  // Refresh function
  const refresh = useCallback(async () => {
    return mutate();
  }, [mutate]);

  return {
    data,
    error,
    isLoading: !isMounted || isLoading,
    isValidating,
    isMounted,
    mutate,
    refresh,
  };
}

/**
 * SWR hook for live data with polling (e.g., orders)
 * Pre-configured with 5-second polling interval
 */
export function useSWRLive<T = unknown>(
  key: string | null,
  options?: Omit<UseSWRWithAuthOptions<T>, 'refreshInterval'>
): UseSWRWithAuthReturn<T> {
  return useSWRWithAuth<T>(key, {
    ...options,
    refreshInterval: 5000, // Poll every 5 seconds
  });
}

/**
 * SWR hook for static data (e.g., categories, settings)
 * No polling, only revalidates on focus/reconnect
 */
export function useSWRStatic<T = unknown>(
  key: string | null,
  options?: Omit<UseSWRWithAuthOptions<T>, 'refreshInterval'>
): UseSWRWithAuthReturn<T> {
  return useSWRWithAuth<T>(key, {
    ...options,
    refreshInterval: 0,
    revalidateIfStale: false,
  });
}

export default useSWRWithAuth;
