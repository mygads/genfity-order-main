'use client';

import { useEffect, useRef } from 'react';
import { getAdminAuth, getAdminToken } from '@/lib/utils/adminAuth';
import { fetchWithAuth } from '@/lib/utils/apiClient';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type LatestOrderNotification = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: unknown;
};

/**
 * AdminOrderAlertListener
 * - Plays sound for new orders while an admin tab is open (even if not on Orders pages)
 * - Ensures push subscription is synced when permission is already granted
 *
 * Notes:
 * - Browsers do not allow playing custom audio when the site is fully closed.
 *   When the tab/browser is closed, only Web Push notifications can alert the user.
 */
export default function AdminOrderAlertListener() {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();

  const lastSeenNotificationIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  // Bootstrap: if permission is already granted, ensure we have a subscription stored on server.
  useEffect(() => {
    const auth = getAdminAuth({ skipRedirect: true });
    const isMerchantUser = auth?.user.role === 'MERCHANT_OWNER' || auth?.user.role === 'MERCHANT_STAFF';
    if (!isMerchantUser) return;

    if (!isSupported) return;
    if (permission !== 'granted') return;

    // Avoid repeated subscribe attempts
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    // If the browser already has permission but isn't subscribed, try subscribing silently.
    // This should not show a permission prompt because permission is already granted.
    if (!isSubscribed) {
      subscribe().catch(() => {
        // Ignore; user can enable from settings
      });
    }
  }, [isSupported, permission, isSubscribed, subscribe]);

  // Poll latest ORDER notification and play sound when a new one arrives.
  useEffect(() => {
    const auth = getAdminAuth({ skipRedirect: true });
    const isMerchantUser = auth?.user.role === 'MERCHANT_OWNER' || auth?.user.role === 'MERCHANT_STAFF';
    if (!isMerchantUser) return;

    const token = getAdminToken();
    if (!token) return;

    let isCancelled = false;

    const fetchLatest = async (): Promise<LatestOrderNotification | null> => {
      const response = await fetchWithAuth('/api/notifications?category=ORDER&limit=1&page=1', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        skipRedirect: true,
      });

      if (!response.ok) return null;
      const json = (await response.json()) as {
        success: boolean;
        data?: { notifications?: LatestOrderNotification[] };
      };

      const latest = json?.data?.notifications?.[0];
      return latest ?? null;
    };

    const tick = async () => {
      try {
        const latest = await fetchLatest();
        if (isCancelled || !latest) return;

        // First fetch establishes baseline (no sound)
        if (lastSeenNotificationIdRef.current === null) {
          lastSeenNotificationIdRef.current = latest.id;
          return;
        }

        if (latest.id !== lastSeenNotificationIdRef.current) {
          lastSeenNotificationIdRef.current = latest.id;

          // Play new order sound (respects stored preferences)
          playNotificationSound('newOrder');
        }
      } catch {
        // Silent; avoid spamming console
      }
    };

    // Initial tick and polling
    tick();
    const intervalId = window.setInterval(tick, 8000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
