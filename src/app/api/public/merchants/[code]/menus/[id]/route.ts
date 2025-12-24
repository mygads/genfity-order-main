/**
 * Public Menu Detail API
 * GET /api/public/merchants/[code]/menus/[id] - Get menu item details
 * 
 * @specification copilot-instructions.md - Database Schema
 * @description
 * Returns detailed information about a specific menu item, including:
 * - Menu details (name, description, price, image)
 * - Stock availability
 * - Active status
 * - Promo info (computed from SpecialPrice table)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';

/**
 * GET /api/public/merchants/[code]/menus/[id]
 * Public endpoint to get menu item details
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

    // Parse menu ID
    const menuId = BigInt(id);

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

    // Get menu details
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId: merchant.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        stockQty: true,
        isActive: true,
        trackStock: true,
        dailyStockTemplate: true,
        // Note: Promo fields removed - computed from SpecialPrice table
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          error: 'MENU_NOT_FOUND',
          message: 'Menu item not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get active promo price from SpecialPrice table
    const promoPrice = await SpecialPriceService.getActivePromoPrice(menu.id);
    const isPromo = promoPrice !== null;

    // Serialize BigInt values
    const serializedMenu = serializeBigInt(menu);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...serializedMenu,
          price: decimalToNumber(menu.price), // Convert Decimal to number with precision
          isPromo, // Computed from SpecialPrice
          promoPrice, // Computed from SpecialPrice
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [API ERROR] /api/public/merchants/[code]/menus/[id]:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch menu details',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
