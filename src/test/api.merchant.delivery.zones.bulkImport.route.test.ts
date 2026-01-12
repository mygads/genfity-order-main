import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const txMock = vi.hoisted(() => {
  return {
    merchantDeliveryZone: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };
});

const prismaMock = vi.hoisted(() => {
  return {
    merchantDeliveryZone: {
      findMany: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn(txMock)),
  };
});

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/middleware/auth', () => {
  return {
    withMerchantOwner: (handler: any) => {
      return (req: Request, routeContext?: any) => {
        return handler(
          req,
          {
            userId: BigInt(1),
            merchantId: BigInt(10),
            role: 'MERCHANT_OWNER',
          },
          routeContext
        );
      };
    },
  };
});

import { POST } from '@/app/api/merchant/delivery/zones/bulk-import/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('API Route: /api/merchant/delivery/zones/bulk-import', () => {
  beforeEach(() => {
    prismaMock.merchantDeliveryZone.findMany.mockReset();
    prismaMock.merchant.findUnique.mockReset();
    prismaMock.$transaction.mockReset();

    txMock.merchantDeliveryZone.deleteMany.mockReset();
    txMock.merchantDeliveryZone.createMany.mockReset();

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(txMock));
  });

  it('rejects invalid geojson body (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ geojson: { type: 'Nope' } }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('rejects empty features (400)', async () => {
    const req = new Request('http://localhost/api/merchant/delivery/zones/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ geojson: { type: 'FeatureCollection', features: [] } }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/no features/i);
  });

  it('rejects invalid radiusKm (400)', async () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [151.2, -33.86] },
          properties: { zoneType: 'RADIUS', name: 'R1', radiusKm: 0 },
        },
      ],
    };

    prismaMock.merchant.findUnique.mockResolvedValueOnce({ latitude: -33.86, longitude: 151.2 });

    const req = new Request('http://localhost/api/merchant/delivery/zones/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ geojson }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/Invalid radiusKm/i);
  });

  it('rejects radius zones when merchant missing coords (400)', async () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { zoneType: 'RADIUS', name: 'R1', radiusKm: 2 },
        },
      ],
    };

    prismaMock.merchant.findUnique.mockResolvedValueOnce({ latitude: null, longitude: null });

    const req = new Request('http://localhost/api/merchant/delivery/zones/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ geojson }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/must be set/i);
  });

  it('imports zones and replaces existing when replaceExisting=true (200)', async () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[151.2, -33.86], [151.21, -33.86], [151.21, -33.87], [151.2, -33.86]]] },
          properties: { zoneType: 'POLYGON', name: 'P1', isActive: true },
        },
      ],
    };

    prismaMock.merchantDeliveryZone.findMany.mockResolvedValueOnce([
      {
        id: BigInt(1),
        merchantId: BigInt(10),
        name: 'P1',
        type: 'POLYGON',
        radiusKm: null,
        polygon: [{ lat: -33.86, lng: 151.2 }],
        isActive: true,
      },
    ]);

    const req = new Request('http://localhost/api/merchant/delivery/zones/bulk-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ geojson, replaceExisting: true }),
    });

    const res = await POST(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    expect(txMock.merchantDeliveryZone.deleteMany).toHaveBeenCalledWith({ where: { merchantId: BigInt(10) } });
    expect(txMock.merchantDeliveryZone.createMany).toHaveBeenCalled();

    expect(json.data.importedCount).toBe(1);
    expect(Array.isArray(json.data.zones)).toBe(true);
  });
});
