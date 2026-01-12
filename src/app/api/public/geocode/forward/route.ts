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

  if (parts.suburb) segments.push(parts.suburb);
  else if (parts.city) segments.push(parts.city);

  if (parts.state && parts.postcode) segments.push(`${parts.state} ${parts.postcode}`);
  else if (parts.state) segments.push(parts.state);
  else if (parts.postcode) segments.push(parts.postcode);

  if (parts.country) segments.push(parts.country);

  return segments.join(', ');
}

function normalizeQuery(value: string | null): string | null {
  if (!value) return null;
  const q = value.trim();
  if (!q) return null;
  return q;
}

function parseCoord(value: unknown): number | null {
  const num = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return null;
  return num;
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
    const q = normalizeQuery(url.searchParams.get('q'));

    if (!q) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'q is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const cacheKey = q.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now()) {
      return NextResponse.json({ success: true, data: cached.data, cached: true, statusCode: 200 }, { status: 200 });
    }

    const endpoint = new URL('https://nominatim.openstreetmap.org/search');
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('q', q);
    endpoint.searchParams.set('addressdetails', '1');
    endpoint.searchParams.set('limit', '5');

    const res = await fetch(endpoint.toString(), {
      headers: {
        'User-Agent': 'Genfity Online Ordering (https://order.genfity.com)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'UPSTREAM_ERROR',
          message: 'Failed to search address',
          statusCode: 502,
        },
        { status: 502 }
      );
    }

    const json = (await res.json()) as any;
    const rawResults = Array.isArray(json) ? json : [];

    const results = rawResults
      .map((r: any) => {
        const lat = parseCoord(r?.lat);
        const lng = parseCoord(r?.lon);
        if (lat === null || lng === null) return null;

        const rawAddress = r?.address || null;
        const parts = buildAddressParts(rawAddress);
        const formattedAddress = buildFormattedAddress(parts);
        const displayName = String(r?.display_name || '').trim();

        return {
          lat,
          lng,
          displayName,
          formattedAddress: formattedAddress || displayName,
          parts,
          raw: rawAddress,
        };
      })
      .filter(Boolean);

    const data = {
      query: q,
      results,
    };

    cache.set(cacheKey, { data, expiresAtMs: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ success: true, data, cached: false, statusCode: 200 }, { status: 200 });
  } catch (error) {
    console.error('Forward geocode error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to search address',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
