/**
 * useSessionSync Hook
 * Automatically sync session expiry with server on page load/refresh
 * 
 * Features:
 * - Fetches session info from server on mount
 * - Syncs expiresAt with localStorage
 * - Auto-redirects to login if session expired
 * - Works with SessionGuard for comprehensive protection
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminAuth, clearAdminAuth, refreshAdminSession } from '@/lib/utils/adminAuth';

interface SessionResponse {
  success: boolean;
  data: {
    userId: string;
    email: string;
    role: string;
    merchantId?: string;
    expiresAt: string;
    refreshExpiresAt?: string;
    isValid: boolean;
  };
}

export function useSessionSync() {
  const router = useRouter();
  const pathname = usePathname();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run on admin routes (excluding login page)
    if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
      return;
    }

    // Only check once per mount (page load/refresh)
    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    // Check session with server
    checkSessionWithServer();
  }, [pathname, router]);

  async function checkSessionWithServer() {
    try {
      // Get current auth from localStorage
      let auth = getAdminAuth({ skipRedirect: true, allowExpired: true });

      if (!auth) {
        const refreshed = await refreshAdminSession();
        if (!refreshed) {
          // No auth in localStorage, redirect to login
          clearAdminAuth();
          window.location.href = '/admin/login?error=expired';
          return;
        }

        auth = refreshed;
      }

      if (new Date(auth.expiresAt) < new Date()) {
        const refreshed = await refreshAdminSession();
        if (!refreshed) {
          clearAdminAuth();
          window.location.href = '/admin/login?error=expired';
          return;
        }
        auth = refreshed;
      }

      // Call server to verify session and get actual expiry
      const response = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      // If server error (500), don't logout - just skip sync
      if (response.status >= 500) {
        console.warn('[useSessionSync] Server error, skipping session sync');
        return; // Keep user logged in, will retry next time
      }

      // If 401 (unauthorized) or other client errors, check response
      if (!response.ok) {
        // Only logout on auth errors (401, 403)
        if (response.status === 401 || response.status === 403) {
          console.warn('[useSessionSync] Session expired or unauthorized');
          clearAdminAuth();
          window.location.href = '/admin/login?error=expired';
        }
        return;
      }

      const data: SessionResponse = await response.json();

      if (!data.success || !data.data.isValid) {
        // Session invalid or expired on server
        console.warn('[useSessionSync] Session expired or invalid on server');
        clearAdminAuth();
        window.location.href = '/admin/login?error=expired';
        return;
      }

      // Session valid - sync expiresAt with server value
      const serverExpiresAt = data.data.expiresAt;
      const localExpiresAt = auth.expiresAt;

      // Update localStorage if server expiry is different
      if (serverExpiresAt !== localExpiresAt) {
        console.log('[useSessionSync] Syncing expiresAt with server:', {
          local: localExpiresAt,
          server: serverExpiresAt,
        });

        // Update auth object with server expiry
        const updatedAuth = {
          ...auth,
          expiresAt: serverExpiresAt,
        };

        localStorage.setItem('genfity_admin_auth', JSON.stringify(updatedAuth));

        // Update cookie max-age to match server expiry
        const expiresIn = Math.floor(
          (new Date(serverExpiresAt).getTime() - Date.now()) / 1000
        );

        if (expiresIn > 0) {
          document.cookie = `auth_token=${auth.accessToken}; path=/; max-age=${expiresIn}; SameSite=Strict`;
        }
      }

      // Check if already expired
      const now = new Date();
      const expiryDate = new Date(serverExpiresAt);

      if (expiryDate <= now) {
        console.warn('[useSessionSync] Session already expired');
        clearAdminAuth();
        window.location.href = '/admin/login?error=expired';
      }
    } catch (error) {
      // Network error or JSON parse error - don't logout!
      console.error('[useSessionSync] Error checking session (network/server issue):', error);
      // Keep user logged in, SessionGuard will handle periodic checks
      // Don't redirect on network errors - user can still work offline with valid local token
    }
  }

  return null; // This hook doesn't render anything
}
