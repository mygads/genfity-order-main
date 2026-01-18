/**
 * API Fetch Utility with Auto Token Expiry Handling
 * 
 * Features:
 * - Automatically adds Authorization header with token
 * - Auto-redirects to login on 401 (Unauthorized) responses
 * - Clears localStorage on token expiry
 * - Returns typed responses
 * 
 * Usage:
 * ```tsx
 * // In a component
 * const data = await fetchWithAuth('/api/admin/merchants');
 * const result = await fetchWithAuth('/api/admin/orders', {
 *   method: 'POST',
 *   body: JSON.stringify({ ... })
 * });
 * ```
 */

import { getAdminToken, clearAdminAuth, refreshAdminSession } from './adminAuth';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean; // Skip adding Authorization header
  skipRedirect?: boolean; // Skip auto-redirect on 401
}

/**
 * Fetch with automatic token handling
 * Auto-adds Authorization header and handles 401 errors
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth, skipRedirect, headers, ...fetchOptions } = options;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge with provided headers
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        requestHeaders[key] = value;
      }
    });
  }

  // Add Authorization header unless skipped
  if (!skipAuth) {
    const token = getAdminToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Make request
  const response = await fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  // Handle 401 Unauthorized
  if (response.status === 401 && !skipRedirect) {
    const isRefreshRequest = url.includes('/api/auth/refresh');
    if (!isRefreshRequest) {
      const refreshed = await refreshAdminSession();
      if (refreshed?.accessToken) {
        const retryHeaders: Record<string, string> = { ...requestHeaders };
        retryHeaders['Authorization'] = `Bearer ${refreshed.accessToken}`;

        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers: retryHeaders,
        });

        if (retryResponse.status !== 401) {
          return retryResponse;
        }
      }
    }

    // Clear auth and redirect to login
    clearAdminAuth();

    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      window.location.href = '/admin/login?error=expired';
    }
  }

  return response;
}

/**
 * Fetch JSON with automatic token handling
 * Returns parsed JSON response
 */
export async function fetchJsonWithAuth<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}
