import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() =>
  ({
    merchant: {
      findUnique: vi.fn(),
    },
    merchantDeliveryZone: {
      findMany: vi.fn(),
    },
  })
);

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

import DeliveryFeeService from '@/lib/services/DeliveryFeeService';

describe('DeliveryFeeService (Prisma-mocked integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects delivery outside RADIUS zone', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({
      latitude: 0,
      longitude: 0,
      isDeliveryEnabled: true,
      enforceDeliveryZones: true,
      deliveryMaxDistanceKm: null,
      deliveryFeeBase: 2,
      deliveryFeePerKm: 0,
      deliveryFeeMin: null,
      deliveryFeeMax: null,
    });

    prismaMock.merchantDeliveryZone.findMany.mockResolvedValue([
      {
        id: BigInt(1),
        type: 'RADIUS',
        radiusKm: 1,
        polygon: null,
      },
    ]);

    // ~2.22 km at equator (0.02 deg lon)
    const result = await DeliveryFeeService.validateAndCalculateFee(BigInt(123), 0, 0.02);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('OUT_OF_ZONE');
  });

  it('accepts delivery inside RADIUS zone and returns fee', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({
      latitude: 0,
      longitude: 0,
      isDeliveryEnabled: true,
      enforceDeliveryZones: true,
      deliveryMaxDistanceKm: null,
      deliveryFeeBase: 2,
      deliveryFeePerKm: 0,
      deliveryFeeMin: null,
      deliveryFeeMax: null,
    });

    prismaMock.merchantDeliveryZone.findMany.mockResolvedValue([
      {
        id: BigInt(1),
        type: 'RADIUS',
        radiusKm: 1,
        polygon: null,
      },
    ]);

    // ~0.556 km at equator (0.005 deg lon)
    const result = await DeliveryFeeService.validateAndCalculateFee(BigInt(123), 0, 0.005);
    expect(result.success).toBe(true);
    expect(result.data?.feeAmount).toBe(2);
    expect(result.data?.distanceKm).toBeGreaterThan(0);
  });
});
