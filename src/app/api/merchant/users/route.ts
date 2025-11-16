/**
 * Merchant Users API
 * GET /api/merchant/users - Get users associated with merchant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/users
 * Get all users (owners and staff) associated with the merchant
 */
async function handleGet(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });
    
    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get all users associated with this merchant
    const merchantUsers = await prisma.merchantUser.findMany({
      where: { merchantId: merchantUser.merchantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    const users = merchantUsers.map(mu => mu.user);

    return NextResponse.json({
      success: true,
      data: { users: serializeBigInt(users) },
      message: 'Users retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant users:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve users',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
