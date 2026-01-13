/**
 * Public Merchant Lookup API
 * GET /api/public/merchant/[code] - Get merchant details by code
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import type { RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/public/merchant/[code]
 * Public endpoint to lookup merchant by code
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merchantData = merchant as unknown as Record<string, any>;

    // Check subscription status and auto-switch if needed
    let subscriptionStatus = 'ACTIVE';
    let subscriptionSuspendReason: string | null = null;
    let subscriptionType: string | null = null;

    try {
      const { default: subscriptionAutoSwitchService } = await import('@/lib/services/SubscriptionAutoSwitchService');
      const { default: subscriptionRepository } = await import('@/lib/repositories/SubscriptionRepository');
      
      // Run auto-switch check (this handles expired trials/monthly, auto-opens store, etc.)
      const switchResult = await subscriptionAutoSwitchService.checkAndAutoSwitch(BigInt(merchantData.id));
      
      if (switchResult.action !== 'NO_CHANGE') {
        console.log(`📋 Customer access triggered subscription auto-switch for ${switchResult.merchantCode}:`, {
          action: switchResult.action,
          reason: switchResult.reason,
          storeOpened: switchResult.storeOpened,
        });
      }

      // Get fresh subscription status after auto-switch
      const subscription = await subscriptionRepository.getMerchantSubscription(BigInt(merchantData.id));

      if (subscription) {
        subscriptionStatus = subscription.status;
        subscriptionSuspendReason = subscription.suspendReason;
        subscriptionType = subscription.type;
      } else {
        // No subscription found = treat as SUSPENDED
        subscriptionStatus = 'SUSPENDED';
        subscriptionSuspendReason = 'No active subscription';
      }
    } catch (subError) {
      console.warn('Failed to get/update subscription status:', subError);
      // On error, treat as SUSPENDED to be safe
      subscriptionStatus = 'SUSPENDED';
      subscriptionSuspendReason = 'Unable to verify subscription';
    }

    // Refresh merchant data after auto-switch (isOpen might have changed)
    const refreshedMerchant = await merchantService.getMerchantByCode(params.code);
    const refreshedData = refreshedMerchant as unknown as Record<string, any>;

    // Return merchant info (exclude sensitive data)
    // Use refreshed data for isOpen as it may have been updated by auto-switch
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
      isOpen: refreshedData?.isOpen ?? merchantData.isOpen, // Use refreshed isOpen
      // Subscription status (for showing "store suspended" message)
      subscriptionStatus,
      subscriptionSuspendReason,
      subscriptionType, // Include subscription type for UI decisions
      // Sale mode settings
      isDineInEnabled: merchantData.isDineInEnabled ?? true,
      isTakeawayEnabled: merchantData.isTakeawayEnabled ?? true,
      dineInLabel: merchantData.dineInLabel,
      takeawayLabel: merchantData.takeawayLabel,
      deliveryLabel: merchantData.deliveryLabel,
      dineInScheduleStart: merchantData.dineInScheduleStart,
      dineInScheduleEnd: merchantData.dineInScheduleEnd,
      takeawayScheduleStart: merchantData.takeawayScheduleStart,
      takeawayScheduleEnd: merchantData.takeawayScheduleEnd,
      totalTables: merchantData.totalTables,
      // Delivery settings
      isDeliveryEnabled: merchantData.isDeliveryEnabled ?? false,
      enforceDeliveryZones: merchantData.enforceDeliveryZones ?? true,
      deliveryMaxDistanceKm: merchantData.deliveryMaxDistanceKm,
      deliveryFeeBase: merchantData.deliveryFeeBase,
      deliveryFeePerKm: merchantData.deliveryFeePerKm,
      deliveryFeeMin: merchantData.deliveryFeeMin,
      deliveryFeeMax: merchantData.deliveryFeeMax,
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
