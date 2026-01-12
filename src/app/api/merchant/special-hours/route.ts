/**
 * Special Hours API
 * GET/POST /api/merchant/special-hours
 * 
 * Manages holiday and special hours for the merchant
 * Override regular hours for specific dates
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/special-hours
 * Get all special hours for the merchant
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
) => {
  try {
    const merchantId = context.merchantId!;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const where: { merchantId: bigint; date?: { gte?: Date; lte?: Date } } = {
      merchantId,
    };

    // Filter by date range if provided
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const specialHours = await prisma.merchantSpecialHour.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(specialHours),
    });
  } catch (error) {
    console.error('Error fetching special hours:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch special hours' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/merchant/special-hours
 * Create or update a special hour entry
 */
export const POST = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
) => {
  try {
    const merchantId = context.merchantId!;
    const body = await request.json();

    // Validate required fields
    if (!body.date) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Date is required' },
        { status: 400 }
      );
    }

    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0); // Normalize to midnight

    // Upsert the special hour
    const specialHour = await prisma.merchantSpecialHour.upsert({
      where: {
        merchantId_date: {
          merchantId,
          date: date,
        },
      },
      create: {
        merchantId,
        date: date,
        name: body.name || null,
        isClosed: body.isClosed ?? false,
        openTime: body.openTime || null,
        closeTime: body.closeTime || null,
        isDineInEnabled: body.isDineInEnabled ?? null,
        isTakeawayEnabled: body.isTakeawayEnabled ?? null,
        isDeliveryEnabled: body.isDeliveryEnabled ?? null,
        dineInStartTime: body.dineInStartTime || null,
        dineInEndTime: body.dineInEndTime || null,
        takeawayStartTime: body.takeawayStartTime || null,
        takeawayEndTime: body.takeawayEndTime || null,
        deliveryStartTime: body.deliveryStartTime || null,
        deliveryEndTime: body.deliveryEndTime || null,
      },
      update: {
        name: body.name || null,
        isClosed: body.isClosed ?? false,
        openTime: body.openTime || null,
        closeTime: body.closeTime || null,
        isDineInEnabled: body.isDineInEnabled ?? null,
        isTakeawayEnabled: body.isTakeawayEnabled ?? null,
        isDeliveryEnabled: body.isDeliveryEnabled ?? null,
        dineInStartTime: body.dineInStartTime || null,
        dineInEndTime: body.dineInEndTime || null,
        takeawayStartTime: body.takeawayStartTime || null,
        takeawayEndTime: body.takeawayEndTime || null,
        deliveryStartTime: body.deliveryStartTime || null,
        deliveryEndTime: body.deliveryEndTime || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(specialHour),
      message: 'Special hours saved successfully',
    });
  } catch (error) {
    console.error('Error saving special hours:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to save special hours' },
      { status: 500 }
    );
  }
});
