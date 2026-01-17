import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';

export function resolveAssetUrl(
  rawUrl: string | null | undefined,
  opts?: {
    requestOrigin?: string | null;
    fallbackOrigin?: string;
  }
): string | null {
  const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!value) return null;

  // Absolute
  if (/^https?:\/\//i.test(value)) return value;

  // Protocol-relative
  if (value.startsWith('//')) return `https:${value}`;

  const origin = (opts?.requestOrigin || '').trim().replace(/\/+$/, '') || (opts?.fallbackOrigin || getPublicAppOrigin());
  const normalizedOrigin = origin.trim().replace(/\/+$/, '');

  if (!normalizedOrigin) return value;

  // Root-relative
  if (value.startsWith('/')) return `${normalizedOrigin}${value}`;

  // Path-relative
  return `${normalizedOrigin}/${value}`;
}
