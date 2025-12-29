import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/client';
import customerAuthService from '@/lib/services/CustomerAuthService';

interface LoginRequestBody {
  email?: string;
  phone?: string;
  password?: string;
  name?: string;
}

/**
 * Customer Login/Register Endpoint
 * POST /api/public/auth/customer-login
 * 
 * @description
 * Seamless authentication for customers (separate from admin users):
 * - Login with email OR phone number + password
 * - If customer has password → require password verification
 * - If customer has no password → passwordless login (legacy)
 * - Auto-register new customers
 * - Session duration: 1 year (stored in CustomerSession table)
 * 
 * @session
 * - JWT token expires in 1 year
 * - CustomerSession record created in database for tracking
 * - Session can be revoked by updating status to 'REVOKED'
 * - Token stored in localStorage on client side
 * 
 * @security
 * - Email/Phone validation
 * - Password hashing with bcrypt (10 rounds)
 * - JWT token with 1-year expiry
 * - CustomerSession tracking with device info
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json();
    const { email, phone, password, name } = body;

    // ========================================
    // VALIDATION - Accept email OR phone
    // ========================================
    const emailTrimmed = email?.trim().toLowerCase();
    const phoneTrimmed = phone?.trim();

    if (!emailTrimmed && !phoneTrimmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email or phone number is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate phone format if provided (starts with + or 0, 8-15 digits)
    if (phoneTrimmed) {
      const cleanedPhone = phoneTrimmed.replace(/[\s-]/g, '');
      if (!/^(\+|0)\d{8,15}$/.test(cleanedPhone)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid phone number format',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

    // ========================================
    // DATABASE QUERY - Find by email or phone in Customer table
    // ========================================

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(emailTrimmed ? [{ email: emailTrimmed }] : []),
          ...(phoneTrimmed ? [{ phone: phoneTrimmed }] : []),
        ],
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

    let customerId: bigint;
    let customerName: string;
    let customerEmail: string;
    let customerPhone: string | null;

    if (existingCustomer) {
      // ========================================
      // EXISTING CUSTOMER - LOGIN FLOW
      // ========================================

      // Check if account is active
      if (!existingCustomer.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_DISABLED',
            message: 'Your account is disabled',
            statusCode: 403,
          },
          { status: 403 }
        );
      }

      // Check if customer has a password set
      if (existingCustomer.passwordHash && existingCustomer.passwordHash.length > 0) {
        // Password required for this customer
        if (!password) {
          return NextResponse.json(
            {
              success: false,
              error: 'PASSWORD_REQUIRED',
              message: 'Password is required',
              statusCode: 400,
            },
            { status: 400 }
          );
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, existingCustomer.passwordHash);
        if (!passwordValid) {
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email/phone or password',
              statusCode: 401,
            },
            { status: 401 }
          );
        }
      }

      customerId = existingCustomer.id;
      customerName = name?.trim() || existingCustomer.name;
      customerEmail = existingCustomer.email;
      customerPhone = phoneTrimmed || existingCustomer.phone;

      // Update customer info
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(name && name.trim() !== existingCustomer.name ? { name: name.trim() } : {}),
          lastLoginAt: new Date(),
        },
      });

    } else {
      // ========================================
      // NEW CUSTOMER - REGISTER FLOW (only if no password provided)
      // ========================================

      // ✅ FIX: If customer provided password but account doesn't exist → invalid credentials
      if (password && password.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email/phone or password',
            statusCode: 401,
          },
          { status: 401 }
        );
      }

      // Name required for new registration (only when NOT providing password)
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Name is required for registration',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Email required for new registration
      if (!emailTrimmed) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Email is required for registration',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Hash password if provided
      let passwordHash: string | null = null;
      if (password && password.length >= 6) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const newCustomer = await prisma.customer.create({
        data: {
          email: emailTrimmed,
          name: name.trim(),
          phone: phoneTrimmed || null,
          passwordHash,
          isActive: true,
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      customerId = newCustomer.id;
      customerName = name.trim();
      customerEmail = emailTrimmed;
      customerPhone = phoneTrimmed || null;
    }

    // ========================================
    // CREATE CUSTOMER SESSION - 1 year expiry
    // ========================================

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    // If customer has password, use CustomerAuthService.login
    // Otherwise, create session manually for passwordless login
    if (existingCustomer?.passwordHash && password) {
      // Use the auth service for proper login
      const loginResult = await customerAuthService.login(
        { email: customerEmail, password },
        userAgent,
        ipAddress
      );

      console.log('✅ [AUTH] Customer logged in via password:', customerId.toString());

      // Calculate expiresAt from expiresIn
      const expiresAtDate = new Date();
      expiresAtDate.setSeconds(expiresAtDate.getSeconds() + loginResult.expiresIn);

      return NextResponse.json(
        {
          success: true,
          data: {
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
            expiresIn: loginResult.expiresIn,
            expiresAt: expiresAtDate.toISOString(),
            customer: {
              id: customerId.toString(),
              email: customerEmail,
              name: customerName,
              phone: customerPhone,
            },
          },
          message: 'Login successful',
          statusCode: 200,
        },
        { status: 200 }
      );
    }

    // Passwordless login or new registration - create session manually
    const { generateAccessToken, generateRefreshToken } = await import('@/lib/utils/jwtManager');
    
    const sessionDuration = 365 * 24 * 60 * 60; // 1 year in seconds
    const refreshDuration = sessionDuration * 2;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + sessionDuration);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + refreshDuration);

    const accessToken = generateAccessToken({
      userId: customerId,
      sessionId: BigInt(0), // Will update after session creation
      role: 'CUSTOMER',
      email: customerEmail,
    }, sessionDuration);

    const refreshToken = generateRefreshToken({
      userId: customerId,
      sessionId: BigInt(0),
    }, refreshDuration);

    // Create customer session
    const session = await prisma.customerSession.create({
      data: {
        customerId,
        token: accessToken,
        deviceInfo: userAgent,
        ipAddress,
        status: 'ACTIVE',
        expiresAt,
        refreshExpiresAt,
      },
    });

    // Generate final token with correct session ID
    const finalAccessToken = generateAccessToken({
      userId: customerId,
      sessionId: session.id,
      role: 'CUSTOMER',
      email: customerEmail,
    }, sessionDuration);

    // Update session with final token
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { token: finalAccessToken },
    });

    console.log('✅ [AUTH] Customer session created:', customerId.toString(), '- expires:', expiresAt.toISOString());

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: finalAccessToken,
          refreshToken,
          expiresIn: sessionDuration,
          expiresAt: expiresAt.toISOString(),
          customer: {
            id: customerId.toString(),
            email: customerEmail,
            name: customerName,
            phone: customerPhone,
          },
        },
        message: existingCustomer ? 'Login successful' : 'Account created successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred. Please try again.',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
