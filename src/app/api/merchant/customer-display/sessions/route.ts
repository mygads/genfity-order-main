/**
 * Customer Display Sessions API
 * GET /api/merchant/customer-display/sessions
 * Returns active staff sessions from the last 24 hours.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

const SESSION_LOOKBACK_HOURS = 24;

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    if (!context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - SESSION_LOOKBACK_HOURS * 60 * 60 * 1000);

    const sessions = await prisma.userSession.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        createdAt: { gte: cutoff },
        user: {
          role: { in: ['MERCHANT_OWNER', 'MERCHANT_STAFF'] },
          merchantUsers: {
            some: {
              merchantId: context.merchantId,
              isActive: true,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        deviceInfo: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const normalizedSessions = sessions.map((session) => ({
      sessionId: session.id,
      userId: session.user.id,
      staffName: session.user.name ?? null,
      role: session.user.role ?? null,
      deviceInfo: session.deviceInfo ?? null,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessions: serializeBigInt(normalizedSessions),
      },
      message: 'Customer display sessions retrieved',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Customer display sessions fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve customer display sessions',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
