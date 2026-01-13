/**
 * API Route: Assign Staff to Merchant
 * PUT /api/admin/merchants/:id/assign-staff
 * Access: SUPER_ADMIN only
 * 
 * Assigns a user with MERCHANT_STAFF role to a merchant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { ValidationError, ConflictError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function assignStaffHandler(
  request: NextRequest,
  _authContext: AuthContext,
  context: RouteContext
) {
  const merchantIdResult = await requireBigIntRouteParam(context, 'id');
  if (!merchantIdResult.ok) {
    return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
  }
  const merchantId = merchantIdResult.value;

  // Parse request body
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const userIdBigInt = BigInt(userId);

  // Verify merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true },
  });

  if (!merchant) {
    throw new NotFoundError('Merchant not found', ERROR_CODES.MERCHANT_NOT_FOUND);
  }

  // Verify user exists and has MERCHANT_STAFF role
  const user = await prisma.user.findUnique({
    where: { id: userIdBigInt },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true,
      merchantUsers: {
        include: {
          merchant: {
            select: { name: true }
          }
        }
      }
    },
  });

  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Validate user role is MERCHANT_STAFF
  if (user.role !== 'MERCHANT_STAFF') {
    throw new ValidationError(
      `User must have MERCHANT_STAFF role. Current role: ${user.role}`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }

  // Check if user is already bound to another merchant
  if (user.merchantUsers && user.merchantUsers.length > 0) {
    const boundMerchant = user.merchantUsers[0].merchant.name;
    throw new ConflictError(
      `User is already assigned to merchant: ${boundMerchant}`
    );
  }

  // Use Prisma transaction to assign staff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prisma.$transaction(async (tx: any) => {
    // Create merchant-user link with STAFF role
    await tx.merchantUser.create({
      data: {
        merchantId,
        userId: userIdBigInt,
        role: 'STAFF',
      },
    });

    // Get updated merchant with staff list
    const updatedMerchant = await tx.merchant.findUnique({
      where: { id: merchantId },
      include: {
        merchantUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return updatedMerchant;
  });

  return successResponse(
    {
      merchant: result,
      assignedUser: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    'Staff assigned successfully',
    200
  );
}

export const PUT = withSuperAdmin(assignStaffHandler);
