/**
 * Public Merchant Categories API
 * GET /api/public/merchants/[code]/categories - Get merchant categories
 * 
 * ✅ FIXED: Use Prisma directly with soft delete support
 * ✅ Added: Virtual "All Menu" category for uncategorized menus
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/public/merchants/[code]/categories
 * Public endpoint to get merchant categories (exclude soft-deleted)
 * Includes virtual "All Menu" category if there are uncategorized menus
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

    // Get all active categories (exclude soft-deleted)
    const categories = await prisma.menuCategory.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
        deletedAt: null, // ✅ Exclude soft-deleted categories
      },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Check for uncategorized menus (active menus with no categories)
    const uncategorizedMenusCount = await prisma.menu.count({
      where: {
        merchantId: merchant.id,
        isActive: true,
        deletedAt: null,
        categories: {
          none: {}, // Menus with no categories at all
        },
      },
    });

    // Build final categories list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalCategories: any[] = serializeBigInt(categories);

    // Add virtual "All Menu" category at the end if there are uncategorized menus
    if (uncategorizedMenusCount > 0) {
      const maxSortOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sortOrder ?? 0))
        : 0;

      finalCategories.push({
        id: 'uncategorized', // Virtual ID
        name: 'All Menu',
        description: 'Other menu items',
        sortOrder: maxSortOrder + 1,
        isVirtual: true, // Flag to identify virtual category
      });
    }


    return NextResponse.json({
      success: true,
      data: finalCategories,
      message: 'Categories retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve categories',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
