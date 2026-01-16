import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ERROR_CODES, ValidationError } from '@/lib/constants/errors';
import { getBigIntRouteParam } from '@/lib/utils/routeContext';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';

/**
 * PATCH /api/merchant/drivers/:userId
 * Update driver active status for this merchant.
 *
 * Body:
 * - isActive: boolean (required)
 *
 * @access MERCHANT_OWNER only
 */
export const PATCH = withMerchantOwner(async (req: NextRequest, authContext: AuthContext, routeContext) => {
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

    const userId = await getBigIntRouteParam(routeContext, 'userId');
    if (!userId) throw new ValidationError('User ID is required', ERROR_CODES.VALIDATION_ERROR);
    const body = await req.json();

    if (typeof body.isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean', ERROR_CODES.VALIDATION_ERROR);
    }

    const driverPermission = STAFF_PERMISSIONS.DRIVER_DASHBOARD;

    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        merchantId: authContext.merchantId,
        userId,
        OR: [
          { role: 'OWNER' },
          { role: 'DRIVER' },
          { role: 'STAFF', permissions: { has: driverPermission } },
        ],
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

    if (!merchantUser) {
      throw new ValidationError('Driver not found', ERROR_CODES.NOT_FOUND);
    }

    if (merchantUser.role === 'OWNER') {
      throw new ValidationError('Owner driver status cannot be changed', ERROR_CODES.FORBIDDEN);
    }

    // New model: drivers are STAFF with `driver_dashboard` permission.
    // Toggling driver status should NOT deactivate the whole staff account.
    // Legacy model: role DRIVER uses isActive.
    const updated = await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data:
        merchantUser.role === 'DRIVER'
          ? { isActive: body.isActive }
          : {
              permissions: body.isActive
                ? Array.from(new Set([...(merchantUser.permissions ?? []), driverPermission]))
                : (merchantUser.permissions ?? []).filter((p) => p !== driverPermission),
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

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...updated.user,
        isActive:
          updated.role === 'DRIVER'
            ? updated.isActive
            : updated.isActive && (updated.permissions ?? []).includes(driverPermission),
        joinedAt: updated.createdAt,
      }),
      message: 'Driver status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating driver status:', error);

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
        message: 'Failed to update driver status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/merchant/drivers/:userId
 * Remove driver access for this merchant.
 *
 * New model: remove `driver_dashboard` permission from STAFF.
 * Legacy model: deactivate DRIVER link.
 *
 * @access MERCHANT_OWNER only
 */
export const DELETE = withMerchantOwner(async (_req: NextRequest, authContext: AuthContext, routeContext) => {
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

    const userId = await getBigIntRouteParam(routeContext, 'userId');
    if (!userId) throw new ValidationError('User ID is required', ERROR_CODES.VALIDATION_ERROR);

    const driverPermission = STAFF_PERMISSIONS.DRIVER_DASHBOARD;

    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        merchantId: authContext.merchantId,
        userId,
        OR: [
          { role: 'OWNER' },
          { role: 'DRIVER' },
          { role: 'STAFF', permissions: { has: driverPermission } },
        ],
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

    if (!merchantUser) {
      throw new ValidationError('Driver not found', ERROR_CODES.NOT_FOUND);
    }

    if (merchantUser.role === 'OWNER') {
      throw new ValidationError('Owner cannot be removed from drivers', ERROR_CODES.FORBIDDEN);
    }

    const updated = await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data:
        merchantUser.role === 'DRIVER'
          ? { isActive: false }
          : {
              permissions: (merchantUser.permissions ?? []).filter((p) => p !== driverPermission),
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

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...updated.user,
        isActive:
          updated.role === 'DRIVER'
            ? updated.isActive
            : updated.isActive && (updated.permissions ?? []).includes(driverPermission),
        joinedAt: updated.createdAt,
      }),
      message: 'Driver access removed successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error removing driver access:', error);

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
        message: 'Failed to remove driver access',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
