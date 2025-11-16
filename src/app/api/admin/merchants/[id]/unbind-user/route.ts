/**
 * API Route: Unbind User from Merchant
 * PUT /api/admin/merchants/:id/unbind-user
 * Access: SUPER_ADMIN only
 * 
 * Removes user's merchant assignment WITHOUT changing their role
 * User keeps their original role (MERCHANT_OWNER, MERCHANT_STAFF, etc.)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { ValidationError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';

async function unbindUserHandler(
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

  // Verify user is linked to the merchant using Prisma
  const merchantUserLink = await prisma.merchantUser.findFirst({
    where: {
      merchantId,
      userId: userIdBigInt,
    },
  });

  if (!merchantUserLink) {
    throw new ValidationError('User is not linked to this merchant');
  }

  // Use Prisma transaction for atomicity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prisma.$transaction(async (tx: any) => {
    // Delete merchant-user link
    await tx.merchantUser.deleteMany({
      where: {
        merchantId,
        userId: userIdBigInt,
      },
    });

    // Get user data (DO NOT change role - keep it as is)
    const updatedUser = await tx.user.findUnique({
      where: { id: userIdBigInt },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!updatedUser) {
      throw new NotFoundError('User not found after unbind');
    }

    return updatedUser;
  });

  return successResponse(
    {
      id: result.id.toString(),
      name: result.name,
      email: result.email,
      role: result.role,
    },
    'User unbound successfully. Role remains unchanged.',
    200
  );
}

export const PUT = withSuperAdmin(unbindUserHandler);
