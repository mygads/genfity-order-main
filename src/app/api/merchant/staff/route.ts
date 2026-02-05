/**
 * GET /api/merchant/staff
 * Get all staff for merchant owner's merchant
 * 
 * POST /api/merchant/staff
 * Create new staff account and link to merchant
 * 
 * DELETE /api/merchant/staff?userId=123
 * Remove staff from merchant
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withMerchantOwner } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import emailService from '@/lib/services/EmailService';
import authService from '@/lib/services/AuthService';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ERROR_CODES, ValidationError } from '@/lib/constants/errors';
import prisma from '@/lib/db/client';

/**
 * GET handler - Get all staff for merchant with search
 */
async function getStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  // Get all staff for this merchant
  const staffMembers = await prisma.merchantUser.findMany({
    where: {
      merchantId: BigInt(merchantId),
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Sort staff: MERCHANT_OWNER always at the top
  const staff = staffMembers
    .map((ms) => ({
      id: ms.id.toString(),
      userId: ms.userId.toString(),
      name: ms.user.name,
      email: ms.user.email,
      phone: ms.user.phone,
      role: ms.user.role,
      isActive: ms.isActive, // Use MerchantUser.isActive, not User.isActive
      joinedAt: ms.createdAt.toISOString(),
      permissions: ms.permissions, // Include permissions
      invitationStatus: ms.invitationStatus,
      invitedAt: ms.invitedAt ? ms.invitedAt.toISOString() : null,
      acceptedAt: ms.acceptedAt ? ms.acceptedAt.toISOString() : null,
    }))
    .sort((a, b) => {
      // MERCHANT_OWNER always first
      if (a.role === 'MERCHANT_OWNER' && b.role !== 'MERCHANT_OWNER') return -1;
      if (a.role !== 'MERCHANT_OWNER' && b.role === 'MERCHANT_OWNER') return 1;
      // Otherwise keep original order
      return 0;
    });

  return successResponse({ staff }, 'Staff retrieved successfully', 200);
}

/**
 * POST handler - Create new staff
 */
async function createStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;
  const body = await request.json();

  // Validate inputs
  validateRequired(body.name, 'Staff name');
  validateRequired(body.email, 'Staff email');
  validateRequired(body.password, 'Password');
  validateEmail(body.email);

  // Check email uniqueness
  const emailExists = await userRepository.emailExists(body.email);
  if (emailExists) {
    throw new ConflictError(
      'Email already registered',
      ERROR_CODES.EMAIL_ALREADY_EXISTS
    );
  }

  // Get merchant info for email
  const merchant = await prisma.merchant.findUnique({
    where: { id: BigInt(merchantId) },
    select: { name: true, code: true, country: true },
  });

  if (!merchant) {
    throw new ValidationError('Merchant not found', ERROR_CODES.NOT_FOUND);
  }

  // Hash password provided by merchant owner
  const hashedPassword = await hashPassword(body.password);

  // Create staff user
  const staff = await userRepository.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    passwordHash: hashedPassword,
    role: 'MERCHANT_STAFF',
    isActive: true,
    mustChangePassword: false, // No need to change password
  });

  // Link staff to merchant
  await merchantService.addStaff(merchantId, staff.id, 'STAFF');

  // Send welcome email to staff
  try {
    await emailService.sendStaffWelcome({
      to: body.email,
      name: body.name,
      email: body.email,
      password: body.password, // Send plain password in email
      merchantName: merchant.name,
      merchantCode: merchant.code,
      merchantCountry: merchant.country,
    });
    console.log('✅ Staff welcome email sent to:', body.email);
  } catch (emailError) {
    console.error('❌ Failed to send staff welcome email:', emailError);
    // Don't fail the request if email fails
  }

  return successResponse(
    { staff },
    'Staff created successfully',
    201
  );
}

/**
 * DELETE handler - Remove staff from merchant
 */
async function deleteStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;
  const { searchParams } = new URL(request.url);
  const userIdToRemove = searchParams.get('userId');

  if (!userIdToRemove) {
    throw new ValidationError('User ID required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!/^\d+$/.test(userIdToRemove)) {
    throw new ValidationError('Invalid userId', ERROR_CODES.VALIDATION_ERROR);
  }

  const userIdToRemoveBigInt = BigInt(userIdToRemove);

  // Prevent owner from removing themselves
  if (userIdToRemoveBigInt === authContext.userId) {
    throw new ValidationError('Cannot remove yourself', ERROR_CODES.VALIDATION_ERROR);
  }

  // Check if user is staff of this merchant
  const staffToRemove = await prisma.merchantUser.findFirst({
    where: {
      userId: userIdToRemoveBigInt,
      merchantId,
    },
    include: {
      user: true,
    },
  });

  if (!staffToRemove) {
    throw new ValidationError('Staff member not found', ERROR_CODES.NOT_FOUND);
  }

  // Prevent removing another owner
  if (staffToRemove.user.role === 'MERCHANT_OWNER') {
    throw new ValidationError('Cannot remove another owner', ERROR_CODES.VALIDATION_ERROR);
  }

  // Remove staff - only delete the relation, not the user
  await prisma.merchantUser.delete({
    where: { id: staffToRemove.id },
  });

  // Force logout from all devices
  await authService.logoutAll(userIdToRemoveBigInt);

  // Notify staff via email
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { name: true, code: true, country: true },
  });

  if (merchant && staffToRemove.user.email) {
    emailService
      .sendMerchantAccessRemoved({
        to: staffToRemove.user.email,
        name: staffToRemove.user.name || 'Staff',
        email: staffToRemove.user.email,
        merchantName: merchant.name,
        merchantCode: merchant.code,
        merchantCountry: merchant.country,
      })
      .catch((err) => {
        console.error('Failed to send merchant access removed email:', err);
      });
  }

  return successResponse(null, 'Staff removed successfully', 200);
}

export const GET = withMerchantOwner(getStaffHandler);
export const POST = withMerchantOwner(createStaffHandler);
export const DELETE = withMerchantOwner(deleteStaffHandler);
