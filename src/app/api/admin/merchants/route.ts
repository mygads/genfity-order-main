/**
 * GET /api/admin/merchants
 * List all merchants (Super Admin only)
 * 
 * Query Parameters:
 * - activeOnly: boolean (optional) - Filter active merchants only
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "merchants": [...]
 *   },
 *   "message": "Merchants retrieved successfully",
 *   "statusCode": 200
 * }
 * 
 * POST /api/admin/merchants
 * Create new merchant with owner account (Super Admin only)
 * 
 * Request Body:
 * {
 *   "name": "Restaurant Name",
 *   "code": "RESTAURANT",
 *   "description": "Description",
 *   "address": "Address",
 *   "phoneNumber": "+61400000000",
 *   "email": "restaurant@example.com",
 *   "taxRate": 10,
 *   "taxIncluded": false,
 *   "ownerName": "Owner Name",
 *   "ownerEmail": "owner@example.com",
 *   "ownerPhone": "+61400000001"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "merchant": {...},
 *     "owner": {...},
 *     "tempPassword": "TempPass123!"
 *   },
 *   "message": "Merchant created successfully",
 *   "statusCode": 201
 * }
 */

import { NextRequest } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { CreateMerchantInput } from '@/lib/services/MerchantService';

async function getMerchantsHandler(request: NextRequest) {
  // Get query parameters
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('activeOnly') === 'true';

  // Get all merchants with owner info
  const merchantsData = await merchantService.getAllMerchants(activeOnly);

  // Import repositories for fetching subscription status and balance
  const { default: subscriptionRepository } = await import('@/lib/repositories/SubscriptionRepository');
  const { default: prisma } = await import('@/lib/db/client');

  // Transform to include owner, subscription, and balance information
  const merchants = await Promise.all(merchantsData.map(async (merchant: Record<string, unknown>) => {
    const merchantUsers = merchant.merchantUsers as Array<{ role: string; user: Record<string, unknown> }> | undefined;
    const owner = merchantUsers?.find((mu) => mu.role === 'OWNER')?.user;

    // Get subscription status and end date
    let subscriptionStatus = null;
    let subscriptionEndsAt = null;
    try {
      const subscription = await subscriptionRepository.getMerchantSubscription(merchant.id as bigint);
      if (subscription) {
        subscriptionStatus = {
          type: subscription.type,
          status: subscription.status,
        };
        // Determine subscription end date based on type
        if (subscription.type === 'TRIAL' && subscription.trialEndsAt) {
          subscriptionEndsAt = subscription.trialEndsAt;
        } else if ((subscription.type === 'DEPOSIT' || subscription.type === 'MONTHLY') && subscription.currentPeriodEnd) {
          subscriptionEndsAt = subscription.currentPeriodEnd;
        }
      }
    } catch {
      // Ignore subscription fetch errors
    }

    // Get balance info
    let balance = 0;
    let lastTopupAt = null;
    try {
      const merchantBalance = await prisma.merchantBalance.findUnique({
        where: { merchantId: merchant.id as bigint },
        select: { balance: true, lastTopupAt: true },
      });
      if (merchantBalance) {
        balance = Number(merchantBalance.balance);
        lastTopupAt = merchantBalance.lastTopupAt;
      }
    } catch {
      // Ignore balance fetch errors
    }

    return {
      id: merchant.id,
      code: merchant.code,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      postalCode: merchant.postalCode,
      country: merchant.country,
      logoUrl: merchant.logoUrl,
      description: merchant.description,
      isActive: merchant.isActive,
      isOpen: merchant.isOpen,
      currency: merchant.currency,
      timezone: merchant.timezone,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
      mapUrl: merchant.mapUrl,
      openingHours: merchant.openingHours,
      merchantUsers: merchant.merchantUsers,
      createdAt: merchant.createdAt,
      ownerId: owner?.id || null,
      ownerName: owner?.name || null,
      ownerEmail: owner?.email || null,
      subscriptionStatus,
      subscriptionEndsAt,
      balance,
      lastTopupAt,
    };
  }));

  return successResponse(
    { merchants },
    'Merchants retrieved successfully',
    200
  );
}

async function createMerchantHandler(request: NextRequest) {
  // Parse request body
  const body: CreateMerchantInput = await request.json();

  // Create merchant
  const result = await merchantService.createMerchant(body);

  return successResponse(result, 'Merchant created successfully', 201);
}

export const GET = withSuperAdmin(getMerchantsHandler);
export const POST = withSuperAdmin(createMerchantHandler);
