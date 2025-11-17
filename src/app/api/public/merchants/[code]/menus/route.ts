/**
 * Public Merchant Menus API
 * GET /api/public/merchants/[code]/menus - Get merchant menu items
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import menuService from '@/lib/services/MenuService';

/**
 * GET /api/public/merchants/[code]/menus
 * Public endpoint to get merchant menu items
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
    const merchant = await merchantService.getMerchantByCode(params.code);

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merchantData = merchant as unknown as Record<string, any>;

    // Get category filter from query params
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');

    // Get menus for this merchant
    const menus = await menuService.getMenusByMerchant(
      merchantData.id,
      categoryId ? BigInt(categoryId) : undefined
    );

    // Format response
    const formattedMenus = menus.map((menu) => {
      const menuData = menu as any;

      // ✅ Extract all categories from many-to-many relationship
      const menuCategories = (menuData.categories || []).map((mc: any) => ({
        id: mc.category.id.toString(),
        name: mc.category.name,
      }));

      return {
        id: menuData.id.toString(),
        // ✅ Return first category ID for backward compatibility
        categoryId: menuCategories[0]?.id || null,
        // ✅ Return all categories
        categories: menuCategories,
        name: menuData.name,
        description: menuData.description || null,
        price: menuData.price,
        imageUrl: menuData.imageUrl || null,
        isActive: menuData.isActive,
        trackStock: menuData.trackStock,
        stockQty: menuData.stockQty || null,
        // ✅ Return first category for display
        category: menuCategories[0] || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedMenus,
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
