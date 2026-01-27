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

  const isGoPublicEndpoint = (p: string): boolean => {
    // Keep the list tight: route to Go only when the Go service actually has the handler.
    // Everything else stays on Next.js to avoid partial-migration breakage.
    const isOrderBase = /^\/api\/public\/orders(\b|\?|#)/.test(p);
    const isOrderDetail = /^\/api\/public\/orders\/[^/?#]+(\b|\?|#)/.test(p);
    const isOrderAction =
      /^\/api\/public\/orders\/[^/?#]+\/(upload-proof|confirm-payment|wait-time|group-details|feedback)(\b|\/|\?|#)/.test(p);
    if (isOrderBase || isOrderDetail || isOrderAction) return true;

    if (/^\/api\/public\/geocode\/(forward|reverse)(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/public\/vouchers\/validate(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/public\/reservations(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/public\/group-order(\b|\/|\?|#)/.test(p)) return true;

    // Go supports: GET /api/public/menu/{merchantCode}
    if (p.startsWith('/api/public/menu/')) {
      if (p.includes('/search')) return false;
      return /^\/api\/public\/menu\/[^/?#]+(\b|\?|#)/.test(p);
    }

    // Go supports the merchant public endpoints under /api/public/merchants/{code}/...
    const isMerchantBase = /^\/api\/public\/merchants\/[^/?#]+(\b|\?|#)/.test(p);
    const isMerchantCategories = /^\/api\/public\/merchants\/[^/?#]+\/categories(\b|\/|\?|#)/.test(p);
    const isMerchantStatus = /^\/api\/public\/merchants\/[^/?#]+\/status(\b|\/|\?|#)/.test(p);
    const isMerchantStockStream = /^\/api\/public\/merchants\/[^/?#]+\/stock-stream(\b|\/|\?|#)/.test(p);
    const isMerchantAvailableTimes = /^\/api\/public\/merchants\/[^/?#]+\/available-times(\b|\/|\?|#)/.test(p);
    const isMerchantDeliveryQuote = /^\/api\/public\/merchants\/[^/?#]+\/delivery\/quote(\b|\/|\?|#)/.test(p);
    const isMerchantMenus = /^\/api\/public\/merchants\/[^/?#]+\/menus(\b|\?|#)/.test(p);
    const isMerchantMenuSearch = /^\/api\/public\/merchants\/[^/?#]+\/menus\/search(\b|\/|\?|#)/.test(p);
    const isMerchantMenuDetail = /^\/api\/public\/merchants\/[^/?#]+\/menus\/[^/?#]+(\b|\?|#)/.test(p);
    const isMerchantMenuAddons = /^\/api\/public\/merchants\/[^/?#]+\/menus\/[^/?#]+\/addons(\b|\/|\?|#)/.test(p);
    const isMerchantRecommendations = /^\/api\/public\/merchants\/[^/?#]+\/recommendations(\b|\/|\?|#)/.test(p);

    if (
      isMerchantBase ||
      isMerchantCategories ||
      isMerchantStatus ||
      isMerchantStockStream ||
      isMerchantAvailableTimes ||
      isMerchantDeliveryQuote ||
      isMerchantMenus ||
      isMerchantMenuSearch ||
      isMerchantMenuDetail ||
      isMerchantMenuAddons ||
      isMerchantRecommendations
    ) {
      return true;
    }

    return false;
  };

  const isGoMerchantEndpoint = (p: string): boolean => {
    if (/^\/api\/merchant\/orders(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/merchant\/reservations(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/merchant\/customers\/search(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/merchant\/customer-display\/(state|sessions)(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/merchant\/upload\/qris(\b|\/|\?|#)/.test(p)) return true;
    if (/^\/api\/merchant\/upload\/(merchant-image|promo-banner|menu-image|delete-image|presign|confirm)(\b|\/|\?|#)/.test(p)) {
      return true;
    }
    if (/^\/api\/merchant\/upload-logo(\b|\/|\?|#)/.test(p)) return true;
    return false;
  };

  const scope = getOrderApiRouteScope();
  if (scope === 'off') return path;

  const isPublic = normalizedPath.startsWith('/api/public');
  const isMerchant = normalizedPath.startsWith('/api/merchant');

  if (scope === 'public') {
    if (!isPublic) return path;
    if (!isGoPublicEndpoint(normalizedPath)) return path;
    return `${base}${normalizedPath}`;
  }

  if (scope === 'merchant') {
    if (!isMerchant) return path;
    if (!isGoMerchantEndpoint(normalizedPath)) return path;
    return `${base}${normalizedPath}`;
  }

  // scope === 'all'
  if (!isPublic && !isMerchant) return path;
  if (isPublic && isGoPublicEndpoint(normalizedPath)) return `${base}${normalizedPath}`;
  if (isMerchant && isGoMerchantEndpoint(normalizedPath)) return `${base}${normalizedPath}`;
  return path;
}
