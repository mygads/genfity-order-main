/**
 * POS Menu API
 * GET /api/merchant/pos/menu - Get all menu items with addon categories for POS
 * 
 * Returns menu items with their associated addon categories and items
 * for the Point of Sale system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getPosCustomItemsSettings, getPosEditOrderSettings } from '@/lib/utils/posCustomItemsSettings';

/**
 * GET /api/merchant/pos/menu
 * Get all menu items with addon categories for POS
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId } = context;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Fetch merchant settings
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        currency: true,
        enableTax: true,
        taxPercentage: true,
        enableServiceCharge: true,
        serviceChargePercent: true,
        enablePackagingFee: true,
        packagingFeeAmount: true,
        totalTables: true,
        requireTableNumberForDineIn: true,
        posPayImmediately: true,
        features: true,
      },
    });

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

    // Fetch categories
    const categories = await prisma.menuCategory.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
    });

    const customItems = getPosCustomItemsSettings({
      features: (merchant as any).features,
      currency: merchant.currency,
    });

    const editOrderSettings = getPosEditOrderSettings({
      features: (merchant as any).features,
    });

    // Fetch menu items with addon categories
    const menuItems = await prisma.menu.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isActive: true,
        categoryId: true,
        trackStock: true,
        stockQty: true,
        isSpicy: true,
        isBestSeller: true,
        isSignature: true,
        isRecommended: true,
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                  },
                  orderBy: { displayOrder: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    isActive: true,
                    trackStock: true,
                    stockQty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Fetch active special prices
    const now = new Date();
    const specialPrices = await prisma.specialPriceItem.findMany({
      where: {
        menu: {
          merchantId: merchantId,
          deletedAt: null,
        },
        specialPrice: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      select: {
        menuId: true,
        promoPrice: true,
      },
    });

    // Create promo price map
    const promoPriceMap = new Map<string, number>();
    specialPrices.forEach((sp) => {
      if (sp.promoPrice !== null) {
        promoPriceMap.set(sp.menuId.toString(), Number(sp.promoPrice));
      }
    });

    // Transform menu items for response
    const transformedMenuItems = menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      categoryId: item.categoryId,
      trackStock: item.trackStock,
      stockQty: item.stockQty,
      isSpicy: item.isSpicy,
      isBestSeller: item.isBestSeller,
      isSignature: item.isSignature,
      isRecommended: item.isRecommended,
      promoPrice: promoPriceMap.get(item.id.toString()) ?? null,
      hasAddons: item.addonCategories.length > 0,
      addonCategories: item.addonCategories.map((mac) => ({
        id: mac.addonCategory.id,
        name: mac.addonCategory.name,
        description: mac.addonCategory.description,
        minSelection: mac.addonCategory.minSelection,
        maxSelection: mac.addonCategory.maxSelection,
        isRequired: mac.isRequired,
        addonItems: mac.addonCategory.addonItems.map((ai) => ({
          id: ai.id,
          name: ai.name,
          price: Number(ai.price),
          isActive: ai.isActive,
          trackStock: ai.trackStock,
          stockQty: ai.stockQty,
        })),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        merchant: serializeBigInt({
          ...merchant,
          posCustomItems: customItems,
          posEditOrder: editOrderSettings,
        }),
        categories: serializeBigInt(categories),
        menuItems: serializeBigInt(transformedMenuItems),
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('[GET /api/merchant/pos/menu] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch POS menu data',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
