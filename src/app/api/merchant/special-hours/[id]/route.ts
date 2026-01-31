/**
 * Special Hour Detail API
 * GET/PUT/DELETE /api/merchant/special-hours/[id]
 * 
 * Manage individual special hour entries
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { isValidTimeHHMM } from '@/lib/utils/validators';

const isValidOptionalTime = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  return typeof value === 'string' && isValidTimeHHMM(value);
};

/**
 * GET /api/merchant/special-hours/[id]
 * Get a specific special hour entry
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) => {
  try {
    const merchantId = context.merchantId!;
    const specialHourIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!specialHourIdResult.ok) {
      return NextResponse.json(specialHourIdResult.body, { status: specialHourIdResult.status });
    }
    const specialHourId = specialHourIdResult.value;

    const specialHour = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: specialHourId,
        merchantId,
      },
    });

    if (!specialHour) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Special hour not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(specialHour),
    });
  } catch (error) {
    console.error('Error fetching special hour:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch special hour' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/merchant/special-hours/[id]
 * Update a specific special hour entry
 */
export const PUT = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) => {
  try {
    const merchantId = context.merchantId!;
    const specialHourIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!specialHourIdResult.ok) {
      return NextResponse.json(specialHourIdResult.body, { status: specialHourIdResult.status });
    }
    const specialHourId = specialHourIdResult.value;
    const body = await request.json();

    if (
      !isValidOptionalTime(body.openTime) ||
      !isValidOptionalTime(body.closeTime) ||
      !isValidOptionalTime(body.dineInStartTime) ||
      !isValidOptionalTime(body.dineInEndTime) ||
      !isValidOptionalTime(body.takeawayStartTime) ||
      !isValidOptionalTime(body.takeawayEndTime) ||
      !isValidOptionalTime(body.deliveryStartTime) ||
      !isValidOptionalTime(body.deliveryEndTime)
    ) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Invalid time format. Expected HH:MM' },
        { status: 400 }
      );
    }

    // Check ownership
    const existing = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: specialHourId,
        merchantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Special hour not found' },
        { status: 404 }
      );
    }

    const specialHour = await prisma.merchantSpecialHour.update({
      where: { id: specialHourId },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        isClosed: body.isClosed !== undefined ? body.isClosed : existing.isClosed,
        openTime: body.openTime !== undefined ? body.openTime : existing.openTime,
        closeTime: body.closeTime !== undefined ? body.closeTime : existing.closeTime,
        isDineInEnabled: body.isDineInEnabled !== undefined ? body.isDineInEnabled : existing.isDineInEnabled,
        isTakeawayEnabled: body.isTakeawayEnabled !== undefined ? body.isTakeawayEnabled : existing.isTakeawayEnabled,
        isDeliveryEnabled: body.isDeliveryEnabled !== undefined ? body.isDeliveryEnabled : existing.isDeliveryEnabled,
        dineInStartTime: body.dineInStartTime !== undefined ? body.dineInStartTime : existing.dineInStartTime,
        dineInEndTime: body.dineInEndTime !== undefined ? body.dineInEndTime : existing.dineInEndTime,
        takeawayStartTime: body.takeawayStartTime !== undefined ? body.takeawayStartTime : existing.takeawayStartTime,
        takeawayEndTime: body.takeawayEndTime !== undefined ? body.takeawayEndTime : existing.takeawayEndTime,
        deliveryStartTime: body.deliveryStartTime !== undefined ? body.deliveryStartTime : existing.deliveryStartTime,
        deliveryEndTime: body.deliveryEndTime !== undefined ? body.deliveryEndTime : existing.deliveryEndTime,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(specialHour),
      message: 'Special hour updated successfully',
    });
  } catch (error) {
    console.error('Error updating special hour:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update special hour' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/merchant/special-hours/[id]
 * Delete a specific special hour entry
 */
export const DELETE = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) => {
  try {
    const merchantId = context.merchantId!;
    const specialHourIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!specialHourIdResult.ok) {
      return NextResponse.json(specialHourIdResult.body, { status: specialHourIdResult.status });
    }
    const specialHourId = specialHourIdResult.value;

    // Check ownership
    const existing = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: specialHourId,
        merchantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Special hour not found' },
        { status: 404 }
      );
    }

    await prisma.merchantSpecialHour.delete({
      where: { id: specialHourId },
    });

    return NextResponse.json({
      success: true,
      message: 'Special hour deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting special hour:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete special hour' },
      { status: 500 }
    );
  }
});
