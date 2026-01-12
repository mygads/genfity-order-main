/**
 * Merchant Profile API
 * GET /api/merchant/profile - Get merchant profile
 * PUT /api/merchant/profile - Update merchant profile
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/profile
 * Get merchant profile with opening hours
 */
async function handleGet(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
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

    // Get merchant details with opening hours
    const merchant = await merchantService.getMerchantById(merchantUser.merchantId);

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

    // Add hasDeletePin flag (don't expose the actual PIN)
    // Map phone to phoneNumber for frontend compatibility
    const merchantData = serializeBigInt(merchant) as Record<string, unknown>;
    const { deletePin: _deletePin, phone, ...restMerchantData } = merchantData;
    const responseData = {
      ...restMerchantData,
      phoneNumber: phone || '', // Map phone -> phoneNumber for frontend
      hasDeletePin: !!merchant.deletePin,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
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
async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
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

    // Update merchant (isActive is excluded - only super admin can change it)
    const updatedMerchant = await merchantService.updateMerchant(
      merchantUser.merchantId,
      {
        name: body.name,
        description: body.description,
        address: body.address,
        phoneNumber: body.phoneNumber,
        email: body.email,
        // Sale mode settings
        isDineInEnabled: body.isDineInEnabled,
        isTakeawayEnabled: body.isTakeawayEnabled,
        dineInLabel: body.dineInLabel,
        takeawayLabel: body.takeawayLabel,
        deliveryLabel: body.deliveryLabel,
        dineInScheduleStart: body.dineInScheduleStart,
        dineInScheduleEnd: body.dineInScheduleEnd,
        takeawayScheduleStart: body.takeawayScheduleStart,
        takeawayScheduleEnd: body.takeawayScheduleEnd,
        deliveryScheduleStart: body.deliveryScheduleStart,
        deliveryScheduleEnd: body.deliveryScheduleEnd,
        totalTables: body.totalTables,
        // Tax settings
        enableTax: body.enableTax,
        taxRate: body.taxPercentage,
        taxIncluded: body.taxIncluded,
        // Service charge settings
        enableServiceCharge: body.enableServiceCharge,
        serviceChargePercent: body.serviceChargePercent,
        // Packaging fee settings
        enablePackagingFee: body.enablePackagingFee,
        packagingFeeAmount: body.packagingFeeAmount,
        // Regional settings
        country: body.country,
        currency: body.currency,
        timezone: body.timezone,
        latitude: body.latitude,
        longitude: body.longitude,
        // Delivery settings
        isDeliveryEnabled: body.isDeliveryEnabled,
        enforceDeliveryZones: body.enforceDeliveryZones,
        deliveryMaxDistanceKm: body.deliveryMaxDistanceKm,
        deliveryFeeBase: body.deliveryFeeBase,
        deliveryFeePerKm: body.deliveryFeePerKm,
        deliveryFeeMin: body.deliveryFeeMin,
        deliveryFeeMax: body.deliveryFeeMax,
        // Receipt settings
        receiptSettings: body.receiptSettings,
      }
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedMerchant),
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
