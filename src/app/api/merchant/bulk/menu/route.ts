/**
 * Bulk Operations API for Menu Items
 * POST /api/merchant/bulk/menu - Batch update menu items
 * 
 * Features:
 * - Batch update prices
 * - Batch update stock
 * - Batch update status (active/inactive)
 * - Batch update categories
 * - Batch delete (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Bulk operation types
 */
type BulkOperation = 
  | 'UPDATE_PRICE'
  | 'UPDATE_PRICE_PERCENT'
  | 'UPDATE_STOCK'
  | 'SET_STOCK'
  | 'UPDATE_STATUS'
  | 'UPDATE_CATEGORIES'
  | 'DELETE';

interface BulkRequestBody {
  operation: BulkOperation;
  menuIds: string[];
  value?: number | boolean | string[];
  options?: {
    roundTo?: number; // For price operations
    minPrice?: number;
    maxPrice?: number;
  };
}

/**
 * POST /api/merchant/bulk/menu
 * Execute bulk operations on menu items
 */
export const POST = withMerchant(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const body: BulkRequestBody = await request.json();
    const { operation, menuIds, value, options } = body;

    // Validate input
    if (!operation || !menuIds || menuIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', message: 'Operation and menuIds are required' },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const ids = menuIds.map(id => BigInt(id));

    // Verify all menus belong to merchant
    const menuCount = await prisma.menu.count({
      where: {
        id: { in: ids },
        merchantId: context.merchantId,
        deletedAt: null,
      },
    });

    if (menuCount !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid menus', message: 'Some menu items not found or access denied' },
        { status: 400 }
      );
    }

    let result;
    const timestamp = new Date();

    switch (operation) {
      case 'UPDATE_PRICE': {
        // Set absolute price
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Price must be a positive number' },
            { status: 400 }
          );
        }
        
        result = await prisma.menu.updateMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
          data: {
            price: value,
            updatedAt: timestamp,
            updatedByUserId: context.userId,
          },
        });
        break;
      }

      case 'UPDATE_PRICE_PERCENT': {
        // Increase/decrease price by percentage
        if (typeof value !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Percentage must be a number' },
            { status: 400 }
          );
        }

        // Get current prices
        const menus = await prisma.menu.findMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
          select: { id: true, price: true },
        });

        // Update each menu with calculated price
        const updates = menus.map(menu => {
          const currentPrice = parseFloat(menu.price.toString());
          let newPrice = currentPrice * (1 + value / 100);
          
          // Apply rounding if specified
          if (options?.roundTo) {
            newPrice = Math.round(newPrice / options.roundTo) * options.roundTo;
          }
          
          // Apply min/max bounds
          if (options?.minPrice !== undefined) {
            newPrice = Math.max(newPrice, options.minPrice);
          }
          if (options?.maxPrice !== undefined) {
            newPrice = Math.min(newPrice, options.maxPrice);
          }

          return prisma.menu.update({
            where: { id: menu.id },
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
        // Add/subtract from current stock
        if (typeof value !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Stock adjustment must be a number' },
            { status: 400 }
          );
        }

        // Get current stock values
        const menus = await prisma.menu.findMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
          select: { id: true, stockQty: true },
        });

        const updates = menus.map(menu => {
          const currentStock = menu.stockQty ?? 0;
          const newStock = Math.max(0, currentStock + value);

          return prisma.menu.update({
            where: { id: menu.id },
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
        // Set absolute stock value
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Stock must be a non-negative number' },
            { status: 400 }
          );
        }

        result = await prisma.menu.updateMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
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
        // Set active/inactive status
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Status must be true or false' },
            { status: 400 }
          );
        }

        result = await prisma.menu.updateMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
          data: {
            isActive: value,
            updatedAt: timestamp,
            updatedByUserId: context.userId,
          },
        });
        break;
      }

      case 'UPDATE_CATEGORIES': {
        // Update menu categories
        if (!Array.isArray(value)) {
          return NextResponse.json(
            { success: false, error: 'Invalid value', message: 'Categories must be an array of IDs' },
            { status: 400 }
          );
        }

        const categoryIds = value.map(id => BigInt(id));

        // Verify categories belong to merchant
        const categoryCount = await prisma.menuCategory.count({
          where: {
            id: { in: categoryIds },
            merchantId: context.merchantId,
            deletedAt: null,
          },
        });

        if (categoryCount !== categoryIds.length) {
          return NextResponse.json(
            { success: false, error: 'Invalid categories', message: 'Some categories not found' },
            { status: 400 }
          );
        }

        // Update categories for each menu
        const updates = ids.map(menuId => 
          prisma.$transaction([
            // Remove existing category associations
            prisma.menuCategoryItem.deleteMany({
              where: { menuId },
            }),
            // Add new category associations
            prisma.menuCategoryItem.createMany({
              data: categoryIds.map(categoryId => ({
                menuId,
                categoryId,
              })),
            }),
            // Update menu timestamp
            prisma.menu.update({
              where: { id: menuId },
              data: {
                updatedAt: timestamp,
                updatedByUserId: context.userId,
              },
            }),
          ])
        );

        await Promise.all(updates);
        result = { count: ids.length };
        break;
      }

      case 'DELETE': {
        // Soft delete menus
        result = await prisma.menu.updateMany({
          where: { id: { in: ids }, merchantId: context.merchantId },
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
        menuIds,
      }),
      message: `Successfully updated ${result.count} menu items`,
    });
  } catch (error) {
    console.error('Bulk menu operation error:', error);
    return NextResponse.json(
      { success: false, error: 'OPERATION_ERROR', message: 'Failed to execute bulk operation' },
      { status: 500 }
    );
  }
});
