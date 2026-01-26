export function getOrderApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ORDER_API_BASE_URL?.replace(/\/$/, '') || '';
}

export function getOrderWsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ORDER_WS_URL?.replace(/\/$/, '') || '';
}

export type OrderApiRouteScope = 'off' | 'public' | 'merchant' | 'all';

let hasWarnedInvalidOrderScope = false;

export function getOrderApiRouteScope(): OrderApiRouteScope {
  const raw = process.env.NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE?.trim().toLowerCase();
  if (raw === 'off' || raw === 'public' || raw === 'merchant' || raw === 'all') {
    return raw;
  }
  if (raw && !hasWarnedInvalidOrderScope) {
    console.warn(
      `[orderApiBase] Invalid NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE="${raw}". ` +
        'Expected one of: off, public, merchant, all. Falling back to "public".'
    );
    hasWarnedInvalidOrderScope = true;
  }
  return 'public';
}

export function buildOrderApiUrl(path: string): string {
  const base = getOrderApiBaseUrl();
  if (!base) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const scope = getOrderApiRouteScope();
  if (scope === 'off') return path;

  const isPublic = normalizedPath.startsWith('/api/public');
  const isMerchant = normalizedPath.startsWith('/api/merchant');

  if (scope === 'public' && !isPublic) return path;
  if (scope === 'merchant' && !isMerchant) return path;
  if (scope === 'all' && !isPublic && !isMerchant) return path;
  return `${base}${normalizedPath}`;
}
