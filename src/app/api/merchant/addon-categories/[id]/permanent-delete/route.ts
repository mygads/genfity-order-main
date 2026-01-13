/**
 * Permanent Delete Addon Category API
 * DELETE /api/merchant/addon-categories/:id/permanent-delete - Permanently delete a soft-deleted addon category
 *
 * @description Permanently deletes an addon category from the archive.
 * This action cannot be undone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handleDelete(
  req: NextRequest,
  authContext: AuthContext,
  contextParams: RouteContext
) {
  try {
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Merchant ID required' },
        { status: 401 }
      );
    }

    const addonCategoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!addonCategoryIdResult.ok) {
      return NextResponse.json(addonCategoryIdResult.body, { status: addonCategoryIdResult.status });
    }
    const addonCategoryId = addonCategoryIdResult.value;

    // Verify the addon category exists, belongs to the merchant, and is soft-deleted
    const addonCategory = await prisma.addonCategory.findFirst({
      where: {
        id: addonCategoryId,
        merchantId: BigInt(merchantId),
        deletedAt: { not: null },
      },
      select: { id: true, name: true },
    });

    if (!addonCategory) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Archived addon category not found' },
        { status: 404 }
      );
    }

    // Delete related records first
    // Delete menu addon category relationships
    await prisma.menuAddonCategory.deleteMany({
      where: { addonCategoryId },
    });

    // Delete addon items in this category
    await prisma.addonItem.deleteMany({
      where: { addonCategoryId },
    });

    // Permanently delete the addon category
    await prisma.addonCategory.delete({
      where: { id: addonCategoryId },
    });

    console.log(`🗑️ Addon Category ${addonCategory.name} (ID: ${addonCategoryId.toString()}) permanently deleted`);

    return NextResponse.json({
      success: true,
      message: 'Addon category permanently deleted',
      data: serializeBigInt({ id: addonCategoryId, name: addonCategory.name }),
    });
  } catch (error) {
    console.error('❌ Error permanently deleting addon category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete addon category permanently',
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
