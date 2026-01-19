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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { SWRConfiguration, KeyedMutator } from 'swr';
import { clearAdminAuth, refreshAdminSession } from '@/lib/utils/adminAuth';
import { tOr, useTranslation } from '@/lib/i18n/useTranslation';
import type { ApiErrorResponse } from '@/lib/types/api';

// Custom error class with additional info
interface FetchError extends Error {
  status?: number;
  info?: unknown;
  isAuthError?: boolean;
}

/**
 * Clear all auth data from localStorage and redirect to login
 */
const clearSessionAndRedirect = (loginPath: string) => {
  // Clear admin auth (includes cookie + structured localStorage)
  clearAdminAuth();

  // Backwards-compat: clear legacy keys if any code still sets them
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Use window.location for hard redirect to ensure clean state
  window.location.href = loginPath;
};

/**
 * Create auth fetcher with redirect callback for 401 errors
 */
const createAuthFetcher = (loginRedirect: string) => async (url: string) => {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorInfo = await res.json().catch(() => ({}));
    
    // 401 Unauthorized - Token invalid/expired, clear session and redirect
    if (res.status === 401) {
      const refreshed = await refreshAdminSession();
      if (refreshed?.accessToken) {
        const retryRes = await fetch(url, {
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (retryRes.ok) {
          return retryRes.json();
        }

        const retryInfo = await retryRes.json().catch(() => ({}));
        const retryError: FetchError = new Error(
          retryInfo?.message || 'An error occurred while fetching the data.'
        );
        retryError.info = retryInfo;
        retryError.status = retryRes.status;
        retryError.isAuthError = retryRes.status === 401;
        throw retryError;
      }

      clearSessionAndRedirect(loginRedirect);
      // Return a promise that never resolves to prevent further execution
      return new Promise(() => {});
    }

    // Merchant deleted edge case: treat as invalid session and redirect
    if (
      res.status === 404 &&
      (errorInfo?.error === 'MERCHANT_NOT_FOUND' ||
        String(errorInfo?.message || '').toLowerCase().includes('merchant not found'))
    ) {
      clearSessionAndRedirect(loginRedirect);
      return new Promise(() => {});
    }
    
    // 403 Forbidden - User authenticated but doesn't have permission
    // DON'T redirect - just throw error with helpful message
    if (res.status === 403) {
      const error: FetchError = new Error(
        errorInfo?.message || 'You do not have permission to access this resource.'
      );
      error.info = errorInfo;
      error.status = res.status;
      error.isAuthError = false; // Not an auth error, just permission denied
      throw error;
    }
    
    // Other errors (400, 404, 500, etc.)
    const error: FetchError = new Error(
      errorInfo?.message || 'An error occurred while fetching the data.'
    );
    error.info = errorInfo;
    error.status = res.status;
    error.isAuthError = false;
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
  const { t } = useTranslation();
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

  // Create fetcher with login redirect path
  const fetcher = useCallback(
    (url: string) => createAuthFetcher(loginRedirect)(url),
    [loginRedirect]
  );

  // Use SWR with auth fetcher
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    actualKey,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      ...swrOptions,
    }
  );

  const localizedError = useMemo(() => {
    if (!error) return undefined;

    const errorInfo = (error as FetchError).info as ApiErrorResponse | undefined;
    if (!errorInfo?.i18nKey) return error;

    const fallbackMessage = errorInfo.message
      || error.message
      || 'An error occurred while fetching the data.';
    const localizedMessage = tOr(t, errorInfo.i18nKey, fallbackMessage);

    const nextError: FetchError = new Error(localizedMessage);
    Object.assign(nextError, error);
    nextError.message = localizedMessage;
    return nextError;
  }, [error, t]);

  // Refresh function
  const refresh = useCallback(async () => {
    return mutate();
  }, [mutate]);

  return {
    data,
    error: localizedError,
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
