/**
 * GET /api/admin/users/:id
 * Get user details
 * 
 * PUT /api/admin/users/:id
 * Update user details
 * 
 * DELETE /api/admin/users/:id
 * Delete user (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import { validateEmail } from '@/lib/utils/validators';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { NotFoundError, ERROR_CODES, ValidationError } from '@/lib/constants/errors';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import authService from '@/lib/services/AuthService';
import emailService from '@/lib/services/EmailService';

/**
 * GET handler - Get user by ID
 */
async function getUserHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const userIdResult = await requireBigIntRouteParam(context, 'id');
  if (!userIdResult.ok) {
    return NextResponse.json(userIdResult.body, { status: userIdResult.status });
  }
  const userId = userIdResult.value;

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  return successResponse({ user }, 'User retrieved successfully', 200);
}

/**
 * PUT handler - Update user
 */
async function updateUserHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const userIdResult = await requireBigIntRouteParam(context, 'id');
  if (!userIdResult.ok) {
    return NextResponse.json(userIdResult.body, { status: userIdResult.status });
  }
  const userId = userIdResult.value;
  const body = await request.json();

  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Validate email if provided
  if (body.email) {
    validateEmail(body.email);
  }

  // Prevent role escalation paths (staff/driver -> owner)
  if (body.role === 'MERCHANT_OWNER' && (user.role === 'MERCHANT_STAFF' || user.role === 'DELIVERY')) {
    throw new ValidationError(
      'Cannot promote this account to MERCHANT_OWNER',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Update user basic fields
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  // Hash password if provided
  if (body.password) {
    updateData.passwordHash = await hashPassword(body.password);
  }

  const wasActive = user.isActive;
  const updated = await userRepository.update(userId, updateData);

  // If super admin deactivated this user, revoke sessions + notify.
  if (wasActive && body.isActive === false) {
    await authService.logoutAll(userId);
    await emailService.sendUserDeactivatedByAdmin({
      to: updated.email,
      name: updated.name,
      email: updated.email,
      locale: 'id',
    });
  }

  // Update merchant link if role changed or merchantId changed
  if (body.merchantId !== undefined || body.role !== undefined) {
    const targetRole = body.role || user.role;
    const requiresMerchant = targetRole === 'MERCHANT_OWNER' || targetRole === 'MERCHANT_STAFF';

    const existingMerchantUser = await prisma.merchantUser.findFirst({
      where: { userId },
      select: { merchantId: true },
    });

    const nextMerchantId = body.merchantId
      ? BigInt(body.merchantId)
      : existingMerchantUser?.merchantId;

    if (requiresMerchant && !nextMerchantId) {
      throw new ValidationError('merchantId is required for merchant roles', ERROR_CODES.VALIDATION_ERROR);
    }

    // Remove existing merchant links
    await prisma.merchantUser.deleteMany({
      where: { userId },
    });

    // Add new merchant link if required
    if (requiresMerchant && nextMerchantId) {
      const merchantRole = targetRole === 'MERCHANT_OWNER' ? 'OWNER' : 'STAFF';
      await merchantService.addStaff(nextMerchantId, userId, merchantRole);
    }
  }

  return successResponse({ user: updated }, 'User updated successfully', 200);
}

/**
 * DELETE handler - Delete user
 */
async function deleteUserHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const userIdResult = await requireBigIntRouteParam(context, 'id');
  if (!userIdResult.ok) {
    return NextResponse.json(userIdResult.body, { status: userIdResult.status });
  }
  const userId = userIdResult.value;

  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Soft delete user (set isActive = false)
  const updated = await userRepository.update(userId, { isActive: false });

  // Revoke all sessions + notify
  await authService.logoutAll(userId);
  await emailService.sendUserDeactivatedByAdmin({
    to: updated.email,
    name: updated.name,
    email: updated.email,
    locale: 'id',
  });

  return successResponse(null, 'User deleted successfully', 200);
}

export const GET = withSuperAdmin(getUserHandler);
export const PUT = withSuperAdmin(updateUserHandler);
export const DELETE = withSuperAdmin(deleteUserHandler);
