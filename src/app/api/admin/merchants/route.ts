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

  // Import subscription repository for fetching subscription status
  const { default: subscriptionRepository } = await import('@/lib/repositories/SubscriptionRepository');

  // Transform to include owner and subscription information
  const merchants = await Promise.all(merchantsData.map(async (merchant: Record<string, unknown>) => {
    const merchantUsers = merchant.merchantUsers as Array<{ role: string; user: Record<string, unknown> }> | undefined;
    const owner = merchantUsers?.find((mu) => mu.role === 'OWNER')?.user;

    // Get subscription status
    let subscriptionStatus = null;
    try {
      const subscription = await subscriptionRepository.getMerchantSubscription(merchant.id as bigint);
      if (subscription) {
        subscriptionStatus = {
          type: subscription.type,
          status: subscription.status,
        };
      }
    } catch {
      // Ignore subscription fetch errors
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
