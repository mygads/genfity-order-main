import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import emailService from '@/lib/services/EmailService';
import { withMerchantOwner } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { successResponse } from '@/lib/middleware/errorHandler';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ValidationError, ERROR_CODES } from '@/lib/constants/errors';

const prisma = new PrismaClient();

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

  // Check if user is SUPER_ADMIN or CUSTOMER
  if (existingUser.role === 'SUPER_ADMIN' || existingUser.role === 'CUSTOMER') {
    throw new ValidationError('Cannot add this user as staff', ERROR_CODES.VALIDATION_ERROR);
  }

  // Add existing user as staff
  await prisma.merchantUser.create({
    data: {
      userId: existingUser.id,
      merchantId: BigInt(merchantId),
    },
  });

  // Send notification email
  try {
    await emailService.sendPasswordNotification({
      to: existingUser.email,
      name: existingUser.name,
      email: existingUser.email,
      tempPassword: `You've been invited to join ${merchant.name} team on GENFITY`,
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
