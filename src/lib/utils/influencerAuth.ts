/**
 * Influencer authentication helpers (client-side)
 */

import { canAttemptBackoff, scheduleBackoff, resetBackoff } from './backoff';

const INFLUENCER_REFRESH_BACKOFF = {
  key: 'genfity_backoff_influencer_refresh',
  persist: true,
  jitter: 0.3,
};

export function clearInfluencerAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('influencerAccessToken');
  localStorage.removeItem('influencerRefreshToken');
  localStorage.removeItem('influencerData');
}

export async function refreshInfluencerSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!canAttemptBackoff(INFLUENCER_REFRESH_BACKOFF)) return null;

  const refreshToken = localStorage.getItem('influencerRefreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch('/api/influencer/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      scheduleBackoff(INFLUENCER_REFRESH_BACKOFF);
      return null;
    }

    const result = await response.json();
    if (!result?.success || !result?.data?.accessToken) {
      scheduleBackoff(INFLUENCER_REFRESH_BACKOFF);
      return null;
    }

    resetBackoff(INFLUENCER_REFRESH_BACKOFF);

    localStorage.setItem('influencerAccessToken', result.data.accessToken);
    if (result.data.refreshToken) {
      localStorage.setItem('influencerRefreshToken', result.data.refreshToken);
    }

    return result.data.accessToken as string;
  } catch {
    scheduleBackoff(INFLUENCER_REFRESH_BACKOFF);
    return null;
  }
}

export async function fetchWithInfluencerAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = typeof window !== 'undefined' ? localStorage.getItem('influencerAccessToken') : null;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !url.includes('/api/influencer/auth/refresh')) {
    const refreshedToken = await refreshInfluencerSession();
    if (refreshedToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

export async function fetchInfluencerJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ response: Response; data: T | null }> {
  const response = await fetchWithInfluencerAuth(url, options);
  const data = (await response.json().catch(() => null)) as T | null;

  if (response.status === 401) {
    clearInfluencerAuth();
  }

  return { response, data };
}
