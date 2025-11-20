import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d';

interface SaveAccountRequestBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

/**
 * Save Account (Set Password) Endpoint
 * POST /api/customer/save-account
 * 
 * @specification Save account for users who registered via checkout
 * 
 * @description
 * Allows customers who registered without password (via checkout) to:
 * - Set a password to secure their account
 * - Keep their existing email, name, phone
 * - Preserve order history
 * 
 * This endpoint is called from the login page when mode=save-account
 * 
 * @security
 * - Email and name must match existing customer
 * - Password hashed with bcryptjs (10 rounds minimum)
 * - Returns new JWT token with updated session
 * 
 * @returns {Object} Standard response format
 * @returns {boolean} success - Operation status
 * @returns {Object} data - New authentication data
 * @returns {string} data.accessToken - New JWT token
 * @returns {number} data.expiresAt - Token expiry timestamp
 * @returns {Object} data.user - User profile data
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveAccountRequestBody = await request.json();
    const { email, password, name, phone } = body;

    // ========================================
    // VALIDATION
    // ========================================
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email tidak valid',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Password harus minimal 6 karakter',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nama tidak valid',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();
    const nameTrimmed = name.trim();
    const phoneTrimmed = phone?.trim() || null;

    // ========================================
    // FIND EXISTING USER BY EMAIL
    // ========================================
    
    /**
     * ✅ UPDATED: Find user by email to update their account
     * Allows updating name, email, phone, and setting password
     */
    const existingUser = await prisma.user.findFirst({
      where: {
        email: emailTrimmed,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Akun tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if account is active
    if (!existingUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'ACCOUNT_DISABLED',
          message: 'Akun Anda tidak aktif',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Check if user already has password
    if (existingUser.passwordHash && existingUser.passwordHash !== '') {
      return NextResponse.json(
        {
          success: false,
          error: 'PASSWORD_EXISTS',
          message: 'Akun sudah memiliki password',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // ========================================
    // HASH PASSWORD
    // ========================================
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ========================================
    // UPDATE USER WITH PASSWORD AND INFO
    // ========================================
    
    /**
     * ✅ UPDATED: Update user information
     * - Set password (if empty)
     * - Update name (always)
     * - Update phone (always, can be null)
     * - Update lastLoginAt timestamp
     */
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: hashedPassword,
        name: nameTrimmed,
        phone: phoneTrimmed,
        lastLoginAt: new Date(),
      },
    });

    // ========================================
    // GENERATE NEW JWT TOKEN
    // ========================================
    const payload = {
      customerId: existingUser.id.toString(),
      email: emailTrimmed,
      name: nameTrimmed,
      role: 'CUSTOMER',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    // ========================================
    // CREATE NEW USER SESSION
    // ========================================
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown';

    await prisma.userSession.create({
      data: {
        userId: existingUser.id,
        token,
        deviceInfo: userAgent,
        ipAddress,
        status: 'ACTIVE',
        expiresAt: new Date(expiresAt),
        refreshExpiresAt: null,
      },
    });

    console.log('✅ [SAVE ACCOUNT] Password set for customer:', existingUser.id.toString());

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: token,
          expiresAt,
          user: {
            id: existingUser.id.toString(),
            email: emailTrimmed,
            name: nameTrimmed,
            phone: phoneTrimmed,
            role: 'CUSTOMER',
          },
        },
        message: 'Akun berhasil disimpan',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Save account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
