export function getPublicAppOrigin(fallback = 'https://order.genfity.com'): string {
  const env = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  const envOrigin = env?.NEXT_PUBLIC_APP_URL;
  const nodeEnv = env?.NODE_ENV;

  const candidate =
    (typeof envOrigin === 'string' && envOrigin.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const normalized = (candidate || fallback).trim().replace(/\/+$/, '');

  // In production we must not generate localhost URLs in emails/PDFs.
  // If misconfigured (e.g. NEXT_PUBLIC_APP_URL=http://localhost:3000), fall back to a public domain.
  if (nodeEnv === 'production') {
    const lower = normalized.toLowerCase();
    if (
      lower.startsWith('http://localhost') ||
      lower.startsWith('https://localhost') ||
      lower.startsWith('http://127.') ||
      lower.startsWith('https://127.') ||
      lower.startsWith('http://0.0.0.0') ||
      lower.startsWith('https://0.0.0.0')
    ) {
      return fallback;
    }
  }

  return normalized || fallback;
}
