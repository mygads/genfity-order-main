/**
 * Public Merchant Categories API
 * GET /api/public/merchants/[code]/categories - Get merchant categories
 * 
 * ✅ FIXED: Use Prisma directly with soft delete support
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/public/merchants/[code]/categories
 * Public endpoint to get merchant categories (exclude soft-deleted)
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

    return NextResponse.json({
      success: true,
      data: serializeBigInt(categories),
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
