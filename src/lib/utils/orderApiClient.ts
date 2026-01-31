import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

export { buildOrderApiUrl };

type MerchantFetchOptions = RequestInit & {
  token?: string | null;
  withAuth?: boolean;
};

type PublicFetchOptions = RequestInit;

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const next: Record<string, string> = {};
    headers.forEach((value, key) => {
      next[key] = value;
    });
    return next;
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return { ...(headers as Record<string, string>) };
}

export function buildMerchantApiUrl(path: string): string {
  return buildOrderApiUrl(path);
}

export function buildPublicApiUrl(path: string): string {
  return buildOrderApiUrl(path);
}

export async function fetchMerchantApi(
  path: string,
  options: MerchantFetchOptions = {},
): Promise<Response> {
  const { token, withAuth = true, headers, ...init } = options;
  const mergedHeaders = normalizeHeaders(headers);

  if (withAuth) {
    const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    if (authToken) {
      mergedHeaders.Authorization = `Bearer ${authToken}`;
    }
  }

  return fetch(buildOrderApiUrl(path), {
    ...init,
    headers: mergedHeaders,
  });
}

export async function fetchPublicApi(
  path: string,
  options: PublicFetchOptions = {},
): Promise<Response> {
  const { headers, ...init } = options;
  const mergedHeaders = normalizeHeaders(headers);

  return fetch(buildOrderApiUrl(path), {
    ...init,
    headers: mergedHeaders,
  });
}

export async function fetchMerchantApiJson<T = unknown>(
  path: string,
  options: MerchantFetchOptions = {},
): Promise<T> {
  const res = await fetchMerchantApi(path, options);
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = new Error(payload?.message || `Request failed with status ${res.status}`) as Error & {
      status?: number;
      info?: unknown;
    };
    error.status = res.status;
    error.info = payload;
    throw error;
  }
  return res.json() as Promise<T>;
}

export async function fetchPublicApiJson<T = unknown>(
  path: string,
  options: PublicFetchOptions = {},
): Promise<T> {
  const res = await fetchPublicApi(path, options);
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = new Error(payload?.message || `Request failed with status ${res.status}`) as Error & {
      status?: number;
      info?: unknown;
    };
    error.status = res.status;
    error.info = payload;
    throw error;
  }
  return res.json() as Promise<T>;
}
