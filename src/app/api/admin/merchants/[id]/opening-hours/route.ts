/**
 * PUT /api/admin/merchants/:id/opening-hours
 * Update merchant opening hours (Super Admin only)
 * 
 * Request Body:
 * {
 *   "openingHours": [
 *     {
 *       "dayOfWeek": 0,  // 0=Sunday, 1=Monday, ..., 6=Saturday
 *       "openTime": "09:00",
 *       "closeTime": "22:00",
 *       "isClosed": false
 *     },
 *     ...
 *   ]
 * }
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';

interface OpeningHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

async function updateOpeningHoursHandler(
  request: NextRequest,
  _authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const merchantId = BigInt(params.id);
    const body = await request.json();

    // Validate merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new ValidationError('Merchant not found');
    }

    // Validate opening hours data
    if (!Array.isArray(body.openingHours) || body.openingHours.length === 0) {
      throw new ValidationError('Opening hours must be an array with at least one entry');
    }

    // Validate each opening hour entry
    body.openingHours.forEach((hour: OpeningHourInput) => {
      if (typeof hour.dayOfWeek !== 'number' || hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
        throw new ValidationError('dayOfWeek must be between 0-6');
      }

      if (!hour.isClosed) {
        if (!hour.openTime || !hour.closeTime) {
          throw new ValidationError('openTime and closeTime are required when store is not closed');
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(hour.openTime) || !timeRegex.test(hour.closeTime)) {
          throw new ValidationError('Time must be in HH:MM format (24-hour)');
        }
      }
    });

    // Use transaction to update opening hours
    await prisma.$transaction(async (tx) => {
      // Delete existing opening hours for this merchant
      await tx.merchantOpeningHour.deleteMany({
        where: { merchantId },
      });

      // Create new opening hours
      await tx.merchantOpeningHour.createMany({
        data: body.openingHours.map((hour: OpeningHourInput) => ({
          merchantId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.isClosed ? null : hour.openTime,
          closeTime: hour.isClosed ? null : hour.closeTime,
          isClosed: hour.isClosed,
        })),
      });
    });

    // Fetch updated opening hours
    const updatedHours = await prisma.merchantOpeningHour.findMany({
      where: { merchantId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return successResponse(
      { openingHours: updatedHours },
      'Opening hours updated successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const PUT = withSuperAdmin(updateOpeningHoursHandler);
