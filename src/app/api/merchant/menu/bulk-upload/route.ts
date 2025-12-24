import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkMenuItemInput {
  name: string;
  description?: string;
  price: number;
  categoryIds?: string[];
  isActive?: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  trackStock?: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock?: boolean;
}

/**
 * POST /api/merchant/menu/bulk-upload
 * 
 * Bulk create menu items
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
    const { items } = body as { items: BulkMenuItemInput[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No items provided' },
        { status: 400 }
      );
    }

    // Validate max items
    if (items.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Maximum 100 items allowed per upload' },
        { status: 400 }
      );
    }

    // Get all categories for the merchant (for validation)
    const merchantCategories = await prisma.menuCategory.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validCategoryIds = new Set(merchantCategories.map(c => c.id.toString()));

    // Create menu items in a transaction
    const createdMenus = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of items) {
        // Validate required fields
        if (!item.name || item.name.trim() === '') {
          throw new Error(`Menu name is required`);
        }

        if (item.price === undefined || item.price === null || isNaN(item.price) || item.price < 0) {
          throw new Error(`Valid price is required for "${item.name}"`);
        }

        // Filter valid category IDs
        const validatedCategoryIds = (item.categoryIds || []).filter(id => validCategoryIds.has(id));

        // Get first category as primary (for backward compatibility)
        const primaryCategoryId = validatedCategoryIds.length > 0 ? BigInt(validatedCategoryIds[0]) : null;

        // Create menu item
        const menu = await tx.menu.create({
          data: {
            merchantId: merchantId!,
            name: item.name.trim(),
            description: item.description?.trim() || null,
            price: item.price,
            categoryId: primaryCategoryId,
            isActive: item.isActive !== false, // Default true
            isSpicy: item.isSpicy || false,
            isBestSeller: item.isBestSeller || false,
            isSignature: item.isSignature || false,
            isRecommended: item.isRecommended || false,
            trackStock: item.trackStock || false,
            stockQty: item.trackStock ? (item.stockQty ?? 0) : null,
            dailyStockTemplate: item.trackStock ? item.dailyStockTemplate : null,
            autoResetStock: item.trackStock ? (item.autoResetStock || false) : false,
            createdByUserId: userId ? BigInt(userId) : null,
          },
        });

        // Create category relationships (many-to-many)
        if (validatedCategoryIds.length > 0) {
          await tx.menuCategoryItem.createMany({
            data: validatedCategoryIds.map(categoryId => ({
              menuId: menu.id,
              categoryId: BigInt(categoryId),
            })),
          });
        }

        results.push(menu);
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdMenus.length} menu items`,
      createdCount: createdMenus.length,
      data: serializeBigInt(createdMenus),
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create menu items',
      },
      { status: 500 }
    );
  }
});
