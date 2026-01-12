import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import emailService from '@/lib/services/EmailService';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ERROR_CODES, ValidationError } from '@/lib/constants/errors';

/**
 * POST /api/merchant/drivers/invite
 * Invite an existing registered DELIVERY user to join as a driver for this merchant.
 *
 * Request body:
 * - email: string (required)
 *
 * @access MERCHANT_OWNER only
 */
export const POST = withMerchantOwner(async (request: NextRequest, authContext: AuthContext) => {
  try {
    if (!authContext.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const email = String(body.email || '').toLowerCase();

    validateRequired(email, 'Email');
    validateEmail(email);

    const merchant = await prisma.merchant.findUnique({
      where: { id: authContext.merchantId },
      select: { name: true, country: true },
    });

    if (!merchant) {
      throw new ValidationError('Merchant not found', ERROR_CODES.NOT_FOUND);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        merchantUsers: {
          where: {
            merchantId: authContext.merchantId,
          },
        },
      },
    });

    if (!existingUser) {
      throw new ValidationError(
        'Email not registered. Create a driver account instead.',
        ERROR_CODES.NOT_FOUND
      );
    }

    if (existingUser.role !== 'DELIVERY') {
      throw new ValidationError(
        'This user is not a DELIVERY account. Create a driver account instead.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (existingUser.merchantUsers.length > 0) {
      throw new ConflictError('User is already linked to this merchant', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    await prisma.merchantUser.create({
      data: {
        userId: existingUser.id,
        merchantId: authContext.merchantId,
        role: 'DRIVER',
        isActive: true,
      },
    });

    try {
      await emailService.sendDriverInvite({
        to: existingUser.email,
        name: existingUser.name,
        email: existingUser.email,
        merchantName: merchant.name,
        merchantCountry: merchant.country,
      });
    } catch (emailError) {
      console.error('Failed to send driver invite email:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: existingUser.id.toString(),
          email: existingUser.email,
          name: existingUser.name,
        },
        message: 'Driver invitation sent successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error inviting driver:', error);

    if (error instanceof ConflictError || error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errorCode || 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to invite driver',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
