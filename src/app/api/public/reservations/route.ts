/**
 * Public Reservation API
 * POST /api/public/reservations
 *
 * Creates a table reservation for a merchant. Optionally includes a preorder payload.
 *
 * Rules:
 * - Auto-registers Customer by email (same as orders)
 * - Validates merchant + reservation settings
 * - Does NOT reserve stock at reservation time
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import emailService from '@/lib/services/EmailService';

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidYYYYMMDD(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';

  return `${hh}:${mm}`;
}

interface PreorderAddonInput {
  addonItemId: string;
  quantity?: number;
}

interface PreorderItemInput {
  menuId: string;
  quantity: number;
  notes?: string;
  addons?: PreorderAddonInput[];
}

interface ReservationRequestBody {
  merchantCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD (merchant timezone)
  reservationTime: string; // HH:MM (merchant timezone)
  notes?: string;
  items?: PreorderItemInput[];
}

interface PrismaError {
  code?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ReservationRequestBody>;

    if (!body.merchantCode || typeof body.merchantCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'merchantCode is required' },
        { status: 400 }
      );
    }

    if (!body.customerName || !body.customerEmail) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Customer name and email are required' },
        { status: 400 }
      );
    }

    const partySize = Number(body.partySize);
    if (!Number.isFinite(partySize) || partySize <= 0 || partySize > 100) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'partySize must be between 1 and 100' },
        { status: 400 }
      );
    }

    const reservationDate = typeof body.reservationDate === 'string' ? body.reservationDate.trim() : '';
    const reservationTime = typeof body.reservationTime === 'string' ? body.reservationTime.trim() : '';

    if (!reservationDate || !isValidYYYYMMDD(reservationDate)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'reservationDate must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (!reservationTime || !isValidHHMM(reservationTime)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'reservationTime must be HH:MM' },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { code: body.merchantCode },
      include: {
        openingHours: true,
        modeSchedules: {
          where: { isActive: true },
        },
      },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found or inactive' },
        { status: 404 }
      );
    }

    if (merchant.isReservationEnabled !== true) {
      return NextResponse.json(
        { success: false, error: 'RESERVATION_DISABLED', message: 'Reservations are not available for this merchant' },
        { status: 400 }
      );
    }

    const tz = merchant.timezone || 'Australia/Sydney';
    const today = getCurrentDateInTimezone(tz);
    const nowTime = getCurrentTimeInTimezoneString(tz);

    // Block reservations in the past (merchant timezone)
    if (reservationDate < today || (reservationDate === today && reservationTime < nowTime)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Reservation time cannot be in the past' },
        { status: 400 }
      );
    }

    const preorderItems = Array.isArray(body.items) ? body.items : [];

    // Normalize merchant rule:
    // - If reservationMenuRequired=false, reservationMinItemCount is treated as 0 (ignored)
    // - If reservationMenuRequired=true, min is at least 1
    const effectiveMinItems = merchant.reservationMenuRequired
      ? Math.max(1, Number(merchant.reservationMinItemCount ?? 1))
      : 0;

    if (effectiveMinItems > 0) {
      const totalQty = preorderItems.reduce((sum, it) => sum + Math.max(0, Number((it as any)?.quantity) || 0), 0);
      if (totalQty < effectiveMinItems) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Preorder is required (minimum ${effectiveMinItems} item(s))`,
          },
          { status: 400 }
        );
      }
    }

    // Find or create customer (same pattern as orders)
    const email = body.customerEmail.toLowerCase().trim();
    let customer = await prisma.customer.findUnique({ where: { email } });

    if (!customer) {
      if (body.customerPhone) {
        const phoneOwner = await prisma.customer.findFirst({
          where: {
            phone: body.customerPhone,
            email: { not: email },
          },
          select: { email: true },
        });
        if (phoneOwner) {
          return NextResponse.json(
            { success: false, error: 'PHONE_CONFLICT', message: 'This phone number is already registered with a different email address.' },
            { status: 400 }
          );
        }
      }

      const tempPassword = crypto.randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      try {
        customer = await prisma.customer.create({
          data: {
            name: body.customerName,
            email,
            phone: body.customerPhone || null,
            passwordHash: hashedPassword,
            isActive: true,
            mustChangePassword: true,
          },
        });

        // Non-blocking welcome email
        emailService
          .sendCustomerWelcome({
            to: email,
            name: body.customerName || 'Customer',
            email,
            phone: body.customerPhone || '',
            tempPassword,
            merchantCountry: merchant.country,
          })
          .catch(() => null);
      } catch (createError: unknown) {
        const prismaError = createError as PrismaError;
        if (prismaError.code === 'P2002') {
          customer = await prisma.customer.findUnique({ where: { email } });
        } else {
          throw createError;
        }
      }
    } else {
      const nextPhone = body.customerPhone?.trim() || null;
      if (customer.name !== body.customerName || customer.phone !== nextPhone) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: body.customerName,
            phone: nextPhone,
          },
        });
      }
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'CUSTOMER_ERROR', message: 'Failed to create or find customer' },
        { status: 500 }
      );
    }

    // Basic preorder sanitization only (stock/price validated at accept time)
    const preorder = preorderItems.length
      ? {
          items: preorderItems.map((item) => ({
            menuId: String(item.menuId),
            quantity: Number(item.quantity) || 1,
            notes: typeof item.notes === 'string' ? item.notes : undefined,
            addons: Array.isArray(item.addons)
              ? item.addons.map((a) => ({
                  addonItemId: String(a.addonItemId),
                  quantity: typeof a.quantity === 'number' ? a.quantity : 1,
                }))
              : [],
          })),
        }
      : null;

    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (notes.length > 2000) {
      throw new ValidationError('Notes is too long');
    }

    const created = await prisma.reservation.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        partySize,
        reservationDate,
        reservationTime,
        notes: notes || null,
        preorder: preorder as any,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            timezone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt(created),
        message: 'Reservation created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: error.message },
        { status: 400 }
      );
    }

    console.error('[POST /api/public/reservations] Error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
