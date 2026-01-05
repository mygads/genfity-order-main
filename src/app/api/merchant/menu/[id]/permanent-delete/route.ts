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

    const menuId = parseInt(params?.id || '0');
    if (isNaN(menuId) || menuId === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid menu ID' },
        { status: 400 }
      );
    }

    // Verify the menu exists, belongs to the merchant, and is soft-deleted
    const menu = await prisma.menu.findFirst({
      where: {
        id: BigInt(menuId),
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
      where: { menuId: BigInt(menuId) },
    });

    await prisma.menuAddonCategory.deleteMany({
      where: { menuId: BigInt(menuId) },
    });

    // Permanently delete the menu
    await prisma.menu.delete({
      where: { id: BigInt(menuId) },
    });

    console.log(`🗑️ Menu ${menu.name} (ID: ${menuId}) permanently deleted`);

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
