/**
 * Merchant Delivery Zones API
 * GET /api/merchant/delivery/zones - List zones for merchant
 * POST /api/merchant/delivery/zones - Create or update zone
 * DELETE /api/merchant/delivery/zones?id=123 - Delete zone
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

type DeliveryZoneType = 'RADIUS' | 'POLYGON';

type LatLngPoint = { lat: number; lng: number };

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function parseOptionalNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : null;
}

function parsePolygon(val: unknown): LatLngPoint[] | null {
  if (val === null || val === undefined) return null;
  if (!Array.isArray(val)) return null;

  const points: LatLngPoint[] = [];
  for (const rawPoint of val) {
    if (!rawPoint || typeof rawPoint !== 'object') return null;
    const lat = (rawPoint as any).lat;
    const lng = (rawPoint as any).lng;
    const latNum = typeof lat === 'number' ? lat : Number(lat);
    const lngNum = typeof lng === 'number' ? lng : Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
    if (latNum < -90 || latNum > 90) return null;
    if (lngNum < -180 || lngNum > 180) return null;
    points.push({ lat: latNum, lng: lngNum });
  }
  return points;
}

export const GET = withMerchantOwner(async (_req: NextRequest, context: AuthContext) => {
  try {
    const merchantId = context.merchantId!;

    const zones = await prisma.merchantDeliveryZone.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(zones),
      message: 'Delivery zones retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting delivery zones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve delivery zones',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});

export const POST = withMerchantOwner(async (req: NextRequest, context: AuthContext) => {
  try {
    const merchantId = context.merchantId!;
    const body = await req.json();

    const id = body?.id ? BigInt(body.id) : null;
    const name = String(body?.name || '').trim();
    const type = body?.type as DeliveryZoneType;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Zone name is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!type || !['RADIUS', 'POLYGON'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Zone type must be RADIUS or POLYGON',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const radiusKm = parseOptionalNumber(body?.radiusKm);
    const polygon = parsePolygon(body?.polygon);

    if (type === 'RADIUS') {
      if (radiusKm === null) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'radiusKm is required for RADIUS zones',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      if (!isFiniteNumber(radiusKm) || radiusKm <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'radiusKm must be a number greater than 0',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Radius zones are measured from merchant location
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { latitude: true, longitude: true },
      });

      if (!merchant || merchant.latitude === null || merchant.longitude === null) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Merchant latitude/longitude must be set before using radius zones',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

    if (type === 'POLYGON') {
      if (!polygon) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'polygon is required for POLYGON zones',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      if (polygon.length < 3) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'polygon must have at least 3 points',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      if (polygon.length > 250) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'polygon has too many points (max 250)',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

    const polygonForPrisma: Prisma.InputJsonValue | Prisma.NullTypes.DbNull =
      type === 'POLYGON' ? (polygon as unknown as Prisma.InputJsonValue) : Prisma.DbNull;

    const zoneData = {
      merchantId,
      name,
      type,
      radiusKm: type === 'RADIUS' ? radiusKm : null,
      polygon: polygonForPrisma,
      isActive: body?.isActive !== false,
    };

    const zone = id
      ? await prisma.merchantDeliveryZone.update({
          where: { id },
          data: zoneData,
        })
      : await prisma.merchantDeliveryZone.create({
          data: zoneData,
        });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(zone),
      message: 'Delivery zone saved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error saving delivery zone:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to save delivery zone',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});

export const DELETE = withMerchantOwner(async (req: NextRequest, context: AuthContext) => {
  try {
    const merchantId = context.merchantId!;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Zone id is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const zone = await prisma.merchantDeliveryZone.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, merchantId: true },
    });

    if (!zone || zone.merchantId !== merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Zone not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    await prisma.merchantDeliveryZone.delete({ where: { id: zone.id } });

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Delivery zone deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting delivery zone:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete delivery zone',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
