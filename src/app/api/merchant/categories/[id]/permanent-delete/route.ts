/**
 * Permanent Delete Category API
 * DELETE /api/merchant/categories/:id/permanent-delete - Permanently delete a soft-deleted menu category
 *
 * @description Permanently deletes a menu category from the archive.
 * This action cannot be undone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';

async function handleDelete(
  req: NextRequest,
  authContext: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Merchant ID required' },
        { status: 401 }
      );
    }

    const categoryId = parseInt(params?.id || '0');
    if (isNaN(categoryId) || categoryId === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Verify the category exists, belongs to the merchant, and is soft-deleted
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: BigInt(categoryId),
        merchantId: BigInt(merchantId),
        deletedAt: { not: null },
      },
      select: { id: true, name: true },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Archived category not found' },
        { status: 404 }
      );
    }

    // Delete related records first (junction tables)
    await prisma.menuCategoryItem.deleteMany({
      where: { categoryId: BigInt(categoryId) },
    });

    // Permanently delete the category
    await prisma.menuCategory.delete({
      where: { id: BigInt(categoryId) },
    });

    console.log(`🗑️ Category ${category.name} (ID: ${categoryId}) permanently deleted`);

    return NextResponse.json({
      success: true,
      message: 'Category permanently deleted',
      data: serializeBigInt({ id: categoryId, name: category.name }),
    });
  } catch (error) {
    console.error('❌ Error permanently deleting category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete category permanently',
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
