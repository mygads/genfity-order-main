/**
 * Public Store Status API
 * GET /api/public/merchants/[code]/status - Get real-time store status
 * 
 * This endpoint returns only the store status data needed for real-time updates.
 * It should NOT be cached by ISR to ensure fresh data.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

export const dynamic = 'force-dynamic'; // Never cache this route

/**
 * GET /api/public/merchants/[code]/status
 * Returns real-time store status (not cached)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.code },
      select: {
        id: true,
        code: true,
        isActive: true,
        isOpen: true,
        isManualOverride: true,
        timezone: true,
        isDineInEnabled: true,
        isTakeawayEnabled: true,
        dineInLabel: true,
        takeawayLabel: true,
        dineInScheduleStart: true,
        dineInScheduleEnd: true,
        takeawayScheduleStart: true,
        takeawayScheduleEnd: true,
        openingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            isClosed: true,
            openTime: true,
            closeTime: true,
          },
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        // Per-day mode schedules
        modeSchedules: {
          where: { isActive: true },
          select: {
            id: true,
            mode: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [
            { mode: 'asc' },
            { dayOfWeek: 'asc' },
          ],
        },
        // Special hours for today
        specialHours: {
          select: {
            id: true,
            date: true,
            name: true,
            isClosed: true,
            openTime: true,
            closeTime: true,
            isDineInEnabled: true,
            isTakeawayEnabled: true,
            dineInStartTime: true,
            dineInEndTime: true,
            takeawayStartTime: true,
            takeawayEndTime: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
        },
        { status: 404 }
      );
    }

    if (!merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_DISABLED',
          message: 'Merchant is currently disabled',
        },
        { status: 404 }
      );
    }

    // Get today's date in merchant timezone for special hours check
    const tz = merchant.timezone || 'Australia/Sydney';
    const now = new Date();
    const todayFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = todayFormatter.format(now); // YYYY-MM-DD format

    // Find special hours for today
    const todaySpecialHour = merchant.specialHours.find((sh) => {
      const shDate = new Date(sh.date);
      const shDateStr = todayFormatter.format(shDate);
      return shDateStr === todayStr;
    });

    // Check subscription status
    let subscriptionStatus = 'ACTIVE';
    try {
      const { default: subscriptionRepository } = await import('@/lib/repositories/SubscriptionRepository');
      const subscription = await subscriptionRepository.getMerchantSubscription(merchant.id);
      if (subscription) {
        subscriptionStatus = subscription.status;
      } else {
        // No subscription found = treat as SUSPENDED
        subscriptionStatus = 'SUSPENDED';
      }
    } catch (subError) {
      console.warn('Failed to get subscription status:', subError);
      // On error, treat as SUSPENDED to be safe
      subscriptionStatus = 'SUSPENDED';
    }

    // Return only status-related data
    const statusData = {
      isOpen: merchant.isOpen,
      isManualOverride: merchant.isManualOverride ?? false,
      timezone: merchant.timezone,
      isDineInEnabled: merchant.isDineInEnabled ?? true,
      isTakeawayEnabled: merchant.isTakeawayEnabled ?? true,
      dineInLabel: merchant.dineInLabel,
      takeawayLabel: merchant.takeawayLabel,
      dineInScheduleStart: merchant.dineInScheduleStart,
      dineInScheduleEnd: merchant.dineInScheduleEnd,
      takeawayScheduleStart: merchant.takeawayScheduleStart,
      takeawayScheduleEnd: merchant.takeawayScheduleEnd,
      openingHours: merchant.openingHours,
      // Per-day mode schedules
      modeSchedules: merchant.modeSchedules,
      // Today's special hours (if any)
      todaySpecialHour: todaySpecialHour || null,
      // Subscription status (store suspension)
      subscriptionStatus,
      // Server timestamp for accurate time comparison
      serverTime: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(statusData),
    });
  } catch (error) {
    console.error('Error fetching store status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch store status',
      },
      { status: 500 }
    );
  }
}
