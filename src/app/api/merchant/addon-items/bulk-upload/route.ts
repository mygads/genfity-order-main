import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkAddonItemInput {
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
 * Bulk create addon items
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
    const { items } = body as { items: BulkAddonItemInput[] };

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

    // Create addon items in a transaction
    const createdAddons = await prisma.$transaction(async (tx) => {
      const results = [];

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

        // Create addon item
        const addonItem = await tx.addonItem.create({
          data: {
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
            createdByUserId: userId ? BigInt(userId) : null,
          },
        });

        results.push(addonItem);
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdAddons.length} addon items`,
      createdCount: createdAddons.length,
      data: serializeBigInt(createdAddons),
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
