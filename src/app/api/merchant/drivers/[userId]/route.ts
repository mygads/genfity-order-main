import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ERROR_CODES, ValidationError } from '@/lib/constants/errors';

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

    const params = await routeContext.params;
    const userIdParam = params?.userId;

    if (!userIdParam) {
      throw new ValidationError('User ID is required', ERROR_CODES.VALIDATION_ERROR);
    }

    const userId = BigInt(userIdParam);
    const body = await req.json();

    if (typeof body.isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean', ERROR_CODES.VALIDATION_ERROR);
    }

    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        merchantId: authContext.merchantId,
        userId,
        role: 'DRIVER',
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

    const updated = await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: { isActive: body.isActive },
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
        isActive: updated.isActive,
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
