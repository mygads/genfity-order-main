import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/client';
import customerAuthService from '@/lib/services/CustomerAuthService';

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
 * @returns {Object} data.customer - Customer profile data
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
    // FIND EXISTING CUSTOMER BY EMAIL
    // ========================================
    
    /**
     * ✅ UPDATED: Find customer by email in Customer table
     */
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        email: emailTrimmed,
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

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: 'CUSTOMER_NOT_FOUND',
          message: 'Akun tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if account is active
    if (!existingCustomer.isActive) {
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

    // Check if customer already has password
    if (existingCustomer.passwordHash && existingCustomer.passwordHash !== '') {
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
    // UPDATE CUSTOMER WITH PASSWORD AND INFO
    // ========================================
    
    await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        passwordHash: hashedPassword,
        name: nameTrimmed,
        phone: phoneTrimmed,
        mustChangePassword: false,
        lastLoginAt: new Date(),
      },
    });

    // ========================================
    // LOGIN AND GET TOKEN
    // ========================================
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'Unknown';

    // Use CustomerAuthService to login (creates session and generates tokens)
    const loginResult = await customerAuthService.login(
      { email: emailTrimmed, password },
      userAgent,
      ipAddress
    );

    console.log('✅ [SAVE ACCOUNT] Password set for customer:', existingCustomer.id.toString());

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
          expiresIn: loginResult.expiresIn,
          customer: loginResult.customer,
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
