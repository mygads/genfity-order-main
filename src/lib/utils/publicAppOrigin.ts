export function getPublicAppOrigin(fallback = 'https://order.genfity.com'): string {
  const envOrigin =
    (globalThis as any)?.process?.env?.NEXT_PUBLIC_APP_URL;

  const candidate =
    (typeof envOrigin === 'string' && envOrigin.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const normalized = (candidate || fallback).trim().replace(/\/+$/, '');
  return normalized || fallback;
}
