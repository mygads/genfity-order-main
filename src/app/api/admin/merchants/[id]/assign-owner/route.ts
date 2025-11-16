/**
 * API Route: Assign Owner to Merchant
 * PUT /api/admin/merchants/:id/assign-owner
 * Access: SUPER_ADMIN only
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { 
  ValidationError, 
  NotFoundError,
  ERROR_CODES 
} from '@/lib/constants/errors';

/**
 * Assign a user as merchant owner
 */
async function assignOwnerHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = BigInt(params.id);

  // Parse request body
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const userIdBigInt = BigInt(userId);

  // Verify merchant exists using Prisma
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true },
  });

  if (!merchant) {
    throw new NotFoundError('Merchant not found', ERROR_CODES.MERCHANT_NOT_FOUND);
  }

  // Verify user exists using Prisma
  const user = await prisma.user.findUnique({
    where: { id: userIdBigInt },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Check if user is already a merchant owner or staff
  if (user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_STAFF') {
    throw new ValidationError('User is already assigned to a merchant');
  }

  // Check if user already has merchant link
  const existingLink = await prisma.merchantUser.findFirst({
    where: { userId: userIdBigInt },
  });

  if (existingLink) {
    throw new ValidationError('User is already linked to a merchant');
  }

  // Use Prisma transaction for atomicity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prisma.$transaction(async (tx: any) => {
    // Update user role to MERCHANT_OWNER
    const updatedUser = await tx.user.update({
      where: { id: userIdBigInt },
      data: { role: 'MERCHANT_OWNER' },
      select: { id: true, name: true, email: true, role: true },
    });

    // Create merchant-user link
    await tx.merchantUser.create({
      data: {
        merchantId,
        userId: userIdBigInt,
        role: 'OWNER',
      },
    });

    return updatedUser;
  });

  return successResponse(
    {
      id: result.id.toString(),
      name: result.name,
      email: result.email,
      role: result.role,
    },
    'Owner assigned successfully',
    200
  );
}

export const PUT = withSuperAdmin(assignOwnerHandler);

