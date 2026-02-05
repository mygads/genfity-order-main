import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import emailService from '@/lib/services/EmailService';
import { withMerchantOwner } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { successResponse } from '@/lib/middleware/errorHandler';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import crypto from 'crypto';

/**
 * POST /api/merchant/staff/invite
 * Invite an existing registered user to join as staff
 * 
 * Request body:
 * - email: string (required)
 * 
 * @access MERCHANT_OWNER only
 */
async function inviteStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;
  const body = await request.json();
  const { email } = body;

  // Validate email
  validateRequired(email, 'Email');
  validateEmail(email);

  // Get merchant details
  const merchant = await prisma.merchant.findUnique({
    where: { id: BigInt(merchantId) },
  });

  if (!merchant) {
    throw new ValidationError('Merchant not found', ERROR_CODES.NOT_FOUND);
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      merchantUsers: {
        where: {
          merchantId: BigInt(merchantId),
        },
      },
    },
  });

  if (!existingUser) {
    throw new ValidationError('Email not registered. User must register first before being invited.', ERROR_CODES.NOT_FOUND);
  }

  // Check if already staff of this merchant
  if (existingUser.merchantUsers.length > 0) {
    throw new ConflictError('User is already a staff member', ERROR_CODES.EMAIL_ALREADY_EXISTS);
  }

  // Check if user is SUPER_ADMIN (cannot be added as staff)
  // Note: CUSTOMER role no longer exists in User table (customers are in separate table)
  if (existingUser.role === 'SUPER_ADMIN') {
    throw new ValidationError('Cannot add this user as staff', ERROR_CODES.VALIDATION_ERROR);
  }

  // Staff accounts must not be linked to multiple merchants
  if (existingUser.role === 'MERCHANT_STAFF') {
    const existingStaffLinks = await prisma.merchantUser.findMany({
      where: {
        userId: existingUser.id,
        isActive: true,
        role: { in: ['OWNER', 'STAFF'] },
        merchant: { isActive: true },
      },
      select: {
        merchantId: true,
      },
    });

    const hasOtherMerchant = existingStaffLinks.some((mu) => mu.merchantId !== BigInt(merchantId));
    if (hasOtherMerchant) {
      throw new ValidationError(
        'This staff account is already linked to another merchant. Staff accounts must have exactly one merchant.',
        ERROR_CODES.FORBIDDEN
      );
    }
  }

  // Add existing user as staff
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.merchantUser.create({
    data: {
      userId: existingUser.id,
      merchantId: BigInt(merchantId),
      role: 'STAFF',
      isActive: true,
      invitationStatus: 'WAITING',
      invitedAt: new Date(),
      inviteToken,
      inviteTokenExpiresAt,
    },
  });

  // Send notification email
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://genfity.com';
    const acceptUrl = `${baseUrl}/staff/accept?token=${inviteToken}`;

    await emailService.sendStaffInvite({
      to: existingUser.email,
      name: existingUser.name,
      email: existingUser.email,
      merchantName: merchant.name,
      merchantCode: merchant.code,
      acceptUrl,
      merchantCountry: merchant.country,
    });
  } catch (emailError) {
    console.error('Failed to send notification email:', emailError);
  }

  return successResponse(
    {
      userId: existingUser.id.toString(),
      email: existingUser.email,
      name: existingUser.name,
    },
    'Staff invitation sent successfully',
    200
  );
}

export const POST = withMerchantOwner(inviteStaffHandler);
