export type CustomerOrderMode = 'dinein' | 'takeaway' | string;

type QueryValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryValue>;

function normalizeMerchantCode(merchantCode: string): string {
  return merchantCode.replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildQuery(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const stringValue = typeof value === 'boolean' ? String(value) : String(value);
    if (stringValue.length === 0) continue;
    searchParams.set(key, stringValue);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function customerMerchantHomeUrl(merchantCode: string): string {
  const normalized = normalizeMerchantCode(merchantCode);
  return `/${normalized}`;
}

export function customerOrderUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ...rest } = options;
  return `/${normalized}/order${buildQuery({ mode, ...rest })}`;
}

export function customerHistoryUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ref, ...rest } = options;
  return `/${normalized}/history${buildQuery({ mode, ref, ...rest })}`;
}

export function customerTrackUrl(
  merchantCode: string,
  orderNumber: string,
  options: { mode?: CustomerOrderMode; ref?: string; back?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const encodedOrderNumber = encodeURIComponent(orderNumber);
  const { mode, ref, back, ...rest } = options;
  return `/${normalized}/track/${encodedOrderNumber}${buildQuery({ mode, ref, back, ...rest })}`;
}

export function customerProfileUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ref, ...rest } = options;
  return `/${normalized}/profile${buildQuery({ mode, ref, ...rest })}`;
}
