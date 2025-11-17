/**
 * Admin Merchant Toggle Open API
 * PUT /api/admin/merchants/:id/toggle-open - Toggle merchant store open/close status (Super Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * PUT /api/admin/merchants/:id/toggle-open
 * Toggle merchant store open/close status
 * Only SUPER_ADMIN can use this endpoint
 */
async function handlePut(
  req: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const merchantId = BigInt(params.id);

    const body = await req.json();
    const { isOpen } = body;

    if (typeof isOpen !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'isOpen must be a boolean value',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Update merchant isOpen status
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: { 
        isOpen,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedMerchant),
      message: `Store ${isOpen ? 'opened' : 'closed'} successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling store open status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to toggle store open status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

// Apply super admin auth middleware and export handler
export const PUT = withSuperAdmin(handlePut);
