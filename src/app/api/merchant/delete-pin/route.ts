/**
 * Merchant Delete PIN Management API
 * 
 * PUT - Set or update delete PIN
 * DELETE - Remove delete PIN
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import bcrypt from 'bcryptjs';

/**
 * PUT /api/merchant/delete-pin
 * Set or update the delete PIN for a merchant
 */
export const PUT = withMerchant(async (req: NextRequest, authContext: AuthContext) => {
  try {
    const { merchantId } = authContext;
    const body = await req.json();
    const { pin } = body;

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'PIN must be exactly 4 digits',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update merchant with hashed PIN
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { deletePin: hashedPin },
    });

    return NextResponse.json({
      success: true,
      message: 'Delete PIN set successfully',
    });
  } catch (error) {
    console.error('[DELETE PIN] Error setting PIN:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to set PIN', statusCode: 500 },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/merchant/delete-pin
 * Remove the delete PIN from a merchant
 */
export const DELETE = withMerchant(async (_req: NextRequest, authContext: AuthContext) => {
  try {
    const { merchantId } = authContext;

    // Remove PIN
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { deletePin: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Delete PIN removed successfully',
    });
  } catch (error) {
    console.error('[DELETE PIN] Error removing PIN:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to remove PIN', statusCode: 500 },
      { status: 500 }
    );
  }
});
