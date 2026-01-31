/**
 * Mode Schedule API
 * GET/POST/PUT/DELETE /api/merchant/mode-schedules
 * 
 * Manages per-day mode schedules for Dine In, Takeaway, and Delivery
 * Different schedules for each day of the week
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { isValidTimeHHMM } from '@/lib/utils/validators';

/**
 * GET /api/merchant/mode-schedules
 * Get all mode schedules for the merchant
 */
export const GET = withMerchant(async (
  _request: NextRequest,
  context: AuthContext,
) => {
  try {
    const merchantId = context.merchantId!;
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { isPerDayModeScheduleEnabled: true },
    });

    const schedules = await prisma.merchantModeSchedule.findMany({
      where: {
        merchantId,
      },
      orderBy: [
        { mode: 'asc' },
        { dayOfWeek: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        enabled: merchant?.isPerDayModeScheduleEnabled ?? false,
        schedules,
      }),
    });
  } catch (error) {
    console.error('Error fetching mode schedules:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch mode schedules' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/merchant/mode-schedules
 * Create or update mode schedules (upsert)
 */
export const POST = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
) => {
  try {
    const merchantId = context.merchantId!;
    const body = await request.json();
    const { schedules, enabled } = body;

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Enabled must be a boolean' },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Schedules must be an array' },
        { status: 400 }
      );
    }

    // Validate each schedule
    for (const schedule of schedules) {
      if (!schedule.mode || !['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(schedule.mode)) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Invalid mode' },
          { status: 400 }
        );
      }
      if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Invalid day of week (0-6)' },
          { status: 400 }
        );
      }
      if (!schedule.startTime || !schedule.endTime) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Start and end time required' },
          { status: 400 }
        );
      }
      if (!isValidTimeHHMM(schedule.startTime) || !isValidTimeHHMM(schedule.endTime)) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Invalid time format. Expected HH:MM' },
          { status: 400 }
        );
      }
    }

    const results = await prisma.$transaction(async (tx) => {
      const updatedMerchant = enabled === undefined
        ? null
        : await tx.merchant.update({
          where: { id: merchantId },
          data: { isPerDayModeScheduleEnabled: enabled },
          select: { isPerDayModeScheduleEnabled: true },
        });

      const upserts = schedules.length === 0
        ? []
        : await Promise.all(
          schedules.map((schedule) =>
            tx.merchantModeSchedule.upsert({
              where: {
                merchantId_mode_dayOfWeek: {
                  merchantId,
                  mode: schedule.mode,
                  dayOfWeek: schedule.dayOfWeek,
                },
              },
              create: {
                merchantId,
                mode: schedule.mode,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                isActive: schedule.isActive ?? true,
              },
              update: {
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                isActive: schedule.isActive ?? true,
              },
            })
          )
        );

      return {
        enabled: updatedMerchant?.isPerDayModeScheduleEnabled ?? enabled ?? null,
        schedules: upserts,
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(results),
      message: 'Mode schedules updated successfully',
    });
  } catch (error) {
    console.error('Error saving mode schedules:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to save mode schedules' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/merchant/mode-schedules
 * Delete specific mode schedules
 */
export const DELETE = withMerchant(async (
  request: NextRequest,
  context: AuthContext,
) => {
  try {
    const merchantId = context.merchantId!;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const dayOfWeek = searchParams.get('dayOfWeek');
    const disableIfEmpty = searchParams.get('disableIfEmpty') === 'true';

    if (!mode || !dayOfWeek) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Mode and dayOfWeek required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.merchantModeSchedule.delete({
        where: {
          merchantId_mode_dayOfWeek: {
            merchantId,
            mode: mode as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
            dayOfWeek: parseInt(dayOfWeek),
          },
        },
      });

      if (!disableIfEmpty) {
        return { disabled: false };
      }

      const remaining = await tx.merchantModeSchedule.count({ where: { merchantId } });
      if (remaining > 0) {
        return { disabled: false };
      }

      await tx.merchant.update({
        where: { id: merchantId },
        data: { isPerDayModeScheduleEnabled: false },
      });

      return { disabled: true };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.disabled
        ? 'Mode schedule deleted successfully and per-day scheduling disabled'
        : 'Mode schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting mode schedule:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete mode schedule' },
      { status: 500 }
    );
  }
});
