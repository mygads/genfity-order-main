/**
 * PUT /api/merchant/staff/:id
 * Update staff details
 * 
 * DELETE /api/merchant/staff/:id
 * Remove staff from merchant (soft delete user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import authService from '@/lib/services/AuthService';
import emailService from '@/lib/services/EmailService';
import userNotificationService from '@/lib/services/UserNotificationService';
import { validatePassword } from '@/lib/utils/validators';
import { NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import prisma from '@/lib/db/client';
import { hashPassword } from '@/lib/utils/passwordHasher';

/**
 * PUT handler - Update staff
 */
async function updateStaffHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const staffIdResult = await requireBigIntRouteParam(context, 'id');
  if (!staffIdResult.ok) {
    return NextResponse.json(staffIdResult.body, { status: staffIdResult.status });
  }
  const staffId = staffIdResult.value;
  const body = await request.json();

  const merchantId = authContext.merchantId!;

  // Must exist in this merchant AND must be accepted
  const merchantUser = await prisma.merchantUser.findUnique({
    where: {
      merchantId_userId: {
        merchantId,
        userId: staffId,
      },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      merchant: {
        select: { id: true, name: true, country: true },
      },
    },
  });

  if (!merchantUser || merchantUser.role !== 'STAFF') {
    throw new NotFoundError('Staff not found', ERROR_CODES.USER_NOT_FOUND);
  }

  if (merchantUser.invitationStatus !== 'ACCEPTED') {
    return NextResponse.json(
      { success: false, message: 'Staff invitation must be accepted before editing', error: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // Validate staff exists
  const staff = await userRepository.findById(staffId);
  if (!staff || staff.role !== 'MERCHANT_STAFF') {
    throw new NotFoundError('Staff not found', ERROR_CODES.USER_NOT_FOUND);
  }

  const name: string | undefined = body.name;
  const phone: string | undefined = body.phone;
  const newPassword: string | undefined = body.newPassword;

  if (name === undefined && phone === undefined && newPassword === undefined) {
    return NextResponse.json(
      { success: false, message: 'No changes provided', error: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (newPassword !== undefined) {
    validatePassword(newPassword);
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone || null;
  if (newPassword) {
    updateData.passwordHash = await hashPassword(newPassword);
    updateData.mustChangePassword = false;
  }

  const updated = await userRepository.update(staffId, updateData as any);

  const staffPref = await prisma.userPreference.findUnique({
    where: { userId: staffId },
    select: { language: true },
  });
  const locale = staffPref?.language === 'id' ? 'id' : 'en';

  // In-app notification for staff dashboard
  userNotificationService
    .createForUser({
      userId: staffId,
      merchantId,
      category: 'STAFF',
      title: locale === 'id' ? 'Akun diperbarui' : 'Account updated',
      message:
        locale === 'id'
          ? (newPassword
              ? `Detail akun dan kata sandi Anda telah diperbarui oleh ${merchantUser.merchant.name}.`
              : `Detail akun Anda telah diperbarui oleh ${merchantUser.merchant.name}.`)
          : (newPassword
              ? `Your account details and password were updated by ${merchantUser.merchant.name}.`
              : `Your account details were updated by ${merchantUser.merchant.name}.`),
      actionUrl: '/admin/dashboard/profile',
      metadata: {
        updatedFields: {
          name: name !== undefined,
          phone: phone !== undefined,
          password: Boolean(newPassword),
        },
      },
    })
    .catch((err) => console.error('Failed to create staff update notification:', err));

  // Email only when password changed
  if (newPassword) {
    emailService
      .sendPasswordChanged({
        to: merchantUser.user.email,
        name: merchantUser.user.name || 'Staff',
        email: merchantUser.user.email,
        merchantCountry: merchantUser.merchant.country,
        changedByLabel: 'merchant owner',
        merchantName: merchantUser.merchant.name,
        locale,
      })
      .catch((err) => console.error('Failed to send password changed email:', err));
  }

  return successResponse({ staff: updated }, 'Staff updated successfully', 200);
}

/**
 * DELETE handler - Remove staff
 */
async function deleteStaffHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const merchantId = authContext.merchantId!;
  const staffIdResult = await requireBigIntRouteParam(context, 'id');
  if (!staffIdResult.ok) {
    return NextResponse.json(staffIdResult.body, { status: staffIdResult.status });
  }
  const staffId = staffIdResult.value;

  // Validate staff exists
  const staff = await userRepository.findById(staffId);
  if (!staff || staff.role !== 'MERCHANT_STAFF') {
    throw new NotFoundError('Staff not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Remove staff from merchant
  await merchantService.removeStaff(merchantId, staffId);

  // Force logout from all devices
  await authService.logoutAll(staffId);

  // Notify staff via email
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { name: true, code: true, country: true },
  });

  if (merchant) {
    emailService
      .sendMerchantAccessRemoved({
        to: staff.email,
        name: staff.name || 'Staff',
        email: staff.email,
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

export const PUT = withMerchantOwner(updateStaffHandler);
export const DELETE = withMerchantOwner(deleteStaffHandler);
