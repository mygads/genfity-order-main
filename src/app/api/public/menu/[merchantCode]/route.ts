/**
 * Public Menu Browsing API
 * GET /api/public/menu/[merchantCode] - Get merchant menu with categories
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import menuService from '@/lib/services/MenuService';

/**
 * GET /api/public/menu/[merchantCode]
 * Public endpoint to browse merchant menu
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  try {
    // Get merchant by code
    const merchant = await merchantService.getMerchantByCode(params.merchantCode);

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

    // Get all categories
    const categories = await menuService.getCategoriesByMerchant(merchantData.id);

    // Get all menus
    const menus = await menuService.getMenusByMerchant(merchantData.id);

    // Group menus by category
    const menusByCategory = categories.map(category => ({
      category: {
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
      menus: menus
        .filter(menu => menu.categoryId === category.id)
        .map(menu => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const menuData = menu as any;
          return {
            id: menuData.id.toString(),
            name: menuData.name,
            description: menuData.description,
            price: menuData.price,
            imageUrl: menuData.imageUrl,
            isActive: menuData.isActive,
            trackStock: menuData.trackStock,
            stockQty: menuData.stockQty,
          };
        }),
    }));

    return NextResponse.json({
      success: true,
      data: {
        merchant: {
          code: merchantData.code,
          name: merchantData.name,
          description: merchantData.description,
          logoUrl: merchantData.logoUrl,
        },
        menusByCategory,
      },
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
