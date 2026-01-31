import { buildOrderApiUrl } from '@/lib/utils/orderApiClient';

export type JsonValue = Record<string, unknown> | null;

export const CONTRACT_NEXT_BASE = (process.env.CONTRACT_NEXT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const CONTRACT_GO_BASE = (process.env.CONTRACT_GO_BASE_URL || 'http://localhost:8086').replace(/\/$/, '');

export const CONTRACT_MERCHANT_CODE = process.env.CONTRACT_MERCHANT_CODE || 'WELLARD01';
export const CONTRACT_MENU_ID = process.env.CONTRACT_MENU_ID
  ? Number(process.env.CONTRACT_MENU_ID)
  : 279;
export const CONTRACT_MERCHANT_ACCESS_TOKEN = process.env.CONTRACT_MERCHANT_ACCESS_TOKEN;
export const CONTRACT_MERCHANT_EMAIL = process.env.CONTRACT_MERCHANT_EMAIL || 'wellardkebab@gmail.com';
export const CONTRACT_MERCHANT_PASSWORD = process.env.CONTRACT_MERCHANT_PASSWORD || '1234abcd';
export const CONTRACT_MERCHANT_ID = process.env.CONTRACT_MERCHANT_ID || '10';
export const CONTRACT_TURNSTILE_TOKEN = process.env.CONTRACT_TURNSTILE_TOKEN;
export const CONTRACT_ORDER_TYPE = process.env.CONTRACT_ORDER_TYPE || 'TAKEAWAY';
export const CONTRACT_CUSTOMER_NAME = process.env.CONTRACT_CUSTOMER_NAME || 'Contract Test';
export const CONTRACT_CUSTOMER_EMAIL = process.env.CONTRACT_CUSTOMER_EMAIL || 'contract-test@example.com';
export const CONTRACT_CUSTOMER_PHONE = process.env.CONTRACT_CUSTOMER_PHONE || undefined;
export const CONTRACT_PAYMENT_METHOD = process.env.CONTRACT_PAYMENT_METHOD || undefined;
export const CONTRACT_QUANTITY = Number(process.env.CONTRACT_QUANTITY || 1);

export const CONTRACT_DELIVERY_ADDRESS = process.env.CONTRACT_DELIVERY_ADDRESS || undefined;
export const CONTRACT_DELIVERY_LAT = process.env.CONTRACT_DELIVERY_LAT ? Number(process.env.CONTRACT_DELIVERY_LAT) : undefined;
export const CONTRACT_DELIVERY_LNG = process.env.CONTRACT_DELIVERY_LNG ? Number(process.env.CONTRACT_DELIVERY_LNG) : undefined;

export const CONTRACT_VOUCHER_CODE = process.env.CONTRACT_VOUCHER_CODE;
export const CONTRACT_VOUCHER_CODE_NEXT = process.env.CONTRACT_VOUCHER_CODE_NEXT;
export const CONTRACT_VOUCHER_CODE_GO = process.env.CONTRACT_VOUCHER_CODE_GO;
export const CONTRACT_VOUCHER_ITEM_SUBTOTAL = process.env.CONTRACT_VOUCHER_ITEM_SUBTOTAL
  ? Number(process.env.CONTRACT_VOUCHER_ITEM_SUBTOTAL)
  : undefined;

export const CONTRACT_GROUP_HOST_NAME = process.env.CONTRACT_GROUP_HOST_NAME || 'Group Host';
export const CONTRACT_GROUP_JOIN_NAME = process.env.CONTRACT_GROUP_JOIN_NAME || 'Group Member';
export const CONTRACT_GROUP_ORDER_TYPE = process.env.CONTRACT_GROUP_ORDER_TYPE || 'TAKEAWAY';

export const CONTRACT_RESERVATION_DATE = process.env.CONTRACT_RESERVATION_DATE;
export const CONTRACT_RESERVATION_TIME = process.env.CONTRACT_RESERVATION_TIME;
export const CONTRACT_PARTY_SIZE = Number(process.env.CONTRACT_PARTY_SIZE || 2);

export const CONTRACT_AVAILABLE_TIMES_MODE = process.env.CONTRACT_AVAILABLE_TIMES_MODE || 'TAKEAWAY';

export const CONTRACT_QUOTE_LAT = process.env.CONTRACT_QUOTE_LAT
  ? Number(process.env.CONTRACT_QUOTE_LAT)
  : undefined;
export const CONTRACT_QUOTE_LNG = process.env.CONTRACT_QUOTE_LNG
  ? Number(process.env.CONTRACT_QUOTE_LNG)
  : undefined;

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function hasRequired(...values: Array<unknown>): boolean {
  return values.every((value) => Boolean(value));
}

export async function postJson(url: string, body: unknown): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function getJson(url: string): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function getMerchantAccessToken(baseUrl: string): Promise<string | null> {
  if (CONTRACT_MERCHANT_ACCESS_TOKEN) {
    return CONTRACT_MERCHANT_ACCESS_TOKEN;
  }

  if (!CONTRACT_MERCHANT_EMAIL || !CONTRACT_MERCHANT_PASSWORD) {
    return null;
  }

  const payload: Record<string, unknown> = {
    email: CONTRACT_MERCHANT_EMAIL,
    password: CONTRACT_MERCHANT_PASSWORD,
    rememberMe: false,
  };

  if (CONTRACT_MERCHANT_ID) {
    payload.merchantId = CONTRACT_MERCHANT_ID;
  }

  if (CONTRACT_TURNSTILE_TOKEN) {
    payload.turnstileToken = CONTRACT_TURNSTILE_TOKEN;
  }

  const res = await postJson(`${baseUrl}/api/auth/login`, payload);
  if (!res.json?.success) return null;

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  const accessToken = typeof data.accessToken === 'string' ? data.accessToken : null;
  if (!accessToken) return null;

  if (CONTRACT_MERCHANT_ID) {
    const switchRes = await fetch(`${baseUrl}/api/auth/switch-merchant`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ merchantId: CONTRACT_MERCHANT_ID }),
    });

    const switchText = await switchRes.text();
    const switchJson = switchText ? (JSON.parse(switchText) as JsonValue) : null;
    const switchData = (switchJson?.data ?? {}) as Record<string, unknown>;
    const switchedToken = typeof switchData.accessToken === 'string' ? switchData.accessToken : null;

    if (switchJson?.success && switchedToken) {
      await ensureMerchantOpen(baseUrl, switchedToken);
      return switchedToken;
    }
  }

  await ensureMerchantOpen(baseUrl, accessToken);
  return accessToken;
}

async function ensureMerchantOpen(baseUrl: string, token: string) {
  try {
    await fetch(buildOrderApiUrl(`${baseUrl}/api/merchant/toggle-open`), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isManualOverride: true, isOpen: true }),
    });
  } catch {
    // Ignore toggle-open failures in contract setup
  }
}

export async function getJsonWithAuth(
  url: string,
  token: string,
): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function postJsonWithAuth(
  url: string,
  body: unknown,
  token: string,
): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function putJsonWithAuth(
  url: string,
  body: unknown,
  token: string,
): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function patchJsonWithAuth(
  url: string,
  body: unknown,
  token: string,
): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function deleteJsonWithAuth(
  url: string,
  body: unknown,
  token: string,
): Promise<{ status: number; json: JsonValue }> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as JsonValue) : null;
  return { status: res.status, json };
}

export async function getTextWithAuth(
  url: string,
  token: string,
): Promise<{ status: number; text: string; contentType: string | null }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  return { status: res.status, text, contentType: res.headers.get('content-type') };
}

export async function postTextWithAuth(
  url: string,
  body: unknown,
  token: string,
): Promise<{ status: number; text: string; contentType: string | null }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return { status: res.status, text, contentType: res.headers.get('content-type') };
}
