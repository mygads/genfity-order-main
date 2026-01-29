'use client';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getLastMerchantCodeClient(): string | null {
  if (typeof window === 'undefined') return null;

  const fromCookie = getCookieValue('last_merchant_code');
  if (fromCookie && fromCookie.trim()) return fromCookie.trim();

  const fromLocalStorage = localStorage.getItem('lastMerchantCode');
  if (fromLocalStorage && fromLocalStorage.trim()) return fromLocalStorage.trim();

  return null;
}

export function setLastMerchantCodeClient(merchantCode: string): void {
  if (typeof window === 'undefined') return;

  const normalized = merchantCode?.trim();
  if (!normalized) return;

  const upper = normalized.toUpperCase();

  try {
    localStorage.setItem('lastMerchantCode', upper);
  } catch {
    // Ignore write failures (privacy mode, quota, etc.)
  }

  document.cookie = `last_merchant_code=${encodeURIComponent(upper)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}
