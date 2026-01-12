import { NextRequest, NextResponse } from 'next/server';

type CachedValue = {
  data: unknown;
  expiresAtMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const cache = new Map<string, CachedValue>();
const rateLimits = new Map<string, RateLimitBucket>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

type AddressParts = {
  streetLine?: string | null;
  neighbourhood?: string | null;
  suburb?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
};

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function normalizeCoord(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function roundCoord(num: number): string {
  return num.toFixed(5);
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = rateLimits.get(ip);

  if (!bucket || now >= bucket.resetAtMs) {
    rateLimits.set(ip, { count: 1, resetAtMs: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000)) };
  }

  bucket.count += 1;
  rateLimits.set(ip, bucket);
  return { limited: false };
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function buildStreetLine(address: any): string | null {
  const houseNumber = pickFirstString(address?.house_number);
  const road = pickFirstString(address?.road, address?.pedestrian, address?.footway, address?.path, address?.cycleway);

  if (houseNumber && road) return `${houseNumber} ${road}`;
  return road;
}

function buildAddressParts(address: any): AddressParts {
  const city = pickFirstString(address?.city, address?.town, address?.village, address?.municipality, address?.county);
  const suburb = pickFirstString(address?.suburb, address?.city_district, address?.district);
  const neighbourhood = pickFirstString(address?.neighbourhood);

  return {
    streetLine: buildStreetLine(address),
    neighbourhood,
    suburb,
    city,
    state: pickFirstString(address?.state, address?.region),
    postcode: pickFirstString(address?.postcode),
    country: pickFirstString(address?.country),
  };
}

function buildFormattedAddress(parts: AddressParts): string {
  const segments: string[] = [];

  if (parts.streetLine) segments.push(parts.streetLine);

  // Prefer suburb, then city
  if (parts.suburb) segments.push(parts.suburb);
  else if (parts.city) segments.push(parts.city);

  // State + postcode can be combined if both exist
  if (parts.state && parts.postcode) segments.push(`${parts.state} ${parts.postcode}`);
  else if (parts.state) segments.push(parts.state);
  else if (parts.postcode) segments.push(parts.postcode);

  if (parts.country) segments.push(parts.country);

  return segments.join(', ');
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(ip);
    if (rl.limited) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again shortly.',
          statusCode: 429,
        },
        {
          status: 429,
          headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : undefined,
        }
      );
    }

    const url = new URL(req.url);
    const lat = normalizeCoord(url.searchParams.get('lat'));
    const lng = normalizeCoord(url.searchParams.get('lng'));

    if (lat === null || lng === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'lat and lng are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const cacheKey = `${roundCoord(lat)},${roundCoord(lng)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now()) {
      return NextResponse.json({ success: true, data: cached.data, cached: true, statusCode: 200 }, { status: 200 });
    }

    const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('lat', String(lat));
    endpoint.searchParams.set('lon', String(lng));
    endpoint.searchParams.set('zoom', '18');
    endpoint.searchParams.set('addressdetails', '1');

    const res = await fetch(endpoint.toString(), {
      headers: {
        // Nominatim usage policy requires an identifying User-Agent.
        'User-Agent': 'Genfity Online Ordering (https://genfity.com)',
        'Accept': 'application/json',
      },
      // Avoid caching by intermediaries; we do our own caching above.
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'UPSTREAM_ERROR',
          message: 'Failed to resolve address',
          statusCode: 502,
        },
        { status: 502 }
      );
    }

    const json = (await res.json()) as any;

    const rawAddress = json?.address || null;
    const parts = buildAddressParts(rawAddress);
    const formattedAddress = buildFormattedAddress(parts);
    const displayName = String(json?.display_name || '').trim();

    const data = {
      // Backwards-compatible fields
      displayName,
      address: rawAddress,

      // New structured fields
      formattedAddress: formattedAddress || displayName,
      parts,
    };

    cache.set(cacheKey, { data, expiresAtMs: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ success: true, data, cached: false, statusCode: 200 }, { status: 200 });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to resolve address',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
