/**
 * PUT /api/merchant/staff/:id
 * Update staff details
 * 
 * DELETE /api/merchant/staff/:id
 * Remove staff from merchant (soft delete user)
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withMerchantOwner } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import { validateEmail } from '@/lib/utils/validators';
import { NotFoundError, ERROR_CODES } from '@/lib/constants/errors';

/**
 * PUT handler - Update staff
 */
async function updateStaffHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const staffId = BigInt(params.id);
  const body = await request.json();

  // Validate staff exists
  const staff = await userRepository.findById(staffId);
  if (!staff || staff.role !== 'MERCHANT_STAFF') {
    throw new NotFoundError('Staff not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Validate email if provided
  if (body.email) {
    validateEmail(body.email);
  }

  // Update staff
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const updated = await userRepository.update(staffId, updateData);

  return successResponse({ staff: updated }, 'Staff updated successfully', 200);
}

/**
 * DELETE handler - Remove staff
 */
async function deleteStaffHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = authContext.merchantId!;
  const staffId = BigInt(params.id);

  // Validate staff exists
  const staff = await userRepository.findById(staffId);
  if (!staff || staff.role !== 'MERCHANT_STAFF') {
    throw new NotFoundError('Staff not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Remove staff from merchant
  await merchantService.removeStaff(merchantId, staffId);

  // Soft delete user (set isActive = false)
  await userRepository.update(staffId, { isActive: false });

  return successResponse(null, 'Staff removed successfully', 200);
}

export const PUT = withMerchantOwner(updateStaffHandler);
export const DELETE = withMerchantOwner(deleteStaffHandler);
