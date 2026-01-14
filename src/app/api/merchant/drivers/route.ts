/**
 * Merchant Drivers API
 *
 * GET /api/merchant/drivers
 * - Default: list ACTIVE delivery drivers for assignment
 * - Query params:
 *   - includeInactive=1: include inactive drivers (for management screens)
 *   - search=...: search by name/email
 *
 * POST /api/merchant/drivers
 * - Grant driver access to an existing ACCEPTED staff member (OWNER only)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner, withMerchantPermission } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import { ERROR_CODES, ValidationError } from '@/lib/constants/errors';

export const GET = withMerchantPermission(async (req: NextRequest, authContext: AuthContext) => {
  try {
    if (!authContext.merchantId) {
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

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === '1' || searchParams.get('includeInactive') === 'true';
    const search = (searchParams.get('search') || '').trim();

    const drivers = await prisma.merchantUser.findMany({
      where: {
        merchantId: authContext.merchantId,
        ...(includeInactive ? {} : { isActive: true }),
        OR: [
          { role: 'DRIVER' },
          {
            role: 'STAFF',
            invitationStatus: 'ACCEPTED',
            permissions: { has: STAFF_PERMISSIONS.DRIVER_DASHBOARD },
          },
        ],
        user: {
          isActive: true,
          ...(search
            ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
            : {}),
        },
      },
      select: {
        role: true,
        isActive: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const data = drivers.map((d) => ({
      ...d.user,
      isActive: d.isActive,
      joinedAt: d.createdAt,
      source: d.role === 'DRIVER' ? 'driver' : 'staff',
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
      message: 'Drivers retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant drivers:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve drivers',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});

export const POST = withMerchantOwner(async (req: NextRequest, authContext: AuthContext) => {
  try {
    if (!authContext.merchantId) {
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

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? '').trim();

    if (!userId || !/^\d+$/.test(userId)) {
      throw new ValidationError('Valid userId is required', ERROR_CODES.VALIDATION_ERROR);
    }

    const staffUserId = BigInt(userId);
    const driverPermission = STAFF_PERMISSIONS.DRIVER_DASHBOARD;

    const staffLink = await prisma.merchantUser.findFirst({
      where: {
        merchantId: authContext.merchantId,
        userId: staffUserId,
        role: 'STAFF',
        invitationStatus: 'ACCEPTED',
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!staffLink) {
      throw new ValidationError('Eligible staff member not found (must be accepted and active)', ERROR_CODES.NOT_FOUND);
    }

    if (staffLink.user.role === 'MERCHANT_OWNER') {
      throw new ValidationError('Owner cannot be assigned as a driver', ERROR_CODES.FORBIDDEN);
    }

    const updated = await prisma.merchantUser.update({
      where: { id: staffLink.id },
      data: {
        permissions: Array.from(new Set([...(staffLink.permissions ?? []), driverPermission])),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt({
          ...updated.user,
          isActive: updated.isActive && (updated.permissions ?? []).includes(driverPermission),
          joinedAt: updated.createdAt,
          source: 'staff',
        }),
        message: 'Driver access granted successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating merchant driver:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errorCode || 'VALIDATION_ERROR',
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
        message: 'Failed to grant driver access',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
