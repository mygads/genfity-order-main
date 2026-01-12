/**
 * Public Menu Browsing API
 * GET /api/public/menu/[merchantCode] - Get merchant menu with categories
 * 
 * ✅ FIXED: Support many-to-many menu-category relationship via MenuCategoryItem
 * ✅ UPDATED: Promo prices now computed from SpecialPrice table
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';

/**
 * GET /api/public/menu/[merchantCode]
 * Public endpoint to browse merchant menu with proper many-to-many category support
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  try {
    // Get merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.merchantCode },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        logoUrl: true,
        isActive: true,
        isOpen: true,
      },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found or inactive',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get all categories (exclude soft-deleted)
    const categories = await prisma.menuCategory.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get all menus with their categories via MenuCategoryItem and addon categories
    const menus = await prisma.menu.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
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
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                  },
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get active promo prices from SpecialPrice table
    const menuIds = menus.map(m => m.id);
    const activePromoPrices = await SpecialPriceService.getActivePromoPrices(menuIds);

    // Group menus by category (handle many-to-many)
    const menusByCategory = categories.map(category => {
      const categoryMenus = menus.filter(menu => 
        menu.categories.some(mc => mc.categoryId === category.id)
      );

      return {
        category: {
          id: category.id.toString(),
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
        },
        menus: categoryMenus.map(menu => {
          const menuIdStr = menu.id.toString();
          const promoPrice = activePromoPrices.get(menuIdStr) ?? null;
          const isPromo = promoPrice !== null;

          return {
            id: menuIdStr,
            name: menu.name,
            description: menu.description,
            price: decimalToNumber(menu.price),
            imageUrl: menu.imageUrl,
            imageThumbUrl: (menu as unknown as { imageThumbUrl?: string | null }).imageThumbUrl ?? null,
            imageThumbMeta: (menu as unknown as { imageThumbMeta?: unknown | null }).imageThumbMeta ?? null,
            isActive: menu.isActive,
            isPromo, // Computed from SpecialPrice
            isSpicy: menu.isSpicy,
            isBestSeller: menu.isBestSeller,
            isSignature: menu.isSignature,
            isRecommended: menu.isRecommended,
            promoPrice, // Computed from SpecialPrice
            trackStock: menu.trackStock,
            stockQty: menu.stockQty,
            addonCategories: menu.addonCategories.map(mac => ({
              id: mac.addonCategory.id.toString(),
              name: mac.addonCategory.name,
              description: mac.addonCategory.description,
              minSelection: mac.addonCategory.minSelection,
              maxSelection: mac.addonCategory.maxSelection,
              isRequired: mac.isRequired,
              displayOrder: mac.displayOrder,
              addonItems: mac.addonCategory.addonItems.map(item => ({
                id: item.id.toString(),
                name: item.name,
                description: item.description,
                price: decimalToNumber(item.price),
                inputType: item.inputType,
                displayOrder: item.displayOrder,
                trackStock: item.trackStock,
                stockQty: item.stockQty,
              })),
            })),
          };
        }),
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        merchant: {
          code: merchant.code,
          name: merchant.name,
          description: merchant.description,
          logoUrl: merchant.logoUrl,
          isOpen: merchant.isOpen,
        },
        menusByCategory,
      }),
      message: 'Menu retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
