/**
 * Public Menu Addons API
 * GET /api/public/merchants/[code]/menus/[id]/addons - Get addon categories for a menu
 * 
 * @specification copilot-instructions.md - Database Schema
 * @description
 * Returns all addon categories associated with a menu item, including:
 * - Addon category details (name, type, min/max selections)
 * - Individual addon items with pricing and availability
 * - Stock tracking information
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

/**
 * GET /api/public/merchants/[code]/menus/[id]/addons
 * Public endpoint to get addon categories for a specific menu
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  
  try {
    const { code, id } = params;

    // Validate parameters
    if (!code || !id) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Merchant code and menu ID are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Get merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code },
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

    // Parse menu ID
    const menuId = BigInt(id);

    // Verify menu exists and belongs to merchant
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId: merchant.id,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          error: 'MENU_NOT_FOUND',
          message: 'Menu not found or inactive',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    /**
     * ✅ SCHEMA VERIFIED: Menu → MenuAddonCategory → AddonCategory → AddonItem
     * 
     * Database Relations:
     * Menu (menus)
     * ├── N:M → AddonCategory via MenuAddonCategory (menu_addon_categories)
     * │   ├── menuId → Menu
     * │   ├── addonCategoryId → AddonCategory
     * │   ├── isRequired: boolean
     * │   └── displayOrder: number
     * 
     * AddonCategory (addon_categories)
     * ├── 1:N → AddonItem (addon_items)
     * ├── name: string
     * ├── description: string?
     * ├── minSelection: number
     * ├── maxSelection: number
     * └── type: 'required' | 'optional'
     * 
     * AddonItem (addon_items)
     * ├── name: string
     * ├── description: string?
     * ├── price: Decimal
     * ├── isActive: boolean
     * ├── trackStock: boolean
     * ├── stockQty: number?
     * └── displayOrder: number
     */

    // Get addon categories with items
    const menuAddonCategories = await prisma.menuAddonCategory.findMany({
      where: {
        menuId: menuId,
      },
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
      orderBy: {
        displayOrder: 'asc',
      },
    });

    // Format response
    const formattedCategories = menuAddonCategories.map((mac) => ({
      id: mac.addonCategory.id,
      name: mac.addonCategory.name,
      description: mac.addonCategory.description,
      type: mac.isRequired ? 'required' : 'optional',
      minSelections: mac.addonCategory.minSelection,
      maxSelections: mac.addonCategory.maxSelection,
      displayOrder: mac.displayOrder,
      addons: mac.addonCategory.addonItems.map((item) => {
        // Check availability (active + stock if tracked)
        const isAvailable = item.isActive && 
          (!item.trackStock || (item.stockQty !== null && item.stockQty > 0));

        return {
          id: item.id,
          categoryId: mac.addonCategory.id,
          name: item.name,
          description: item.description,
          price: decimalToNumber(item.price),
          inputType: item.inputType, // SELECT = single/multi select, QTY = quantity input
          isAvailable: isAvailable,
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          displayOrder: item.displayOrder,
        };
      }),
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(formattedCategories),
      message: 'Addon categories retrieved successfully',
      statusCode: 200,
    });

  } catch (error) {
    console.error('❌ [API] Error fetching menu addons:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve addon categories',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
