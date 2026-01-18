"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAdminAuth, clearAdminAuth, refreshAdminSession } from '@/lib/utils/adminAuth';

/**
 * Session Guard Component
 * Periodically checks token expiry and auto-redirects to login when expired
 * 
 * Features:
 * - Checks token every 10 seconds (reduced from 60s for faster detection)
 * - Auto-clears localStorage on expiry
 * - Redirects to /admin/login with error message
 * - Only active on admin routes
 * 
 * Usage:
 * Add to admin layout:
 * ```tsx
 * <SessionGuard />
 * ```
 */
export default function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only run on admin routes (excluding login page)
    if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
      return;
    }

    // Check immediately on mount
    void checkSession();

    // Then check every 10 seconds (reduced from 60s for faster expiry detection)
    const interval = setInterval(() => {
      void checkSession();
    }, 10000);

    return () => clearInterval(interval);
  }, [pathname, router]);

  async function checkSession() {
    // Check if token exists and is valid
    const auth = getAdminAuth({ skipRedirect: true, allowExpired: true });

    if (!auth) {
      const refreshed = await refreshAdminSession();
      if (!refreshed) {
        clearAdminAuth();

        // Redirect to login with expired error
        if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login?error=expired';
        }
      }
      return;
    }

    if (new Date(auth.expiresAt) < new Date()) {
      const refreshed = await refreshAdminSession();
      if (!refreshed) {
        clearAdminAuth();

        // Redirect to login with expired error
        if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login?error=expired';
        }
      }
    }
  }

  // This component doesn't render anything
  return null;
}
