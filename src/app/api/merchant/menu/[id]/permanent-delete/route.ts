/**
 * Permanent Delete Menu API
 * DELETE /api/merchant/menu/:id/permanent-delete - Permanently delete a soft-deleted menu item
 *
 * @description Permanently deletes a menu item from the archive.
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

    const menuIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }
    const menuId = menuIdResult.value;

    // Verify the menu exists, belongs to the merchant, and is soft-deleted
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId: BigInt(merchantId),
        deletedAt: { not: null },
      },
      select: { id: true, name: true },
    });

    if (!menu) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Archived menu not found' },
        { status: 404 }
      );
    }

    // Delete related records first (junction tables)
    await prisma.menuCategoryItem.deleteMany({
      where: { menuId },
    });

    await prisma.menuAddonCategory.deleteMany({
      where: { menuId },
    });

    // Permanently delete the menu
    await prisma.menu.delete({
      where: { id: menuId },
    });

    console.log(`🗑️ Menu ${menu.name} (ID: ${menuId.toString()}) permanently deleted`);

    return NextResponse.json({
      success: true,
      message: 'Menu permanently deleted',
      data: serializeBigInt({ id: menuId, name: menu.name }),
    });
  } catch (error) {
    console.error('❌ Error permanently deleting menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete menu permanently',
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
