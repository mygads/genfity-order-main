import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class NextRequest extends Request {
    nextUrl: URL;

    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
      this.nextUrl = new URL(typeof input === 'string' ? input : input.toString());
    }
  }

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
    },
    orderFeedback: {
      findUnique: vi.fn(),
    },
    groupOrderSession: {
      findFirst: vi.fn(),
    },
    groupOrderParticipant: {
      findMany: vi.fn(),
    },
    groupOrderDetail: {
      findMany: vi.fn(),
    },
  };
});

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/utils/orderTrackingToken', () => ({
  verifyOrderTrackingToken: verifyMock,
}));

vi.mock('@/lib/utils/serializer', () => ({
  serializeBigInt: (value: unknown) => value,
  decimalToNumber: () => 0,
}));

import { GET as getPublicOrder } from '@/app/api/public/orders/[orderNumber]/route';
import { GET as getFeedback } from '@/app/api/public/orders/[orderNumber]/feedback/route';
import { GET as getGroupDetails } from '@/app/api/public/orders/[orderNumber]/group-details/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function makeReq(url: string) {
  return { nextUrl: new URL(url) } as any;
}

describe('Public order endpoints require token', () => {
  beforeEach(() => {
    prismaMock.order.findFirst.mockReset();
    prismaMock.orderFeedback.findUnique.mockReset();
    prismaMock.groupOrderSession.findFirst.mockReset();
    prismaMock.groupOrderParticipant.findMany.mockReset();
    prismaMock.groupOrderDetail.findMany.mockReset();
    verifyMock.mockReset();
  });

  it('GET /api/public/orders/[orderNumber] returns 404 without token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: '1',
      orderNumber: 'M-ABC',
      merchant: { code: 'm' },
    });

    const res = await getPublicOrder(makeReq('http://localhost/api/public/orders/M-ABC') as any, {
      params: Promise.resolve({ orderNumber: 'M-ABC' }),
    } as any);

    const json = await readJson(res as any);

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('GET /api/public/orders/[orderNumber] returns 200 with valid token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: '1',
      orderNumber: 'M-ABC',
      merchant: { code: 'm' },
      orderItems: [],
    });
    verifyMock.mockReturnValueOnce(true);

    const res = await getPublicOrder(
      makeReq('http://localhost/api/public/orders/M-ABC?token=good') as any,
      { params: Promise.resolve({ orderNumber: 'M-ABC' }) } as any
    );

    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith({
      token: 'good',
      merchantCode: 'm',
      orderNumber: 'M-ABC',
    });
  });

  it('GET /api/public/orders/[orderNumber]/feedback returns 404 without token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      orderNumber: 'M-ABC',
      merchant: { code: 'm' },
    });

    const res = await getFeedback(makeReq('http://localhost/api/public/orders/M-ABC/feedback') as any, {
      params: Promise.resolve({ orderNumber: 'M-ABC' }),
    } as any);

    const json = await readJson(res as any);

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('GET /api/public/orders/[orderNumber]/feedback returns 200 with valid token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      orderNumber: 'M-ABC',
      merchant: { code: 'm' },
    });
    prismaMock.orderFeedback.findUnique.mockResolvedValueOnce(null);
    verifyMock.mockReturnValueOnce(true);

    const res = await getFeedback(
      makeReq('http://localhost/api/public/orders/M-ABC/feedback?token=good') as any,
      { params: Promise.resolve({ orderNumber: 'M-ABC' }) } as any
    );

    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.hasFeedback).toBe(false);
  });

  it('GET /api/public/orders/[orderNumber]/group-details returns 404 without token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(2),
      orderNumber: 'M-GROUP',
      status: 'PENDING',
      subtotal: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      packagingFeeAmount: 0,
      totalAmount: 0,
      merchant: { code: 'm' },
      orderItems: [],
    });

    const res = await getGroupDetails(
      makeReq('http://localhost/api/public/orders/M-GROUP/group-details') as any,
      { params: Promise.resolve({ orderNumber: 'M-GROUP' }) } as any
    );

    const json = await readJson(res as any);

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('GET /api/public/orders/[orderNumber]/group-details returns 200 with valid token', async () => {
    prismaMock.order.findFirst.mockResolvedValueOnce({
      id: BigInt(2),
      orderNumber: 'M-GROUP',
      status: 'PENDING',
      subtotal: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      packagingFeeAmount: 0,
      totalAmount: 0,
      merchant: { code: 'm' },
      orderItems: [],
    });
    prismaMock.groupOrderSession.findFirst.mockResolvedValueOnce(null);
    verifyMock.mockReturnValueOnce(true);

    const res = await getGroupDetails(
      makeReq('http://localhost/api/public/orders/M-GROUP/group-details?token=good') as any,
      { params: Promise.resolve({ orderNumber: 'M-GROUP' }) } as any
    );

    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.isGroupOrder).toBe(false);
  });
});
