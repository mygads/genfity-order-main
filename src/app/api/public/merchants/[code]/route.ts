/**
 * Public Merchant Lookup API
 * GET /api/public/merchant/[code] - Get merchant details by code
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';

/**
 * GET /api/public/merchant/[code]
 * Public endpoint to lookup merchant by code
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  try {
    const merchant = await merchantService.getMerchantByCode(params.code);

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

    // Check if merchant is disabled (isActive = false)
    // Disabled merchants cannot be accessed at all
    if (!merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_DISABLED',
          message: 'Merchant is currently disabled',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Return merchant info (exclude sensitive data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merchantData = merchant as unknown as Record<string, any>;
    const publicMerchantInfo = {
      id: merchantData.id.toString(),
      code: merchantData.code,
      name: merchantData.name,
      email: merchantData.email,
      phone: merchantData.phone,
      address: merchantData.address,
      city: merchantData.city,
      state: merchantData.state,
      postalCode: merchantData.postalCode,
      country: merchantData.country,
      logoUrl: merchantData.logoUrl,
      bannerUrl: merchantData.bannerUrl,
      mapUrl: merchantData.mapUrl,
      description: merchantData.description,
      isActive: merchantData.isActive,
      isOpen: merchantData.isOpen,
      // Sale mode settings
      isDineInEnabled: merchantData.isDineInEnabled ?? true,
      isTakeawayEnabled: merchantData.isTakeawayEnabled ?? true,
      // Tax settings
      enableTax: merchantData.enableTax,
      taxPercentage: merchantData.taxPercentage,
      // Service charge settings
      enableServiceCharge: merchantData.enableServiceCharge,
      serviceChargePercent: merchantData.serviceChargePercent,
      // Packaging fee settings (for takeaway)
      enablePackagingFee: merchantData.enablePackagingFee,
      packagingFeeAmount: merchantData.packagingFeeAmount,
      // Other settings
      currency: merchantData.currency,
      timezone: merchantData.timezone,
      latitude: merchantData.latitude,
      longitude: merchantData.longitude,
      openingHours: merchant.openingHours,
    };

    return NextResponse.json({
      success: true,
      data: publicMerchantInfo,
      message: 'Merchant retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve merchant',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
