import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import {
  isStoreOpenWithSpecialHoursAtTime,
  isModeAvailableWithSchedulesAtTime,
  type ExtendedMerchantStatus,
} from '@/lib/utils/storeStatus';

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

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

function generateSlots(intervalMinutes: number): string[] {
  const slots: string[] = [];
  const totalMinutesInDay = 24 * 60;

  for (let mins = 0; mins < totalMinutesInDay; mins += intervalMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${pad2(h)}:${pad2(m)}`);
  }

  return slots;
}

/**
 * GET /api/public/merchants/[merchantCode]/available-times
 *
 * Returns valid time slots (today, merchant timezone) for a given order mode.
 * This helps the UI disable invalid times without relying on trial-and-error POSTs.
 *
 * Query params:
 * - mode: DINE_IN | TAKEAWAY | DELIVERY (required)
 * - intervalMinutes: number (optional, default 15)
 * - includePast: true|false (optional, default false)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: merchantCode } = await params;
    const url = new URL(req.url);

    const modeParam = (url.searchParams.get('mode') || '').toUpperCase();
    const mode = (['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).includes(modeParam as any)
      ? (modeParam as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY')
      : null;

    if (!mode) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Query param "mode" is required (DINE_IN, TAKEAWAY, DELIVERY)',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const intervalMinutesRaw = Number(url.searchParams.get('intervalMinutes') || '15');
    const intervalMinutes = Number.isFinite(intervalMinutesRaw) ? intervalMinutesRaw : 15;

    if (![5, 10, 15, 20, 30, 60].includes(intervalMinutes)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'intervalMinutes must be one of: 5, 10, 15, 20, 30, 60',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const includePast = (url.searchParams.get('includePast') || 'false').toLowerCase() === 'true';

    const merchant = await prisma.merchant.findUnique({
      where: { code: merchantCode },
      include: {
        openingHours: true,
        modeSchedules: true,
      },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_INACTIVE',
          message: 'Merchant is currently not accepting orders',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (merchant.isScheduledOrderEnabled !== true) {
      return NextResponse.json(
        {
          success: true,
          data: {
            timezone: merchant.timezone || 'Australia/Sydney',
            now: null,
            mode,
            intervalMinutes,
            slots: [] as string[],
            disabledReason: 'Scheduled orders are not enabled for this merchant.',
          },
          statusCode: 200,
        },
        { status: 200 }
      );
    }

    const tz = merchant.timezone || 'Australia/Sydney';
    const todayISO = getCurrentDateInTimezone(tz);
    const todayDate = new Date(todayISO);

    const todaySpecialHour = await prisma.merchantSpecialHour.findUnique({
      where: {
        merchantId_date: {
          merchantId: merchant.id,
          date: todayDate,
        },
      },
    });

    const merchantStatus: ExtendedMerchantStatus = {
      isOpen: merchant.isOpen,
      isManualOverride: merchant.isManualOverride,
      isPerDayModeScheduleEnabled: merchant.isPerDayModeScheduleEnabled,
      timezone: tz,
      openingHours: merchant.openingHours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
      modeSchedules: merchant.modeSchedules.map((s) => ({
        mode: s.mode as any,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      })),
      todaySpecialHour: todaySpecialHour as any,
      isDineInEnabled: merchant.isDineInEnabled,
      isTakeawayEnabled: merchant.isTakeawayEnabled,
      isDeliveryEnabled: merchant.isDeliveryEnabled,
      dineInScheduleStart: merchant.dineInScheduleStart,
      dineInScheduleEnd: merchant.dineInScheduleEnd,
      takeawayScheduleStart: merchant.takeawayScheduleStart,
      takeawayScheduleEnd: merchant.takeawayScheduleEnd,
      deliveryScheduleStart: merchant.deliveryScheduleStart,
      deliveryScheduleEnd: merchant.deliveryScheduleEnd,
    };

    const nowHHMM = getCurrentTimeInTimezoneString(tz);

    const baseSlots = generateSlots(intervalMinutes);
    const filtered = baseSlots.filter((hhmm) => isValidHHMM(hhmm));

    const validSlots = filtered.filter((hhmm) => {
      if (!includePast && hhmm < nowHHMM) return false;

      const store = isStoreOpenWithSpecialHoursAtTime(merchantStatus, hhmm);
      if (!store.isOpen) return false;

      const modeRes = isModeAvailableWithSchedulesAtTime(mode, merchantStatus, hhmm);
      if (!modeRes.available) return false;

      // Extra delivery guard: require delivery enabled + coords, similar to order API
      if (mode === 'DELIVERY') {
        if (merchant.isDeliveryEnabled !== true) return false;
        if (merchant.latitude === null || merchant.longitude === null) return false;
      }

      return true;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          timezone: tz,
          date: todayISO,
          now: nowHHMM,
          mode,
          intervalMinutes,
          slots: validSlots,
        },
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'Failed to load available times',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
