import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface ReorderCategoryDto {
  id: string;
  sortOrder: number;
}

/**
 * POST /api/merchant/categories/reorder
 * Update sort order for multiple categories
 */
export const POST = withMerchant(async (req: NextRequest, { userId, merchantId }) => {
  try {
    const body = await req.json();
    const { categories } = body as { categories: ReorderCategoryDto[] };

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Categories array is required' },
        { status: 400 }
      );
    }

    // Validate all categories belong to this merchant
    const categoryIds = categories.map(cat => BigInt(cat.id));
    const existingCategories = await prisma.menuCategory.findMany({
      where: {
        id: { in: categoryIds },
        merchantId: merchantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingCategories.length !== categories.length) {
      return NextResponse.json(
        { success: false, message: 'Some categories not found or do not belong to your merchant' },
        { status: 404 }
      );
    }

    // Normalize sort orders: ensure sequential values starting from 0 (no gaps, no duplicates)
    // Sort by the provided sortOrder first, then normalize
    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const normalizedCategories = sortedCategories.map((cat, index) => ({
      id: cat.id,
      sortOrder: index, // Sequential: 0, 1, 2, 3, ...
    }));

    // Update all categories in a transaction with normalized values
    const updatePromises = normalizedCategories.map((cat) =>
      prisma.menuCategory.update({
        where: { id: BigInt(cat.id) },
        data: {
          sortOrder: cat.sortOrder,
          updatedByUserId: userId,
        },
      })
    );

    await prisma.$transaction(updatePromises);

    // Fetch updated categories
    const updatedCategories = await prisma.menuCategory.findMany({
      where: {
        merchantId: merchantId,
        deletedAt: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Categories reordered successfully',
      data: serializeBigInt(updatedCategories),
    });
  } catch (error) {
    console.error('Category reorder error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reorder categories',
      },
      { status: 500 }
    );
  }
});
