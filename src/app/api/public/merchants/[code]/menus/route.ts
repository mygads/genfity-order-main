/**
 * Public Merchant Menus API
 * GET /api/public/merchants/[code]/menus - Get merchant menu items
 * 
 * ✅ FIXED: Support many-to-many categories via MenuCategoryItem
 * ✅ UPDATED: Promo prices now computed from SpecialPrice table
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';

/**
 * GET /api/public/merchants/[code]/menus
 * Public endpoint to get merchant menu items with many-to-many category support
 * Query params:
 * - category: Filter by category ID (optional)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  try {
    // Get merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.code },
      select: { id: true, isActive: true },
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

    // Get category filter from query params
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');

    // Build where condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      merchantId: merchant.id,
      isActive: true,
      deletedAt: null, // ✅ Exclude soft-deleted menus
    };

    // Add category filter if provided (via many-to-many relation)
    if (categoryId) {
      if (categoryId === 'uncategorized') {
        // Virtual "All Menu" category: menus with no categories
        whereCondition.categories = {
          none: {},
        };
      } else {
        // Regular category filter
        whereCondition.categories = {
          some: {
            categoryId: BigInt(categoryId),
          },
        };
      }
    }


    // Get menus with their categories and addon categories
    const menus = await prisma.menu.findMany({
      where: whereCondition,
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
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

    // Get order counts for best seller sorting
    // Count completed orders for each menu in the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const orderCounts = await prisma.orderItem.groupBy({
      by: ['menuId'],
      where: {
        menuId: { in: menuIds },
        order: {
          merchantId: merchant.id,
          status: { in: ['COMPLETED', 'READY', 'IN_PROGRESS', 'ACCEPTED'] },
          createdAt: { gte: ninetyDaysAgo },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // Create a map of menuId -> orderCount
    const orderCountMap = new Map<string, number>();
    orderCounts.forEach(item => {
      orderCountMap.set(item.menuId.toString(), item._sum?.quantity || 0);
    });

    // Format response with serialization and computed promo data
    const formattedMenus = menus.map((menu) => {
      const menuIdStr = menu.id.toString();
      const promoPrice = activePromoPrices.get(menuIdStr) ?? null;
      const isPromo = promoPrice !== null;

      return {
        id: menuIdStr,
        name: menu.name,
        description: menu.description,
        price: decimalToNumber(menu.price),
        imageUrl: menu.imageUrl,
        isActive: menu.isActive,
        isPromo, // Computed from SpecialPrice
        isSpicy: menu.isSpicy,
        isBestSeller: menu.isBestSeller,
        isSignature: menu.isSignature,
        isRecommended: menu.isRecommended,
        promoPrice, // Computed from SpecialPrice
        orderCount: orderCountMap.get(menuIdStr) || 0, // Order count for best seller sorting
        trackStock: menu.trackStock,
        stockQty: menu.stockQty,
        categories: menu.categories.map(mc => ({
          id: mc.category.id.toString(),
          name: mc.category.name,
        })),
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
            isActive: item.isActive, // ✅ Added for availability check
          })),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(formattedMenus),
      message: 'Menus retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting menus:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve menus',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
