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

/**
 * GET /api/merchant/special-hours/[id]
 * Get a specific special hour entry
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
) => {
  try {
    const merchantId = context.merchantId!;
    const { id } = await routeContext.params;

    const specialHour = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: BigInt(id),
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
  routeContext: { params: Promise<Record<string, string>> }
) => {
  try {
    const merchantId = context.merchantId!;
    const { id } = await routeContext.params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: BigInt(id),
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
      where: { id: BigInt(id) },
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
  routeContext: { params: Promise<Record<string, string>> }
) => {
  try {
    const merchantId = context.merchantId!;
    const { id } = await routeContext.params;

    // Check ownership
    const existing = await prisma.merchantSpecialHour.findFirst({
      where: {
        id: BigInt(id),
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
      where: { id: BigInt(id) },
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
