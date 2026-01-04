/**
 * Deleted Items List API
 * GET /api/merchant/deleted-items - List all soft-deleted items for the merchant
 *
 * @description Returns all soft-deleted menus, categories, addon categories, and addon items
 * that are still within the 30-day retention period and can be restored.
 *
 * Query Parameters:
 * - type: 'all' | 'menus' | 'categories' | 'addon-categories' | 'addon-items'
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import dataCleanupService from '@/lib/services/DataCleanupService';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';

type ItemType = 'all' | 'menus' | 'categories' | 'addon-categories' | 'addon-items';

async function handleGet(req: NextRequest, authContext: AuthContext) {
  try {
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Merchant ID required' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const type = (url.searchParams.get('type') || 'all') as ItemType;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: {
      menus?: any[];
      categories?: any[];
      addonCategories?: any[];
      addonItems?: any[];
    } = {};

    // Fetch deleted items based on type filter
    if (type === 'all' || type === 'menus') {
      result.menus = await dataCleanupService.getDeletedMenus(BigInt(merchantId));
    }

    if (type === 'all' || type === 'categories') {
      result.categories = await dataCleanupService.getDeletedMenuCategories(BigInt(merchantId));
    }

    if (type === 'all' || type === 'addon-categories') {
      result.addonCategories = await dataCleanupService.getDeletedAddonCategories(BigInt(merchantId));
    }

    if (type === 'all' || type === 'addon-items') {
      result.addonItems = await dataCleanupService.getDeletedAddonItems(BigInt(merchantId));
    }

    // Calculate totals
    const totals = {
      menus: result.menus?.length || 0,
      categories: result.categories?.length || 0,
      addonCategories: result.addonCategories?.length || 0,
      addonItems: result.addonItems?.length || 0,
      total: (result.menus?.length || 0) + (result.categories?.length || 0) +
             (result.addonCategories?.length || 0) + (result.addonItems?.length || 0),
    };

    // Calculate retention info for each item
    const retentionDays = 30;
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addRetentionInfo = (items: any[]): any[] => {
      return items.map(item => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const deleteDays = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilPermanentDelete = Math.max(0, retentionDays - deleteDays);
        return { ...item, daysUntilPermanentDelete };
      });
    };

    // Add retention info to each category
    const enrichedResult = {
      menus: result.menus ? addRetentionInfo(result.menus) : undefined,
      categories: result.categories ? addRetentionInfo(result.categories) : undefined,
      addonCategories: result.addonCategories ? addRetentionInfo(result.addonCategories) : undefined,
      addonItems: result.addonItems ? addRetentionInfo(result.addonItems) : undefined,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...serializeBigInt(enrichedResult),
        summary: totals,
        retentionPolicy: {
          days: retentionDays,
          message: `Items are permanently deleted after ${retentionDays} days`,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching deleted items:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch deleted items',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
