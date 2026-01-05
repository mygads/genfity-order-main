/**
 * Permanent Delete Addon Item API
 * DELETE /api/merchant/addon-items/:id/permanent-delete - Permanently delete a soft-deleted addon item
 *
 * @description Permanently deletes an addon item from the archive.
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

    const addonItemId = parseInt(params?.id || '0');
    if (isNaN(addonItemId) || addonItemId === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid addon item ID' },
        { status: 400 }
      );
    }

    // Verify the addon item exists, belongs to the merchant's addon category, and is soft-deleted
    const addonItem = await prisma.addonItem.findFirst({
      where: {
        id: BigInt(addonItemId),
        deletedAt: { not: null },
        addonCategory: {
          merchantId: BigInt(merchantId),
        },
      },
      select: { id: true, name: true },
    });

    if (!addonItem) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Archived addon item not found' },
        { status: 404 }
      );
    }

    // Delete related order item addons first (if any)
    await prisma.orderItemAddon.deleteMany({
      where: { addonItemId: BigInt(addonItemId) },
    });

    // Permanently delete the addon item
    await prisma.addonItem.delete({
      where: { id: BigInt(addonItemId) },
    });

    console.log(`🗑️ Addon Item ${addonItem.name} (ID: ${addonItemId}) permanently deleted`);

    return NextResponse.json({
      success: true,
      message: 'Addon item permanently deleted',
      data: serializeBigInt({ id: addonItemId, name: addonItem.name }),
    });
  } catch (error) {
    console.error('❌ Error permanently deleting addon item:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete addon item permanently',
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
