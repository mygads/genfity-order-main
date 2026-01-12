import crypto from 'crypto';

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + '='.repeat(padLength);
  return Buffer.from(withPadding, 'base64');
}

function getTrackingSecret(): string {
  return process.env.ORDER_TRACKING_TOKEN_SECRET || 'dev-insecure-tracking-secret';
}

export function createOrderTrackingToken(params: {
  merchantCode: string;
  orderNumber: string;
}): string {
  const payload = `${params.merchantCode}:${params.orderNumber}`;
  const payloadB64 = base64UrlEncode(Buffer.from(payload, 'utf8'));
  const sig = crypto
    .createHmac('sha256', getTrackingSecret())
    .update(payloadB64)
    .digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyOrderTrackingToken(params: {
  token: string;
  merchantCode: string;
  orderNumber: string;
}): boolean {
  const raw = params.token || '';
  const [payloadB64, sigB64] = raw.split('.');
  if (!payloadB64 || !sigB64) return false;

  // Recompute signature
  const expectedSig = crypto
    .createHmac('sha256', getTrackingSecret())
    .update(payloadB64)
    .digest();
  let actualSig: Buffer;
  try {
    actualSig = base64UrlDecode(sigB64);
  } catch {
    return false;
  }

  if (actualSig.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(actualSig, expectedSig)) return false;

  // Ensure payload matches order
  let payloadText: string;
  try {
    payloadText = base64UrlDecode(payloadB64).toString('utf8');
  } catch {
    return false;
  }

  return payloadText === `${params.merchantCode}:${params.orderNumber}`;
}
