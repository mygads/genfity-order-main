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

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import { validateEmail } from '@/lib/utils/validators';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import prisma from '@/lib/db/client';

/**
 * GET handler - Get user by ID
 */
async function getUserHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const userId = BigInt(params.id);

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
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const userId = BigInt(params.id);
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

  const updated = await userRepository.update(userId, updateData);

  // Update merchant link if role changed or merchantId changed
  if (body.merchantId !== undefined || body.role !== undefined) {
    const targetRole = body.role || user.role;
    const requiresMerchant = targetRole === 'MERCHANT_OWNER' || targetRole === 'MERCHANT_STAFF';

    // Remove existing merchant links
    await prisma.merchantUser.deleteMany({
      where: { userId },
    });

    // Add new merchant link if required
    if (requiresMerchant && body.merchantId) {
      const merchantRole = targetRole === 'MERCHANT_OWNER' ? 'OWNER' : 'STAFF';
      await merchantService.addStaff(BigInt(body.merchantId), userId, merchantRole);
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
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const userId = BigInt(params.id);

  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Soft delete user (set isActive = false)
  await userRepository.update(userId, { isActive: false });

  return successResponse(null, 'User deleted successfully', 200);
}

export const GET = withSuperAdmin(getUserHandler);
export const PUT = withSuperAdmin(updateUserHandler);
export const DELETE = withSuperAdmin(deleteUserHandler);
