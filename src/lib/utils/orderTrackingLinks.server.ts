import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

export function buildOrderTrackingUrl(params: {
  merchantCode: string;
  orderNumber: string;
  baseUrlFallback?: string;
}): string {
  const baseUrl = getPublicAppOrigin(params.baseUrlFallback || 'https://order.genfity.com');
  const orderNumberEncoded = encodeURIComponent(params.orderNumber);
  const token = createOrderTrackingToken({
    merchantCode: params.merchantCode,
    orderNumber: params.orderNumber,
  });

  return `${baseUrl}/${params.merchantCode}/track/${orderNumberEncoded}?token=${encodeURIComponent(token)}`;
}

// Backwards-compatible export (old callers used this name)
export const buildSecureOrderTrackingUrl = buildOrderTrackingUrl;
