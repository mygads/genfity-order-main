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
  return `/merchant/${normalized}`;
}

export function customerLoginUrl(
  options: { merchant?: string; mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  const { merchant, mode, ref, ...rest } = options;
  const searchParams = new URLSearchParams();

  if (merchant) searchParams.set('merchant', merchant);
  if (mode) searchParams.set('mode', mode);
  if (ref) searchParams.set('ref', ref);

  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    const stringValue = typeof value === 'boolean' ? String(value) : String(value);
    if (stringValue.length === 0) continue;
    searchParams.set(key, stringValue);
  }

  const query = searchParams.toString();
  return `/customer/login${query ? `?${query}` : ''}`;
}

export function customerForgotPasswordUrl(options: { ref?: string } & QueryParams = {}): string {
  const { ref, ...rest } = options;
  return `/customer/forgot-password${buildQuery({ ref, ...rest })}`;
}

export function customerVerifyCodeUrl(options: { email?: string; ref?: string } & QueryParams = {}): string {
  const { email, ref, ...rest } = options;
  return `/customer/verify-code${buildQuery({ email, ref, ...rest })}`;
}

export function customerResetPasswordUrl(
  options: { email?: string; token?: string; ref?: string } & QueryParams = {}
): string {
  const { email, token, ref, ...rest } = options;
  return `/customer/reset-password${buildQuery({ email, token, ref, ...rest })}`;
}

export function customerOrderUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ...rest } = options;
  return `/merchant/${normalized}/order${buildQuery({ mode, ...rest })}`;
}

export function customerHistoryUrl(
  merchantCode?: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  if (merchantCode) {
    const normalized = normalizeMerchantCode(merchantCode);
    const { mode, ref, ...rest } = options;
    return `/merchant/${normalized}/history${buildQuery({ mode, ref, ...rest })}`;
  }
  const { mode, ref, ...rest } = options;
  return `/customer/history${buildQuery({ mode, ref, ...rest })}`;
}

export function customerTrackUrl(
  merchantCode: string,
  orderNumber: string,
  options: { mode?: CustomerOrderMode; ref?: string; back?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const encodedOrderNumber = encodeURIComponent(orderNumber);
  const { mode, ref, back, ...rest } = options;
  return `/merchant/${normalized}/track/${encodedOrderNumber}${buildQuery({ mode, ref, back, ...rest })}`;
}

export function customerReservationTrackUrl(
  merchantCode: string,
  reservationId: string,
  options: { ref?: string; back?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const encodedReservationId = encodeURIComponent(reservationId);
  const { ref, back, ...rest } = options;
  return `/merchant/${normalized}/track/reservation/${encodedReservationId}${buildQuery({ ref, back, ...rest })}`;
}

export function customerProfileUrl(
  merchantCode?: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  if (merchantCode) {
    const normalized = normalizeMerchantCode(merchantCode);
    const { mode, ref, ...rest } = options;
    return `/merchant/${normalized}/profile${buildQuery({ mode, ref, ...rest })}`;
  }
  const { mode, ref, ...rest } = options;
  return `/customer/profile${buildQuery({ mode, ref, ...rest })}`;
}

export function customerHelpCenterUrl(
  merchantCode?: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  if (merchantCode) {
    const normalized = normalizeMerchantCode(merchantCode);
    const { mode, ref, ...rest } = options;
    return `/merchant/${normalized}/help-center${buildQuery({ mode, ref, ...rest })}`;
  }
  const { mode, ref, ...rest } = options;
  return `/customer/help-center${buildQuery({ mode, ref, ...rest })}`;
}

export function customerProfileEditUrl(
  merchantCode?: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  if (merchantCode) {
    const normalized = normalizeMerchantCode(merchantCode);
    const { mode, ref, ...rest } = options;
    return `/merchant/${normalized}/edit-profile${buildQuery({ mode, ref, ...rest })}`;
  }
  const { mode, ref, ...rest } = options;
  return `/customer/edit-profile${buildQuery({ mode, ref, ...rest })}`;
}

export function customerSearchUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ref, ...rest } = options;
  return `/merchant/${normalized}/search${buildQuery({ mode, ref, ...rest })}`;
}

export function customerViewOrderUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; flow?: string; scheduled?: string | number | boolean; groupOrder?: boolean } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, flow, scheduled, groupOrder, ...rest } = options;
  return `/merchant/${normalized}/view-order${buildQuery({ mode, flow, scheduled, groupOrder, ...rest })}`;
}

export function customerPaymentUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; flow?: string; scheduled?: string | number | boolean; groupOrder?: boolean } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, flow, scheduled, groupOrder, ...rest } = options;
  return `/merchant/${normalized}/payment${buildQuery({ mode, flow, scheduled, groupOrder, ...rest })}`;
}

export function customerGroupOrderSummaryUrl(
  merchantCode: string,
  options: { orderNumber?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { orderNumber, ...rest } = options;
  return `/merchant/${normalized}/group-order-summary${buildQuery({ orderNumber, ...rest })}`;
}

export function customerOrderDetailUrl(
  merchantCode: string,
  orderNumber: string,
  options: { mode?: CustomerOrderMode; token?: string; ref?: string; back?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const encodedOrderNumber = encodeURIComponent(orderNumber);
  const { mode, token, ref, back, ...rest } = options;
  return `/merchant/${normalized}/order-detail/${encodedOrderNumber}${buildQuery({ mode, token, ref, back, ...rest })}`;
}

export function customerReservationDetailUrl(
  merchantCode: string,
  reservationId: string,
  options: { mode?: CustomerOrderMode; token?: string; ref?: string; back?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const encodedReservationId = encodeURIComponent(reservationId);
  const { mode, token, ref, back, ...rest } = options;
  return `/merchant/${normalized}/reservation-detail/${encodedReservationId}${buildQuery({ mode, token, ref, back, ...rest })}`;
}

export function customerPrivacyPolicyUrl(
  merchantCode: string,
  options: { mode?: CustomerOrderMode; ref?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { mode, ref, ...rest } = options;
  return `/merchant/${normalized}/privacy-policy${buildQuery({ mode, ref, ...rest })}`;
}

export function customerOrderSummaryCashUrl(
  merchantCode: string,
  options: { orderNumber?: string; mode?: CustomerOrderMode; token?: string; ref?: string; back?: string; from?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { orderNumber, mode, token, ref, back, from, ...rest } = options;
  return `/merchant/${normalized}/order-summary-cash${buildQuery({ orderNumber, mode, token, ref, back, from, ...rest })}`;
}

export function customerOrderSummaryOnlineUrl(
  merchantCode: string,
  options: { orderNumber?: string; mode?: CustomerOrderMode; token?: string; ref?: string; back?: string; from?: string } & QueryParams = {}
): string {
  const normalized = normalizeMerchantCode(merchantCode);
  const { orderNumber, mode, token, ref, back, from, ...rest } = options;
  return `/merchant/${normalized}/order-summary-online${buildQuery({ orderNumber, mode, token, ref, back, from, ...rest })}`;
}
