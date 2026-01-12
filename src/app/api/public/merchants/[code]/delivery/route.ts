/**
 * Public Merchant Delivery Settings API
 * GET /api/public/merchants/[code]/delivery - Delivery settings + zones
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

export async function GET(_request: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const params = await context.params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.code },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        isOpen: true,
        latitude: true,
        longitude: true,
        currency: true,
        isDeliveryEnabled: true,
        enforceDeliveryZones: true,
        deliveryMaxDistanceKm: true,
        deliveryFeeBase: true,
        deliveryFeePerKm: true,
        deliveryFeeMin: true,
        deliveryFeeMax: true,
      },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const zones = await prisma.merchantDeliveryZone.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...merchant,
        zones,
      }),
      message: 'Delivery settings retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting delivery settings:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve delivery settings',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
