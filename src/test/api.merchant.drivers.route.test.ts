import { describe, expect, it, vi, beforeEach } from 'vitest';

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
    merchantUser: {
      findMany: vi.fn(),
    },
  };
});

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

const authContextMock = vi.hoisted(() => {
  return {
    userId: BigInt(1),
    merchantId: BigInt(10),
    role: 'MERCHANT_OWNER',
  };
});

vi.mock('@/lib/middleware/auth', () => {
  return {
    withMerchantPermission: (handler: any) => {
      return (req: Request, routeContext?: any) => {
        return handler(req, authContextMock as any, routeContext);
      };
    },
    withMerchantOwner: (handler: any) => {
      return (req: Request, routeContext?: any) => {
        return handler(req, authContextMock as any, routeContext);
      };
    },
  };
});

import { GET } from '@/app/api/merchant/drivers/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('API Route: /api/merchant/drivers', () => {
  beforeEach(() => {
    prismaMock.merchantUser.findMany.mockReset();
    authContextMock.merchantId = BigInt(10);
  });

  it('GET returns drivers list (200)', async () => {
    prismaMock.merchantUser.findMany.mockResolvedValueOnce([
      {
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        user: {
          id: BigInt(5),
          name: 'Driver One',
          email: 'driver1@example.com',
          phone: null,
        },
      },
    ]);

    const req = new Request('http://localhost/api/merchant/drivers', { method: 'GET' });
    const res = await GET(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0].id).toBe('5');
    expect(json.data[0].isActive).toBe(true);
  });

  it('GET rejects when merchantId missing (400)', async () => {
    authContextMock.merchantId = undefined as any;

    const req = new Request('http://localhost/api/merchant/drivers', { method: 'GET' });
    const res = await GET(req as any, {} as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
