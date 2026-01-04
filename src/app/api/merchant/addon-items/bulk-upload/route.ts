import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkAddonItemInput {
  id?: string; // Optional - for updating existing addon
  addonCategoryId: string;
  name: string;
  description?: string;
  price: number;
  inputType?: 'SELECT' | 'QTY';
  isActive?: boolean;
  trackStock?: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock?: boolean;
  displayOrder?: number;
}

/**
 * POST /api/merchant/addon-items/bulk-upload
 * 
 * Bulk create or update addon items
 * - If item has `id`, update existing addon
 * - If item name+category matches existing addon, update it (with upsert mode)
 * - Otherwise create new addon
 * 
 * @specification copilot-instructions.md - Prisma ORM Usage
 * @auth Requires merchant authentication
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { merchantId, userId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { items, upsertByName = false } = body as { 
      items: BulkAddonItemInput[];
      upsertByName?: boolean;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No items provided' },
        { status: 400 }
      );
    }

    // Validate max items
    if (items.length > 200) {
      return NextResponse.json(
        { success: false, message: 'Maximum 200 items allowed per upload' },
        { status: 400 }
      );
    }

    // Get all addon categories for the merchant (for validation)
    const merchantAddonCategories = await prisma.addonCategory.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validAddonCategoryIds = new Set(merchantAddonCategories.map(c => c.id.toString()));

    // Get existing addon items for duplicate detection (for upsert by name)
    const existingAddons = await prisma.addonItem.findMany({
      where: {
        addonCategory: {
          merchantId: merchantId,
        },
        deletedAt: null,
      },
      select: { id: true, name: true, addonCategoryId: true },
    });

    // Build lookup map: key = "name::categoryId" (lowercase)
    const addonNameToCategoryMap = new Map(
      existingAddons.map(a => [`${a.name.toLowerCase().trim()}::${a.addonCategoryId.toString()}`, a.id])
    );

    // Track created and updated counts
    let createdCount = 0;
    let updatedCount = 0;

    // Process addon items in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedAddons = [];

      for (const item of items) {
        // Validate required fields
        if (!item.addonCategoryId || !validAddonCategoryIds.has(item.addonCategoryId)) {
          throw new Error(`Valid addon category is required for "${item.name || 'item'}"`);
        }

        if (!item.name || item.name.trim() === '') {
          throw new Error(`Addon item name is required`);
        }

        if (item.price === undefined || item.price === null || isNaN(item.price) || item.price < 0) {
          throw new Error(`Valid price is required for "${item.name}"`);
        }

        // Determine if this is an update or create
        let existingId: bigint | null = null;

        if (item.id) {
          // Explicit ID provided
          existingId = BigInt(item.id);
        } else if (upsertByName) {
          // Try to match by name + category
          const lookupKey = `${item.name.toLowerCase().trim()}::${item.addonCategoryId}`;
          const matchedId = addonNameToCategoryMap.get(lookupKey);
          if (matchedId) {
            existingId = matchedId;
          }
        }

        const addonData = {
          addonCategoryId: BigInt(item.addonCategoryId),
          name: item.name.trim(),
          description: item.description?.trim() || null,
          price: item.price,
          inputType: item.inputType || 'SELECT',
          isActive: item.isActive !== false, // Default true
          trackStock: item.trackStock || false,
          stockQty: item.trackStock ? (item.stockQty ?? 0) : null,
          dailyStockTemplate: item.trackStock ? item.dailyStockTemplate : null,
          autoResetStock: item.trackStock ? (item.autoResetStock || false) : false,
          displayOrder: item.displayOrder ?? 0,
        };

        if (existingId) {
          // Update existing addon
          const updatedAddon = await tx.addonItem.update({
            where: { id: existingId },
            data: {
              ...addonData,
              updatedByUserId: userId ? BigInt(userId) : null,
            },
          });
          processedAddons.push(updatedAddon);
          updatedCount++;
        } else {
          // Create new addon
          const createdAddon = await tx.addonItem.create({
            data: {
              ...addonData,
              createdByUserId: userId ? BigInt(userId) : null,
            },
          });
          processedAddons.push(createdAddon);
          createdCount++;
        }
      }

      return processedAddons;
    });

    // Build appropriate message
    let message = '';
    if (createdCount > 0 && updatedCount > 0) {
      message = `Successfully created ${createdCount} and updated ${updatedCount} addon items`;
    } else if (updatedCount > 0) {
      message = `Successfully updated ${updatedCount} addon items`;
    } else {
      message = `Successfully created ${createdCount} addon items`;
    }

    return NextResponse.json({
      success: true,
      message,
      createdCount,
      updatedCount,
      data: serializeBigInt(results),
    });
  } catch (error) {
    console.error('Bulk addon upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create addon items',
      },
      { status: 500 }
    );
  }
});
