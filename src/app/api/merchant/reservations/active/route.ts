/**
 * Merchant Active Reservations API
 * GET /api/merchant/reservations/active
 *
 * Returns PENDING reservations for the current merchant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID not found in context' },
        { status: 400 }
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        merchantId,
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
      },
      orderBy: [{ reservationDate: 'asc' }, { reservationTime: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(reservations),
      count: reservations.length,
    });
  } catch (error) {
    console.error('[GET /api/merchant/reservations/active] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
