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
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    merchantUser: {
      findFirst: vi.fn(),
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
    withMerchant: (handler: any) => {
      return (req: Request, routeContext?: any) => {
        return handler(req, authContextMock as any, routeContext);
      };
    },
  };
});

import { PUT } from '@/app/api/merchant/orders/[orderId]/delivery/assign/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('API Route: /api/merchant/orders/[orderId]/delivery/assign', () => {
  beforeEach(() => {
    prismaMock.order.findFirst.mockReset();
    prismaMock.order.update.mockReset();
    prismaMock.merchantUser.findFirst.mockReset();

    authContextMock.merchantId = BigInt(10);
  });

  it('assigns driver (200)', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(100),
      orderType: 'DELIVERY',
      deliveryStatus: 'PENDING_ASSIGNMENT',
      deliveryDriverUserId: null,
    });

    prismaMock.merchantUser.findFirst.mockResolvedValueOnce({ userId: BigInt(8) });

    prismaMock.order.update.mockResolvedValueOnce({
      id: BigInt(100),
      orderType: 'DELIVERY',
      deliveryStatus: 'ASSIGNED',
      deliveryDriverUserId: BigInt(8),
      deliveryAssignedAt: new Date('2026-01-01T00:00:00.000Z'),
      orderItems: [],
    });

    const req = new Request('http://localhost/api/merchant/orders/100/delivery/assign', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ driverUserId: '8' }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ orderId: '100' }) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.deliveryDriverUserId).toBe('8');
    expect(json.data.deliveryStatus).toBe('ASSIGNED');
  });

  it('unassigns driver (200)', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(101),
      orderType: 'DELIVERY',
      deliveryStatus: 'ASSIGNED',
      deliveryDriverUserId: BigInt(8),
    });

    prismaMock.order.update.mockResolvedValueOnce({
      id: BigInt(101),
      orderType: 'DELIVERY',
      deliveryStatus: 'PENDING_ASSIGNMENT',
      deliveryDriverUserId: null,
      deliveryAssignedAt: null,
      orderItems: [],
    });

    const req = new Request('http://localhost/api/merchant/orders/101/delivery/assign', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ driverUserId: null }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ orderId: '101' }) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.deliveryStatus).toBe('PENDING_ASSIGNMENT');
  });

  it('rejects non-delivery orders (400)', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(102),
      orderType: 'TAKEAWAY',
      deliveryStatus: null,
      deliveryDriverUserId: null,
    });

    const req = new Request('http://localhost/api/merchant/orders/102/delivery/assign', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ driverUserId: '8' }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ orderId: '102' }) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('rejects delivered orders (409)', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(103),
      orderType: 'DELIVERY',
      deliveryStatus: 'DELIVERED',
      deliveryDriverUserId: BigInt(8),
    });

    const req = new Request('http://localhost/api/merchant/orders/103/delivery/assign', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ driverUserId: null }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ orderId: '103' }) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
  });

  it('rejects driver not found for merchant (400)', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(104),
      orderType: 'DELIVERY',
      deliveryStatus: 'PENDING_ASSIGNMENT',
      deliveryDriverUserId: null,
    });

    prismaMock.merchantUser.findFirst.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/merchant/orders/104/delivery/assign', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ driverUserId: '999' }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ orderId: '104' }) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
