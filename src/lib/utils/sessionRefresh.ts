/**
 * Shared refresh helper for admin/driver sessions.
 */

import { canAttemptBackoff, scheduleBackoff, resetBackoff } from './backoff';

export type RefreshResponseData = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

const SESSION_REFRESH_BACKOFF = {
  key: 'genfity_backoff_session_refresh',
  persist: true,
  jitter: 0.3,
};

export async function requestSessionRefresh(refreshToken: string): Promise<RefreshResponseData | null> {
  if (!canAttemptBackoff(SESSION_REFRESH_BACKOFF)) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      scheduleBackoff(SESSION_REFRESH_BACKOFF);
      return null;
    }

    const result = await response.json();
    if (!result?.success || !result?.data?.accessToken) {
      scheduleBackoff(SESSION_REFRESH_BACKOFF);
      return null;
    }

    resetBackoff(SESSION_REFRESH_BACKOFF);

    return result.data as RefreshResponseData;
  } catch {
    scheduleBackoff(SESSION_REFRESH_BACKOFF);
    return null;
  }
}
