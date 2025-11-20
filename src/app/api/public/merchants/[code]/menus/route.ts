/**
 * Public Merchant Menus API
 * GET /api/public/merchants/[code]/menus - Get merchant menu items
 * 
 * ✅ FIXED: Support many-to-many categories via MenuCategoryItem
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

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
    const whereCondition: any = {
      merchantId: merchant.id,
      isActive: true,
      deletedAt: null, // ✅ Exclude soft-deleted menus
    };

    // Add category filter if provided (via many-to-many relation)
    if (categoryId) {
      whereCondition.categories = {
        some: {
          categoryId: BigInt(categoryId),
        },
      };
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

    // Format response with serialization
    const formattedMenus = menus.map((menu) => ({
      id: menu.id.toString(),
      name: menu.name,
      description: menu.description,
      price: decimalToNumber(menu.price),
      imageUrl: menu.imageUrl,
      isActive: menu.isActive,
      isPromo: menu.isPromo,
      promoPrice: menu.promoPrice ? decimalToNumber(menu.promoPrice) : null,
      promoStartDate: menu.promoStartDate?.toISOString(),
      promoEndDate: menu.promoEndDate?.toISOString(),
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
        })),
      })),
    }));

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
