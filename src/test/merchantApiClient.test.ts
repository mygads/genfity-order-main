import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMerchantApiUrl,
  fetchMerchantApi,
  fetchMerchantApiJson,
  fetchPublicApi,
  fetchPublicApiJson,
} from '@/lib/utils/orderApiClient';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

vi.mock('@/lib/utils/orderApiBase', () => ({
  buildOrderApiUrl: vi.fn((path: string) => `https://proxy.example${path}`),
}));

describe('orderApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof fetch;
  });

  it('buildMerchantApiUrl delegates to buildOrderApiUrl', () => {
    const url = buildMerchantApiUrl('/api/merchant/orders');
    expect(buildOrderApiUrl).toHaveBeenCalledWith('/api/merchant/orders');
    expect(url).toBe('https://proxy.example/api/merchant/orders');
  });

  it('fetchMerchantApi wraps buildOrderApiUrl', async () => {
    await fetchMerchantApi('/api/merchant/orders', { withAuth: false });

    expect(buildOrderApiUrl).toHaveBeenCalledWith('/api/merchant/orders');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://proxy.example/api/merchant/orders',
      expect.objectContaining({
        headers: {},
      })
    );
  });

  it('fetchPublicApi returns raw response and wraps buildOrderApiUrl', async () => {
    const response = { ok: true } as Response;
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => response) as unknown as typeof fetch;

    const result = await fetchPublicApi('/api/public/orders');

    expect(buildOrderApiUrl).toHaveBeenCalledWith('/api/public/orders');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://proxy.example/api/public/orders',
      expect.objectContaining({
        headers: {},
      })
    );
    expect(result).toBe(response);
  });

  it('fetchMerchantApiJson throws enriched error when response is not ok', async () => {
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request', error: 'VALIDATION_ERROR' }),
    })) as unknown as typeof fetch;

    await expect(fetchMerchantApiJson('/api/merchant/orders', { withAuth: false })).rejects.toMatchObject({
      message: 'Bad request',
      status: 400,
      info: { message: 'Bad request', error: 'VALIDATION_ERROR' },
    });
  });

  it('fetchMerchantApiJson falls back to status message when payload is invalid', async () => {
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    })) as unknown as typeof fetch;

    await expect(fetchMerchantApiJson('/api/merchant/orders', { withAuth: false })).rejects.toMatchObject({
      message: 'Request failed with status 500',
      status: 500,
      info: null,
    });
  });

  it('fetchPublicApiJson throws enriched error when response is not ok', async () => {
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request', error: 'VALIDATION_ERROR' }),
    })) as unknown as typeof fetch;

    await expect(fetchPublicApiJson('/api/public/orders')).rejects.toMatchObject({
      message: 'Bad request',
      status: 400,
      info: { message: 'Bad request', error: 'VALIDATION_ERROR' },
    });
  });

  it('fetchPublicApiJson falls back to status message when payload is invalid', async () => {
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    })) as unknown as typeof fetch;

    await expect(fetchPublicApiJson('/api/public/orders')).rejects.toMatchObject({
      message: 'Request failed with status 500',
      status: 500,
      info: null,
    });
  });
});
