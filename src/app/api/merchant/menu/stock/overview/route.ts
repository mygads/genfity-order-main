/**
 * Stock Overview API
 * GET /api/merchant/menu/stock/overview
 * 
 * Returns comprehensive stock data for menus and addon items
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handleGet(req: NextRequest, authContext: AuthContext) {
  try {
    const merchantId = authContext.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, currency: true },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Fetch all menus with stock tracking
    const menus = await prisma.menu.findMany({
      where: {
        merchantId,
        trackStock: true,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
      orderBy: { name: 'asc' },
    });

    // Fetch all addon items with stock tracking
    const addonItems = await prisma.addonItem.findMany({
      where: {
        addonCategory: {
          merchantId,
        },
        trackStock: true,
        deletedAt: null,
      },
      include: {
        addonCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform menu data
    const menuStockItems = menus.map((menu) => ({
      id: menu.id,
      type: 'menu' as const,
      name: menu.name,
      categoryName: menu.category?.name || menu.categories?.[0]?.category?.name || 'Uncategorized',
      stockQty: menu.stockQty,
      dailyStockTemplate: menu.dailyStockTemplate,
      autoResetStock: menu.autoResetStock,
      isActive: menu.isActive,
      imageUrl: menu.imageUrl,
    }));

    // Transform addon data
    const addonStockItems = addonItems.map((addon) => ({
      id: addon.id,
      type: 'addon' as const,
      name: addon.name,
      categoryName: addon.addonCategory.name,
      stockQty: addon.stockQty,
      dailyStockTemplate: addon.dailyStockTemplate,
      autoResetStock: addon.autoResetStock,
      isActive: addon.isActive,
      imageUrl: null,
    }));

    // Combine and calculate statistics
    const allItems = [...menuStockItems, ...addonStockItems];
    
    const stats = {
      total: allItems.length,
      menus: menuStockItems.length,
      addons: addonStockItems.length,
      lowStock: allItems.filter(
        (item) => item.stockQty !== null && item.stockQty > 0 && item.stockQty <= 5
      ).length,
      outOfStock: allItems.filter(
        (item) => item.stockQty === null || item.stockQty === 0
      ).length,
      healthy: allItems.filter(
        (item) => item.stockQty !== null && item.stockQty > 5
      ).length,
      withTemplate: allItems.filter(
        (item) => item.dailyStockTemplate !== null && item.autoResetStock
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        items: serializeBigInt(allItems),
        stats,
        merchant: serializeBigInt({
          id: merchant.id,
          name: merchant.name,
          currency: merchant.currency,
        }),
      },
      message: 'Stock overview retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting stock overview:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve stock overview',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
