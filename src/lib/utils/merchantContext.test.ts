import { describe, expect, it, afterEach, vi } from 'vitest';

import { getLastMerchantCodeClient } from './merchantContext';

type LocalStorageLike = {
  getItem: (key: string) => string | null;
};

function setBrowserEnv(options: { cookie?: string; localStorageValue?: string | null } = {}) {
  const { cookie = '', localStorageValue = null } = options;

  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { cookie });

  const localStorage: LocalStorageLike = {
    getItem: (key: string) => {
      if (key !== 'lastMerchantCode') return null;
      return localStorageValue;
    },
  };

  vi.stubGlobal('localStorage', localStorage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLastMerchantCodeClient', () => {
  it('returns null on server (no window)', () => {
    expect(getLastMerchantCodeClient()).toBeNull();
  });

  it('reads last_merchant_code from cookie when present', () => {
    setBrowserEnv({ cookie: 'last_merchant_code=ABC' });
    expect(getLastMerchantCodeClient()).toBe('ABC');
  });

  it('handles multiple cookies and picks last_merchant_code', () => {
    setBrowserEnv({ cookie: 'foo=bar; last_merchant_code=KOPI001; baz=qux' });
    expect(getLastMerchantCodeClient()).toBe('KOPI001');
  });

  it('decodes URL-encoded cookie values', () => {
    setBrowserEnv({ cookie: 'last_merchant_code=A%2FB' });
    expect(getLastMerchantCodeClient()).toBe('A/B');
  });

  it('falls back to localStorage when cookie is missing', () => {
    setBrowserEnv({ cookie: 'foo=bar', localStorageValue: 'WELLARD' });
    expect(getLastMerchantCodeClient()).toBe('WELLARD');
  });

  it('falls back to localStorage when cookie is blank/whitespace', () => {
    setBrowserEnv({ cookie: 'last_merchant_code=%20%20%20', localStorageValue: 'BISTRO' });
    expect(getLastMerchantCodeClient()).toBe('BISTRO');
  });

  it('returns null for malformed cookie string and empty localStorage', () => {
    setBrowserEnv({ cookie: 'last_merchant_code', localStorageValue: '' });
    expect(getLastMerchantCodeClient()).toBeNull();
  });
});
