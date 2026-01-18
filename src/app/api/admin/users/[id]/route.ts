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
import { Prisma } from '@prisma/client';

const SYSTEM_USER_EMAIL = 'system@genfity.com';

async function getOrCreateSystemUser(tx: Prisma.TransactionClient): Promise<{ id: bigint; email: string }> {
  const existing = await tx.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true, email: true },
  });
  if (existing) return existing;

  const passwordHash = await hashPassword('change-me-system-password');
  const created = await tx.user.create({
    data: {
      name: 'System',
      email: SYSTEM_USER_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: false,
      mustChangePassword: false,
    },
    select: { id: true, email: true },
  });
  return created;
}

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

  // Prevent deleting the system account used for reassignment.
  if (user.email === SYSTEM_USER_EMAIL) {
    throw new ValidationError('You cannot delete the system account', ERROR_CODES.VALIDATION_ERROR);
  }

  // Prevent deleting self
  if (authContext.userId === userId) {
    throw new ValidationError('You cannot delete your own account', ERROR_CODES.VALIDATION_ERROR);
  }

  // Prevent deleting the last active SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN' && user.isActive) {
    const otherActiveSuperAdmins = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN',
        isActive: true,
        id: { not: userId },
      },
    });

    if (otherActiveSuperAdmins === 0) {
      throw new ValidationError('You cannot delete the last active Super Admin', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const systemUser = await getOrCreateSystemUser(tx);

    // Reassign non-nullable ownership/audit links that must keep a valid User.
    const stockPhotosReassigned = await tx.stockPhoto.updateMany({
      where: { uploadedByUserId: userId },
      data: { uploadedByUserId: systemUser.id },
    });
    const influencerApprovalLogsReassigned = await tx.influencerApprovalLog.updateMany({
      where: { actedByUserId: userId },
      data: { actedByUserId: systemUser.id },
    });

    // Revoke all sessions first
    await tx.userSession.deleteMany({ where: { userId } });

    // Detach optional references
    await tx.payment.updateMany({
      where: { paidByUserId: userId },
      data: { paidByUserId: null },
    });
    await tx.order.updateMany({
      where: { deliveryDriverUserId: userId },
      data: { deliveryDriverUserId: null },
    });
    await tx.orderDiscount.updateMany({
      where: { appliedByUserId: userId },
      data: { appliedByUserId: null },
    });

    // Clear audit trail references (optional FK fields)
    await tx.menuCategory.updateMany({ where: { createdByUserId: userId }, data: { createdByUserId: null } });
    await tx.menuCategory.updateMany({ where: { updatedByUserId: userId }, data: { updatedByUserId: null } });
    await tx.menuCategory.updateMany({ where: { deletedByUserId: userId }, data: { deletedByUserId: null } });
    await tx.menuCategory.updateMany({ where: { restoredByUserId: userId }, data: { restoredByUserId: null } });

    await tx.menu.updateMany({ where: { createdByUserId: userId }, data: { createdByUserId: null } });
    await tx.menu.updateMany({ where: { updatedByUserId: userId }, data: { updatedByUserId: null } });
    await tx.menu.updateMany({ where: { deletedByUserId: userId }, data: { deletedByUserId: null } });
    await tx.menu.updateMany({ where: { restoredByUserId: userId }, data: { restoredByUserId: null } });

    await tx.addonCategory.updateMany({ where: { createdByUserId: userId }, data: { createdByUserId: null } });
    await tx.addonCategory.updateMany({ where: { updatedByUserId: userId }, data: { updatedByUserId: null } });
    await tx.addonCategory.updateMany({ where: { deletedByUserId: userId }, data: { deletedByUserId: null } });
    await tx.addonCategory.updateMany({ where: { restoredByUserId: userId }, data: { restoredByUserId: null } });

    await tx.addonItem.updateMany({ where: { createdByUserId: userId }, data: { createdByUserId: null } });
    await tx.addonItem.updateMany({ where: { updatedByUserId: userId }, data: { updatedByUserId: null } });
    await tx.addonItem.updateMany({ where: { deletedByUserId: userId }, data: { deletedByUserId: null } });
    await tx.addonItem.updateMany({ where: { restoredByUserId: userId }, data: { restoredByUserId: null } });

    // Clean up other direct relations
    await tx.merchantUser.deleteMany({ where: { userId } });
    await tx.userNotification.deleteMany({ where: { userId } });
    await tx.notificationRetryQueue.deleteMany({ where: { userId } });
    await tx.userPreference.deleteMany({ where: { userId } });

    // Finally delete user record
    await tx.user.delete({ where: { id: userId } });

    const totalReassigned =
      stockPhotosReassigned.count + influencerApprovalLogsReassigned.count;

    return {
      systemUserEmail: systemUser.email,
      reassigned: {
        stockPhotos: stockPhotosReassigned.count,
        influencerApprovalLogs: influencerApprovalLogsReassigned.count,
        total: totalReassigned,
      },
    };
  });

  return successResponse(
    {
      reassigned: result.reassigned,
      systemUserEmail: result.systemUserEmail,
    },
    'User deleted successfully',
    200
  );
}

export const GET = withSuperAdmin(getUserHandler);
export const PUT = withSuperAdmin(updateUserHandler);
export const DELETE = withSuperAdmin(deleteUserHandler);
