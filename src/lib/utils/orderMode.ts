import type { OrderMode } from '@/lib/types/customer';

export type NormalizeOrderModeResult = {
  mode: OrderMode;
  didFallback: boolean;
  raw: string;
  token: string;
};

function toToken(input: unknown): { raw: string; token: string } {
  const raw = typeof input === 'string' ? input : input == null ? '' : String(input);
  const token = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  return { raw, token };
}

export function normalizeOrderMode(input: unknown): NormalizeOrderModeResult {
  const { raw, token } = toToken(input);

  // If not provided at all, default quietly.
  if (!token) {
    return { mode: 'takeaway', didFallback: false, raw, token };
  }

  if (token === 'dinein' || token === 'dine') {
    return { mode: 'dinein', didFallback: false, raw, token };
  }

  if (token === 'delivery') {
    return { mode: 'delivery', didFallback: false, raw, token };
  }

  if (token === 'takeaway' || token === 'pickup' || token === 'takeout') {
    return { mode: 'takeaway', didFallback: false, raw, token };
  }

  return { mode: 'takeaway', didFallback: true, raw, token };
}
