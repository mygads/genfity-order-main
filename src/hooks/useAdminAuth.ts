"use client";

import { useEffect, useState } from 'react';
import { getAdminAuth, clearAdminAuth } from '@/lib/utils/adminAuth';
import type { AdminAuth } from '@/lib/utils/adminAuth';

/**
 * Hook to get admin auth and auto-check expiry
 * 
 * Features:
 * - Returns current admin auth state
 * - Auto-checks expiry on mount and periodically
 * - Auto-redirects to login when expired
 * - Returns loading state
 * 
 * Usage:
 * ```tsx
 * const { auth, isLoading, isAuthenticated } = useAdminAuth();
 * ```
 */
export function useAdminAuth() {
  const [auth, setAuth] = useState<AdminAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth on mount
    checkAuth();

    // Check every 60 seconds
    const interval = setInterval(checkAuth, 60000);

    return () => clearInterval(interval);
  }, []);

  function checkAuth() {
    const currentAuth = getAdminAuth({ skipRedirect: true });
    
    if (!currentAuth) {
      setAuth(null);
      setIsLoading(false);
      return;
    }

    // Check if expired
    if (new Date(currentAuth.expiresAt) < new Date()) {
      clearAdminAuth();
      setAuth(null);
      
      // Redirect to login on admin routes
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login?error=expired';
      }
    } else {
      setAuth(currentAuth);
    }

    setIsLoading(false);
  }

  return {
    auth,
    isLoading,
    isAuthenticated: !!auth,
    user: auth?.user || null,
    accessToken: auth?.accessToken || null,
  };
}

/**
 * Hook to check if token is about to expire (within 5 minutes)
 * Returns true if token expires in less than 5 minutes
 * 
 * Usage:
 * ```tsx
 * const isExpiringSoon = useTokenExpiryWarning();
 * if (isExpiringSoon) {
 *   // Show warning banner
 * }
 * ```
 */
export function useTokenExpiryWarning(warningMinutes: number = 5): boolean {
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    function checkExpiry() {
      const auth = getAdminAuth({ skipRedirect: true });
      
      if (!auth) {
        setIsExpiringSoon(false);
        return;
      }

      const expiresAt = new Date(auth.expiresAt);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      setIsExpiringSoon(minutesUntilExpiry > 0 && minutesUntilExpiry <= warningMinutes);
    }

    // Check immediately
    checkExpiry();

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [warningMinutes]);

  return isExpiringSoon;
}
