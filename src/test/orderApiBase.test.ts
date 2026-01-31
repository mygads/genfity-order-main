import { afterEach, describe, expect, it } from 'vitest';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

type EnvSnapshot = {
  NEXT_PUBLIC_ORDER_API_BASE_URL?: string;
  NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE?: string;
};

const ENV_KEYS: Array<keyof EnvSnapshot> = [
  'NEXT_PUBLIC_ORDER_API_BASE_URL',
  'NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE',
];

const originalEnv: EnvSnapshot = {
  NEXT_PUBLIC_ORDER_API_BASE_URL: process.env.NEXT_PUBLIC_ORDER_API_BASE_URL,
  NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE: process.env.NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE,
};

function setEnv(next: EnvSnapshot) {
  ENV_KEYS.forEach((key) => {
    if (key in next) {
      process.env[key] = next[key];
    } else {
      delete process.env[key];
    }
  });
}

afterEach(() => {
  setEnv(originalEnv);
});

describe('orderApiBase buildOrderApiUrl scope handling', () => {
  it('returns original path when scope is off', () => {
    setEnv({
      NEXT_PUBLIC_ORDER_API_BASE_URL: 'https://go.example',
      NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE: 'off',
    });

    expect(buildOrderApiUrl('/api/public/orders')).toBe('/api/public/orders');
    expect(buildOrderApiUrl('/api/merchant/orders')).toBe('/api/merchant/orders');
  });

  it('routes only /api/public when scope is public', () => {
    setEnv({
      NEXT_PUBLIC_ORDER_API_BASE_URL: 'https://go.example',
      NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE: 'public',
    });

    expect(buildOrderApiUrl('/api/public/orders')).toBe('https://go.example/api/public/orders');
    expect(buildOrderApiUrl('/api/merchant/orders')).toBe('/api/merchant/orders');
  });

  it('routes only /api/merchant when scope is merchant', () => {
    setEnv({
      NEXT_PUBLIC_ORDER_API_BASE_URL: 'https://go.example',
      NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE: 'merchant',
    });

    expect(buildOrderApiUrl('/api/merchant/orders')).toBe('https://go.example/api/merchant/orders');
    expect(buildOrderApiUrl('/api/public/orders')).toBe('/api/public/orders');
  });

  it('routes /api/public and /api/merchant when scope is all', () => {
    setEnv({
      NEXT_PUBLIC_ORDER_API_BASE_URL: 'https://go.example',
      NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE: 'all',
    });

    expect(buildOrderApiUrl('/api/public/orders')).toBe('https://go.example/api/public/orders');
    expect(buildOrderApiUrl('/api/merchant/orders')).toBe('https://go.example/api/merchant/orders');
    expect(buildOrderApiUrl('/api/other')).toBe('/api/other');
  });
});
