import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Check if Customer Has Password
 * GET /api/customer/check-password
 * 
 * @specification Check if user registered via checkout (no password) or login (has password)
 * 
 * @description
 * Returns whether the authenticated customer has set a password:
 * - Users who registered via checkout: no password (empty string)
 * - Users who registered via login: has password (bcrypt hash)
 * 
 * @security
 * - Requires JWT authentication
 * - Returns boolean only (never password hash)
 * 
 * @returns {Object} Standard response format
 * @returns {boolean} success - Operation status
 * @returns {Object} data - Password status
 * @returns {boolean} data.hasPassword - Whether user has password set
 * @returns {string} message - Success/error message
 */
export async function GET(request: NextRequest) {
  try {
    // ========================================
    // AUTHENTICATION
    // ========================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token tidak valid',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: { customerId?: string };

    try {
      decoded = jwt.verify(token, JWT_SECRET) as { customerId?: string };
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token tidak valid atau kadaluarsa',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const customerId = decoded.customerId ? BigInt(decoded.customerId) : null;
    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token tidak valid',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // ========================================
    // DATABASE QUERY
    // ========================================
    const user = await prisma.user.findUnique({
      where: {
        id: customerId,
        role: 'CUSTOMER',
      },
      select: {
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if password exists (not empty string)
    const hasPassword = user.passwordHash !== null && user.passwordHash !== '';

    return NextResponse.json(
      {
        success: true,
        data: {
          hasPassword,
        },
        message: 'Success',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check password error:', error);
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
