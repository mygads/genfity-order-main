export function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function isSafeInternalPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\0');
}

/**
 * Get the current internal URL (pathname + search) from the browser.
 * Returns null on the server or if the value is not a safe internal path.
 */
export function getCurrentInternalPathWithQuery(): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location?.pathname ?? '';
  const search = window.location?.search ?? '';
  const candidate = `${pathname}${search}`;
  return isSafeInternalPath(candidate) ? candidate : null;
}

/**
 * Safely decode and validate a `ref` query param to prevent crashes and external redirects.
 */
export function getSafeInternalRef(rawRef: string | null): string | null {
  if (!rawRef) return null;
  const decoded = safeDecodeURIComponent(rawRef);
  if (!decoded) return null;
  if (!isSafeInternalPath(decoded)) return null;
  return decoded;
}
