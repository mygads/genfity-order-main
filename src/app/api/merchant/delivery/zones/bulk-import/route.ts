/**
 * Merchant Delivery Zones Bulk Import API
 * POST /api/merchant/delivery/zones/bulk-import
 * Body: { geojson: FeatureCollection, replaceExisting?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

type DeliveryZoneType = 'RADIUS' | 'POLYGON';

type LatLngPoint = { lat: number; lng: number };

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: null | { type: string; coordinates: any };
    properties?: Record<string, unknown>;
  }>;
};

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function parsePolygonFromGeoJson(geometry: any): LatLngPoint[] | null {
  if (!geometry || geometry.type !== 'Polygon') return null;
  const ring = geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;

  const points: LatLngPoint[] = [];
  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2) return null;
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;
    points.push({ lat, lng });
  }

  // Drop closing point if it repeats first
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      points.pop();
    }
  }

  if (points.length < 3) return null;
  if (points.length > 250) return null;

  return points;
}

export const POST = withMerchantOwner(async (req: NextRequest, context: AuthContext) => {
  try {
    const merchantId = context.merchantId!;
    const body = await req.json();

    const geojson = body?.geojson as GeoJsonFeatureCollection | undefined;
    const replaceExisting = body?.replaceExisting === true;

    if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid GeoJSON: expected FeatureCollection',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const zonesToCreate: Array<{
      merchantId: bigint;
      name: string;
      type: DeliveryZoneType;
      radiusKm: number | null;
      polygon: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
      isActive: boolean;
    }> = [];

    let hasRadius = false;
    let autoNameIndex = 1;

    for (const feature of geojson.features) {
      const props = (feature.properties || {}) as Record<string, unknown>;

      const name = String(props.name || `Imported Zone ${autoNameIndex++}`).trim();
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

      const isActive = props.isActive === false ? false : true;

      const zoneTypeRaw = String(props.zoneType || props.type || '').toUpperCase();
      const isPolygon = feature.geometry?.type === 'Polygon' || zoneTypeRaw === 'POLYGON';

      if (isPolygon) {
        const polygon = parsePolygonFromGeoJson(feature.geometry);
        if (!polygon) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: `Invalid polygon for zone "${name}" (must be a Polygon with 3-250 points)` ,
              statusCode: 400,
            },
            { status: 400 }
          );
        }

        zonesToCreate.push({
          merchantId,
          name,
          type: 'POLYGON',
          radiusKm: null,
          polygon: polygon as unknown as Prisma.InputJsonValue,
          isActive,
        });
        continue;
      }

      // RADIUS zone
      hasRadius = true;
      const radiusKm = typeof props.radiusKm === 'number' ? props.radiusKm : Number(props.radiusKm);

      if (!isFiniteNumber(radiusKm) || radiusKm <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Invalid radiusKm for zone "${name}" (must be > 0)`,
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      zonesToCreate.push({
        merchantId,
        name,
        type: 'RADIUS',
        radiusKm,
        polygon: Prisma.DbNull,
        isActive,
      });
    }

    if (zonesToCreate.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'GeoJSON contains no features to import',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (hasRadius) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { latitude: true, longitude: true },
      });

      if (!merchant || merchant.latitude === null || merchant.longitude === null) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Merchant latitude/longitude must be set before importing radius zones',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.merchantDeliveryZone.deleteMany({ where: { merchantId } });
      }

      // createMany is faster than many individual requests; still runs within this transaction.
      await tx.merchantDeliveryZone.createMany({
        data: zonesToCreate,
      });
    });

    const zones = await prisma.merchantDeliveryZone.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: zonesToCreate.length,
        zones: serializeBigInt(zones),
      },
      message: 'Delivery zones imported successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error bulk importing delivery zones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to bulk import delivery zones',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
