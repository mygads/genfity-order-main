/**
 * Merchant Drivers API
 *
 * GET /api/merchant/drivers
 * - Default: list ACTIVE delivery drivers for assignment
 * - Query params:
 *   - includeInactive=1: include inactive drivers (for management screens)
 *   - search=...: search by name/email
 *
 * POST /api/merchant/drivers
 * - Create a new delivery driver account and link to merchant (OWNER only)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner, withMerchantPermission } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import emailService from '@/lib/services/EmailService';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ERROR_CODES, ValidationError } from '@/lib/constants/errors';

export const GET = withMerchantPermission(async (req: NextRequest, authContext: AuthContext) => {
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

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === '1' || searchParams.get('includeInactive') === 'true';
    const search = (searchParams.get('search') || '').trim();

    const drivers = await prisma.merchantUser.findMany({
      where: {
        merchantId: authContext.merchantId,
        role: 'DRIVER',
        ...(includeInactive ? {} : { isActive: true }),
        user: {
          isActive: true,
          ...(search
            ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
            : {}),
        },
      },
      select: {
        isActive: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const data = drivers.map((d) => ({
      ...d.user,
      isActive: d.isActive,
      joinedAt: d.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
      message: 'Drivers retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant drivers:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve drivers',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});

export const POST = withMerchantOwner(async (req: NextRequest, authContext: AuthContext) => {
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

    const body = await req.json();
    validateRequired(body.name, 'Driver name');
    validateRequired(body.email, 'Driver email');
    validateRequired(body.password, 'Password');
    validateEmail(body.email);

    const email = String(body.email).toLowerCase();

    const emailExists = await userRepository.emailExists(email);
    if (emailExists) {
      throw new ConflictError('Email already registered', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: authContext.merchantId },
      select: { name: true, code: true, country: true },
    });

    if (!merchant) {
      throw new ValidationError('Merchant not found', ERROR_CODES.NOT_FOUND);
    }

    const hashedPassword = await hashPassword(String(body.password));

    const driver = await userRepository.create({
      name: String(body.name).trim(),
      email,
      phone: body.phone ? String(body.phone).trim() : undefined,
      passwordHash: hashedPassword,
      role: 'DELIVERY',
      isActive: true,
      mustChangePassword: false,
    });

    await merchantService.addDriver(authContext.merchantId, driver.id);

    try {
      await emailService.sendDriverWelcome({
        to: email,
        name: String(body.name).trim(),
        email,
        password: String(body.password),
        merchantName: merchant.name,
        merchantCode: merchant.code,
        merchantCountry: merchant.country,
      });
    } catch (emailError) {
      console.error('❌ Failed to send driver welcome email:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt({
          id: driver.id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
        }),
        message: 'Driver created successfully',
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating merchant driver:', error);

    // Let shared handler shape handle domain errors? This route is using manual responses.
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
        message: 'Failed to create driver',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
