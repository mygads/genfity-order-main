import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkMenuItemInput {
  id?: string; // Optional - for updating existing menu
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
 * Bulk create or update menu items
 * - If item has `id`, update existing menu
 * - If item name matches existing menu, update it (with upsert mode)
 * - Otherwise create new menu
 * 
 * @specification copilot-instructions.md - Prisma ORM Usage
 * @auth Requires merchant authentication
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { merchantId, userId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found', statusCode: 400 },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { items, upsertByName = false } = body as {
      items: BulkMenuItemInput[];
      upsertByName?: boolean; // If true, match by name and update
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'No items provided', statusCode: 400 },
        { status: 400 }
      );
    }

    // Validate max items
    if (items.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'TOO_MANY_ITEMS',
          message: 'Maximum 100 items allowed per upload',
          statusCode: 400,
        },
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

    // Get existing menus for duplicate detection
    const existingMenus = await prisma.menu.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    const menuNameToId = new Map(existingMenus.map(m => [m.name.toLowerCase().trim(), m.id]));

    // Track created and updated counts
    let createdCount = 0;
    let updatedCount = 0;

    // Process menu items in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedMenus = [];

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

        // Check if this is an update (by ID or name match)
        let existingMenuId: bigint | null = null;

        if (item.id) {
          // Explicit ID provided - update that menu
          existingMenuId = BigInt(item.id);
        } else if (upsertByName) {
          // Match by name
          const matchingId = menuNameToId.get(item.name.toLowerCase().trim());
          if (matchingId) {
            existingMenuId = matchingId;
          }
        }

        const menuData = {
          name: item.name.trim(),
          description: item.description?.trim() || null,
          price: item.price,
          categoryId: primaryCategoryId,
          isActive: item.isActive !== false,
          isSpicy: item.isSpicy || false,
          isBestSeller: item.isBestSeller || false,
          isSignature: item.isSignature || false,
          isRecommended: item.isRecommended || false,
          trackStock: item.trackStock || false,
          stockQty: item.trackStock ? (item.stockQty ?? 0) : null,
          dailyStockTemplate: item.trackStock ? item.dailyStockTemplate : null,
          autoResetStock: item.trackStock ? (item.autoResetStock || false) : false,
        };

        let menu: Awaited<ReturnType<typeof tx.menu.create>>;

        if (existingMenuId) {
          // Update existing menu
          menu = await tx.menu.update({
            where: { id: existingMenuId },
            data: {
              ...menuData,
              updatedAt: new Date(),
            },
          });

          // Update category relationships
          await tx.menuCategoryItem.deleteMany({
            where: { menuId: existingMenuId },
          });

          if (validatedCategoryIds.length > 0) {
            await tx.menuCategoryItem.createMany({
              data: validatedCategoryIds.map(categoryId => ({
                menuId: existingMenuId!,
                categoryId: BigInt(categoryId),
              })),
            });
          }

          updatedCount++;
        } else {
          // Create new menu
          menu = await tx.menu.create({
            data: {
              merchantId: merchantId!,
              ...menuData,
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

          createdCount++;
        }

        processedMenus.push(menu);
      }

      return processedMenus;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} menu items (${createdCount} created, ${updatedCount} updated)`,
      createdCount,
      updatedCount,
      totalCount: results.length,
      data: serializeBigInt(results),
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process menu items',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
