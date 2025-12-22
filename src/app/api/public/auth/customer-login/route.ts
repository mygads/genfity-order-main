import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d'; // 30 days for customers

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
 * Seamless authentication for customers:
 * - Login with email OR phone number + password
 * - If user has password → require password verification
 * - If user has no password → passwordless login (legacy)
 * - Auto-register new users
 * - Session duration: 30 days
 * 
 * @session
 * - JWT token expires in 30 days
 * - UserSession record created in database for tracking
 * - Session can be revoked by updating status to 'REVOKED'
 * - Token stored in localStorage on client side
 * 
 * @security
 * - Email/Phone validation
 * - Password hashing with bcrypt (10 rounds)
 * - JWT token with 30-day expiry
 * - UserSession tracking with device info
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
    // DATABASE QUERY - Find by email or phone
    // ========================================

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(emailTrimmed ? [{ email: emailTrimmed }] : []),
          ...(phoneTrimmed ? [{ phone: phoneTrimmed }] : []),
        ],
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    let userId: bigint;
    let userName: string;
    let userEmail: string;
    let userPhone: string | null;

    if (existingUser) {
      // ========================================
      // EXISTING USER - LOGIN FLOW
      // ========================================

      // Check if account is active
      if (!existingUser.isActive) {
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

      // Check if user has a password set
      if (existingUser.passwordHash && existingUser.passwordHash.length > 0) {
        // Password required for this user
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
        const passwordValid = await bcrypt.compare(password, existingUser.passwordHash);
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

      userId = existingUser.id;
      userName = name?.trim() || existingUser.name;
      userEmail = existingUser.email;
      userPhone = phoneTrimmed || existingUser.phone;

      // Update user info
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && name.trim() !== existingUser.name ? { name: name.trim() } : {}),
          lastLoginAt: new Date(),
        },
      });

    } else {
      // ========================================
      // NEW USER - REGISTER FLOW
      // ========================================

      // Name required for new registration
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
      let passwordHash = '';
      if (password && password.length >= 6) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const newUser = await prisma.user.create({
        data: {
          email: emailTrimmed,
          name: name.trim(),
          phone: phoneTrimmed || null,
          passwordHash,
          role: 'CUSTOMER',
          isActive: true,
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      userId = newUser.id;
      userName = name.trim();
      userEmail = emailTrimmed;
      userPhone = phoneTrimmed || null;
    }

    // ========================================
    // JWT GENERATION - 30 days expiry
    // ========================================

    const payload = {
      customerId: userId.toString(),
      email: userEmail,
      name: userName,
      role: 'CUSTOMER',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // ========================================
    // CREATE USER SESSION RECORD
    // ========================================

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    await prisma.userSession.create({
      data: {
        userId,
        token,
        deviceInfo: userAgent,
        ipAddress,
        status: 'ACTIVE',
        expiresAt: new Date(expiresAt),
        refreshExpiresAt: null,
      },
    });

    console.log('✅ [AUTH] Session created for customer:', userId.toString(), '- expires:', new Date(expiresAt).toISOString());

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: token,
          expiresAt,
          user: {
            id: userId.toString(),
            email: userEmail,
            name: userName,
            phone: userPhone,
            role: 'CUSTOMER',
          },
        },
        message: existingUser ? 'Login successful' : 'Account created successfully',
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
