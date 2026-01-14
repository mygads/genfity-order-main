/**
 * Merchant Toggle Open API
 * PUT /api/merchant/toggle-open - Toggle store open/close status (Owner or staff with permission)
 * 
 * Supports two modes:
 * 1. Manual Override: Force open/close regardless of schedule
 * 2. Auto Mode: Follow opening hours schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantPermission } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * PUT /api/merchant/toggle-open
 * Toggle merchant store open/close status
 * Only MERCHANT_OWNER can use this endpoint
 * 
 * Body options:
 * 1. { isOpen: boolean } - Set manual override with specific status
 * 2. { isManualOverride: false } - Switch to auto mode (follow schedule)
 * 3. { isOpen: boolean, isManualOverride: boolean } - Full control
 */
async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    if (!authContext.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get merchant from the current auth context (supports multi-merchant owners)
    const merchantUser = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId: authContext.merchantId,
          userId: authContext.userId,
        },
      },
      include: { merchant: true },
    });
    
    if (!merchantUser || !merchantUser.isActive || !merchantUser.merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isOpen, isManualOverride } = body;

    // Validate input
    if (isOpen !== undefined && typeof isOpen !== 'boolean') {
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

    if (isManualOverride !== undefined && typeof isManualOverride !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'isManualOverride must be a boolean value',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { isOpen?: boolean; isManualOverride?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    // If switching to auto mode
    if (isManualOverride === false) {
      updateData.isManualOverride = false;
      // Keep isOpen as true for auto mode (schedule will determine actual status)
      updateData.isOpen = true;
    } 
    // If setting manual override
    else if (isOpen !== undefined) {
      updateData.isOpen = isOpen;
      updateData.isManualOverride = true; // Enable manual override when explicitly setting isOpen
    }

    // Update merchant status
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: updateData,
      include: {
        openingHours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
        },
      },
    });

    // Determine status message
    let message: string;
    if (updateData.isManualOverride === false) {
      message = 'Store switched to auto mode (following schedule)';
    } else if (updateData.isOpen) {
      message = 'Store manually opened';
    } else {
      message = 'Store manually closed';
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedMerchant),
      message,
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

// Apply auth middleware and export handler
export const PUT = withMerchantPermission(handlePut);
