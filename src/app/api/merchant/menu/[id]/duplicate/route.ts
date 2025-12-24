import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * POST /api/merchant/menu/duplicate/:id
 * Duplicate an existing menu item
 */
export const POST = withMerchant(async (req: NextRequest, { userId, merchantId }) => {
  try {
    // Extract menu ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const menuId = pathParts[pathParts.length - 2]; // Get ID before 'duplicate'

    if (!menuId) {
      return NextResponse.json(
        { success: false, message: 'Menu ID is required' },
        { status: 400 }
      );
    }

    // Find the original menu
    const originalMenu = await prisma.menu.findFirst({
      where: {
        id: BigInt(menuId),
        merchantId: merchantId,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        addonCategories: {
          include: {
            addonCategory: true,
          },
        },
      },
    });

    if (!originalMenu) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Create duplicate
    const duplicatedMenu = await prisma.menu.create({
      data: {
        merchantId: merchantId!,
        name: `${originalMenu.name} (Copy)`,
        description: originalMenu.description,
        price: originalMenu.price,
        imageUrl: originalMenu.imageUrl,
        isActive: false, // Duplicates start as inactive
        // Note: Promo fields removed - use SpecialPrice table
        trackStock: originalMenu.trackStock,
        stockQty: originalMenu.trackStock ? (originalMenu.dailyStockTemplate || 0) : null,
        dailyStockTemplate: originalMenu.dailyStockTemplate,
        autoResetStock: originalMenu.autoResetStock,
        createdByUserId: userId,
        // Copy category relationships
        categories: {
          create: originalMenu.categories.map((cat) => ({
            categoryId: cat.categoryId,
          })),
        },
        // Copy addon category relationships
        addonCategories: {
          create: originalMenu.addonCategories.map((addon) => ({
            addonCategoryId: addon.addonCategoryId,
          })),
        },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        addonCategories: {
          include: {
            addonCategory: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Menu item duplicated successfully',
      data: serializeBigInt(duplicatedMenu),
    });
  } catch (error) {
    console.error('Duplicate menu error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to duplicate menu item',
      },
      { status: 500 }
    );
  }
});
