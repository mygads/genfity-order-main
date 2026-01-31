/**
 * Merchant Opening Hours API
 * PUT /api/merchant/opening-hours - Update merchant opening hours
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';
import { isValidTimeHHMM } from '@/lib/utils/validators';

interface OpeningHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/**
 * PUT /api/merchant/opening-hours
 * Update merchant opening hours
 */
async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    const merchantId = authContext.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { openingHours } = body;

    if (!openingHours || !Array.isArray(openingHours)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid opening hours data',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate opening hours
    for (const hour of openingHours) {
      if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
        throw new ValidationError('Invalid day of week');
      }
      
      if (!hour.isClosed) {
        if (!hour.openTime || !hour.closeTime) {
          throw new ValidationError('Open time and close time are required when not closed');
        }
        if (!isValidTimeHHMM(hour.openTime) || !isValidTimeHHMM(hour.closeTime)) {
          throw new ValidationError('Invalid time format. Expected HH:MM');
        }
      }
    }

    // Delete existing opening hours
    await prisma.merchantOpeningHour.deleteMany({
      where: { merchantId },
    });

    // Create new opening hours
    await prisma.merchantOpeningHour.createMany({
      data: openingHours.map((hour: OpeningHourInput) => ({
        merchantId,
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.isClosed ? '00:00' : hour.openTime,
        closeTime: hour.isClosed ? '00:00' : hour.closeTime,
        isClosed: hour.isClosed,
      })),
    });

    return NextResponse.json({
      success: true,
      data: { openingHours },
      message: 'Opening hours updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating opening hours:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update opening hours',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
