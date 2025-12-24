import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, CustomerAuthContext } from '@/lib/middleware/auth';

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
export const GET = withCustomer(async (
  _request: NextRequest,
  context: CustomerAuthContext,
) => {
  try {
    // ========================================
    // DATABASE QUERY - Customer Table
    // ========================================
    const customer = await prisma.customer.findUnique({
      where: {
        id: context.customerId,
      },
      select: {
        passwordHash: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'CUSTOMER_NOT_FOUND',
          message: 'Customer tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if password exists (not empty string)
    const hasPassword = customer.passwordHash !== null && customer.passwordHash !== '';

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
});

