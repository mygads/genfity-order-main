/**
 * Merchant Reservation Count API
 * GET /api/merchant/reservations/count
 *
 * Returns counts of reservations for sidebar/UX decisions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';

function getCurrentDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function getCurrentTimeInTimezoneString(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID not found in context' },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { timezone: true },
    });

    const tz = merchant?.timezone || 'Australia/Sydney';
    const today = getCurrentDateInTimezone(tz);
    const nowTime = getCurrentTimeInTimezoneString(tz);

    const [pending, acceptedUpcoming] = await prisma.$transaction([
      prisma.reservation.count({
        where: {
          merchantId,
          status: 'PENDING',
        },
      }),
      prisma.reservation.count({
        where: {
          merchantId,
          status: 'ACCEPTED',
          OR: [
            { reservationDate: { gt: today } },
            {
              reservationDate: today,
              reservationTime: { gte: nowTime },
            },
          ],
        },
      }),
    ]);

    const active = pending + acceptedUpcoming;

    return NextResponse.json({
      success: true,
      data: {
        pending,
        active,
      },
    });
  } catch (error) {
    console.error('[GET /api/merchant/reservations/count] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservation counts' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
