import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Next.js server helpers so route handlers can run in Vitest (node env)
vi.mock('next/server', () => {
  class NextRequest extends Request {}

  const NextResponse = {
    json: (body: unknown, init?: { status?: number }) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  };

  return { NextRequest, NextResponse };
});

const prismaMock = vi.hoisted(() => {
  return {
    merchantDeliveryZone: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
  };
});

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/middleware/auth', () => {
  return {
    withMerchantOwner: (handler: any) => {
      return (req: Request, routeContext?: any) => {
        return handler(req, {
          userId: BigInt(1),
          merchantId: BigInt(10),
          role: 'MERCHANT_OWNER',
        }, routeContext);
      };
    },
  };
});

import { GET, POST, DELETE } from '@/app/api/merchant/delivery/zones/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('API Route: /api/merchant/delivery/zones', () => {
  beforeEach(() => {
    // Clear call history + any queued mockResolvedValueOnce implementations
    prismaMock.merchantDeliveryZone.findMany.mockReset();
    prismaMock.merchantDeliveryZone.create.mockReset();
    prismaMock.merchantDeliveryZone.update.mockReset();
    prismaMock.merchantDeliveryZone.findUnique.mockReset();
    prismaMock.merchantDeliveryZone.delete.mockReset();
    prismaMock.merchant.findUnique.mockReset();
  });

  it('GET returns zones list (200)', async () => {
    prismaMock.merchantDeliveryZone.findMany.mockResolvedValueOnce([
      {
        id: BigInt(1),
        merchantId: BigInt(10),
        name: 'Zone A',
        type: 'POLYGON',
        radiusKm: null,
        polygon: [{ lat: -33.86, lng: 151.2 }],
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const req = new Request('http://localhost/api/merchant/delivery/zones', { method: 'GET' });
    const res = await GET(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe('1');
  });

  it('POST rejects missing name (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'POLYGON', polygon: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }] }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('POST rejects invalid type (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X', type: 'NOPE' }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/type/i);
  });

  it('POST rejects RADIUS without radiusKm (400)', async () => {
    prismaMock.merchant.findUnique.mockResolvedValueOnce({ latitude: -33.86, longitude: 151.2 });

    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Radius', type: 'RADIUS' }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/radiusKm is required/i);
  });

  it('POST rejects RADIUS when merchant has no coordinates (400)', async () => {
    prismaMock.merchant.findUnique.mockResolvedValueOnce({ latitude: null, longitude: null });

    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Radius', type: 'RADIUS', radiusKm: 3 }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/latitude\/longitude must be set/i);
  });

  it('POST rejects POLYGON with < 3 points (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Poly', type: 'POLYGON', polygon: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }] }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/at least 3 points/i);
  });

  it('POST saves POLYGON zone (200)', async () => {
    prismaMock.merchantDeliveryZone.create.mockResolvedValueOnce({
      id: BigInt(2),
      merchantId: BigInt(10),
      name: 'Poly',
      type: 'POLYGON',
      radiusKm: null,
      polygon: [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
      ],
      isActive: true,
    });

    const req = new Request('http://localhost/api/merchant/delivery/zones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Poly',
        type: 'POLYGON',
        polygon: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 },
          { lat: 1, lng: 1 },
        ],
        isActive: true,
      }),
    });

  const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('2');
    expect(prismaMock.merchantDeliveryZone.create).toHaveBeenCalledTimes(1);
  });

  it('DELETE rejects missing id (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones', { method: 'DELETE' });
    const res = await DELETE(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('DELETE returns 404 when zone not found (404)', async () => {
    prismaMock.merchantDeliveryZone.findUnique.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/merchant/delivery/zones?id=999', { method: 'DELETE' });
    const res = await DELETE(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(404);
    expect(json.error).toBe('NOT_FOUND');
  });

  it('DELETE deletes zone owned by merchant (200)', async () => {
    prismaMock.merchantDeliveryZone.findUnique.mockResolvedValueOnce({ id: BigInt(5), merchantId: BigInt(10) });
    prismaMock.merchantDeliveryZone.delete.mockResolvedValueOnce({ id: BigInt(5) });

    const req = new Request('http://localhost/api/merchant/delivery/zones?id=5', { method: 'DELETE' });
    const res = await DELETE(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(prismaMock.merchantDeliveryZone.delete).toHaveBeenCalledWith({ where: { id: BigInt(5) } });
  });
});
