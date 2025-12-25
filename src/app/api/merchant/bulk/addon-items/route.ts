/**
 * Bulk Operations API for Addon Items
 * POST /api/merchant/bulk/addon-items - Batch update addon items
 * 
 * Features:
 * - Batch update prices
 * - Batch update stock
 * - Batch update status (active/inactive)
 * - Batch delete (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Bulk operation types for addon items
 */
type BulkOperation = 
  | 'UPDATE_PRICE'
  | 'UPDATE_PRICE_PERCENT'
  | 'UPDATE_STOCK'
  | 'SET_STOCK'
  | 'UPDATE_STATUS'
  | 'DELETE';

interface BulkRequestBody {
  operation: BulkOperation;
  addonItemIds: string[];
  value?: number | boolean;
  options?: {
    roundTo?: number;
    minPrice?: number;
    maxPrice?: number;
  };
}

/**
 * POST /api/merchant/bulk/addon-items
 * Execute bulk operations on addon items
 */
export const POST = withMerchant(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const body: BulkRequestBody = await request.json();
    const { operation, addonItemIds, value, options } = body;

    // Validate input
    if (!operation || !addonItemIds || addonItemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', message: 'Operation and addonItemIds are required' },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const ids = addonItemIds.map(id => BigInt(id));

    // Verify all addon items belong to merchant (via addon category)
    const addonItems = await prisma.addonItem.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      include: {
        addonCategory: {
          select: { merchantId: true },
        },
      },
    });

    const validItems = addonItems.filter(item => 
      item.addonCategory.merchantId === context.merchantId
    );

    if (validItems.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid items', message: 'Some addon items not found or access denied' },
        { status: 400 }
      );
    }

    const validIds = validItems.map(item => item.id);
    let result;
    const timestamp = new Date();

    switch (operation) {
      case 'UPDATE_PRICE': {
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Price must be a positive number' },
            { status: 400 }
          );
        }
        
        result = await prisma.addonItem.updateMany({
          where: { id: { in: validIds } },
          data: {
            price: value,
            updatedAt: timestamp,
            updatedByUserId: context.userId,
          },
        });
        break;
      }

      case 'UPDATE_PRICE_PERCENT': {
        if (typeof value !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Percentage must be a number' },
            { status: 400 }
          );
        }

        const updates = validItems.map(item => {
          const currentPrice = parseFloat(item.price.toString());
          let newPrice = currentPrice * (1 + value / 100);
          
          if (options?.roundTo) {
            newPrice = Math.round(newPrice / options.roundTo) * options.roundTo;
          }
          if (options?.minPrice !== undefined) {
            newPrice = Math.max(newPrice, options.minPrice);
          }
          if (options?.maxPrice !== undefined) {
            newPrice = Math.min(newPrice, options.maxPrice);
          }

          return prisma.addonItem.update({
            where: { id: item.id },
            data: {
              price: newPrice,
              updatedAt: timestamp,
              updatedByUserId: context.userId,
            },
          });
        });

        await prisma.$transaction(updates);
        result = { count: updates.length };
        break;
      }

      case 'UPDATE_STOCK': {
        if (typeof value !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Stock adjustment must be a number' },
            { status: 400 }
          );
        }

        const updates = validItems.map(item => {
          const currentStock = item.stockQty ?? 0;
          const newStock = Math.max(0, currentStock + value);

          return prisma.addonItem.update({
            where: { id: item.id },
            data: {
              stockQty: newStock,
              trackStock: true,
              updatedAt: timestamp,
              updatedByUserId: context.userId,
            },
          });
        });

        await prisma.$transaction(updates);
        result = { count: updates.length };
        break;
      }

      case 'SET_STOCK': {
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Stock must be a non-negative number' },
            { status: 400 }
          );
        }

        result = await prisma.addonItem.updateMany({
          where: { id: { in: validIds } },
          data: {
            stockQty: value,
            trackStock: true,
            updatedAt: timestamp,
            updatedByUserId: context.userId,
          },
        });
        break;
      }

      case 'UPDATE_STATUS': {
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Status must be true or false' },
            { status: 400 }
          );
        }

        result = await prisma.addonItem.updateMany({
          where: { id: { in: validIds } },
          data: {
            isActive: value,
            updatedAt: timestamp,
            updatedByUserId: context.userId,
          },
        });
        break;
      }

      case 'DELETE': {
        result = await prisma.addonItem.updateMany({
          where: { id: { in: validIds } },
          data: {
            deletedAt: timestamp,
            deletedByUserId: context.userId,
            isActive: false,
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation', message: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        operation,
        affected: result.count,
        addonItemIds,
      }),
      message: `Successfully updated ${result.count} addon items`,
    });
  } catch (error) {
    console.error('Bulk addon item operation error:', error);
    return NextResponse.json(
      { success: false, error: 'OPERATION_ERROR', message: 'Failed to execute bulk operation' },
      { status: 500 }
    );
  }
});
