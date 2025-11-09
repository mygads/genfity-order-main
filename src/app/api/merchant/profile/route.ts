/**
 * Merchant Profile API
 * GET /api/merchant/profile - Get merchant profile
 * PUT /api/merchant/profile - Update merchant profile
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/profile
 * Get merchant profile with opening hours
 */
async function handleGet(req: NextRequest) {
  try {
    // Get merchant ID from auth middleware (stored in headers)
    const merchantId = req.headers.get('x-merchant-id');
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Merchant ID not found in request',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // Get merchant details
    const merchant = await merchantService.getMerchantById(BigInt(merchantId));

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

    return NextResponse.json({
      success: true,
      data: merchant,
      message: 'Merchant profile retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant profile:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve merchant profile',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/merchant/profile
 * Update merchant profile
 */
async function handlePut(req: NextRequest) {
  try {
    // Get merchant ID from auth middleware
    const merchantId = req.headers.get('x-merchant-id');
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Merchant ID not found in request',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Update merchant
    const updatedMerchant = await merchantService.updateMerchant(
      BigInt(merchantId),
      {
        name: body.name,
        description: body.description,
        address: body.address,
        phoneNumber: body.phoneNumber,
        email: body.email,
        taxRate: body.taxRate,
        taxIncluded: body.taxIncluded,
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedMerchant,
      message: 'Merchant profile updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating merchant profile:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
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
        message: 'Failed to update merchant profile',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

// Apply auth middleware and export handlers
export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
