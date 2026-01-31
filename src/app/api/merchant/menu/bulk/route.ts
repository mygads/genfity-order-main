/**
 * Bulk Operations API for Menus
 * POST /api/merchant/menu/bulk - Batch update prices, stock, status
 * 
 * Features:
 * - Batch update menu prices
 * - Batch update stock quantities  
 * - Batch toggle active status
 * - Batch delete (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';

type BulkOperationType = 'UPDATE_PRICE' | 'UPDATE_STOCK' | 'TOGGLE_STATUS' | 'DELETE' | 'UPDATE_SCHEDULE';

interface BulkOperationPayload {
  operation: BulkOperationType;
  menuIds: string[];
  // For UPDATE_PRICE
  priceChange?: {
    type: 'FIXED' | 'PERCENTAGE';
    value: number; // Fixed amount or percentage
    direction: 'INCREASE' | 'DECREASE' | 'SET'; // SET means absolute value
  };
  // For UPDATE_STOCK
  stockChange?: {
    type: 'SET' | 'ADD' | 'SUBTRACT';
    value: number;
    updateTemplate?: boolean; // Also update dailyStockTemplate
  };
  // For TOGGLE_STATUS
  statusChange?: {
    isActive: boolean;
  };
  // For UPDATE_SCHEDULE
  scheduleChange?: {
    scheduleEnabled: boolean;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    scheduleDays?: number[];
  };
}

async function handler(
  req: NextRequest,
  authContext: AuthContext
) {
  const { merchantId, userId } = authContext;

  try {
    const body: BulkOperationPayload = await req.json();
    const { operation, menuIds, priceChange, stockChange, statusChange, scheduleChange } = body;

    // Validate menuIds
    if (!menuIds || menuIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'No menu items selected', statusCode: 400 },
        { status: 400 }
      );
    }

    // Convert to BigInt
    const bigIntMenuIds = menuIds.map(id => BigInt(id));

    // Verify all menus belong to this merchant
    const menuCount = await prisma.menu.count({
      where: {
        id: { in: bigIntMenuIds },
        merchantId: merchantId,
        deletedAt: null,
      },
    });

    if (menuCount !== menuIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_MENUS',
          message: 'Some menus do not exist or do not belong to your merchant',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    let result;

    switch (operation) {
      case 'UPDATE_PRICE':
        if (!priceChange) {
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_INPUT',
              message: 'Price change parameters required',
              statusCode: 400,
            },
            { status: 400 }
          );
        }
        result = await handlePriceUpdate(bigIntMenuIds, priceChange, userId);
        break;

      case 'UPDATE_STOCK':
        if (!stockChange) {
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_INPUT',
              message: 'Stock change parameters required',
              statusCode: 400,
            },
            { status: 400 }
          );
        }
        result = await handleStockUpdate(bigIntMenuIds, stockChange, userId);
        break;

      case 'TOGGLE_STATUS':
        if (!statusChange) {
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_INPUT',
              message: 'Status change parameters required',
              statusCode: 400,
            },
            { status: 400 }
          );
        }
        result = await handleStatusToggle(bigIntMenuIds, statusChange, userId);
        break;

      case 'DELETE':
        result = await handleSoftDelete(bigIntMenuIds, userId);
        break;

      case 'UPDATE_SCHEDULE':
        if (!scheduleChange) {
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_INPUT',
              message: 'Schedule change parameters required',
              statusCode: 400,
            },
            { status: 400 }
          );
        }
        result = await handleScheduleUpdate(bigIntMenuIds, scheduleChange, userId);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_OPERATION',
            message: 'Unknown operation type',
            statusCode: 400,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        operation,
        affectedCount: result.count,
      },
      message: `Successfully updated ${result.count} menu items`,
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Failed to perform bulk operation',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

// Handle price update
async function handlePriceUpdate(
  menuIds: bigint[],
  priceChange: NonNullable<BulkOperationPayload['priceChange']>,
  userId: bigint
) {
  const { type, value, direction } = priceChange;

  if (direction === 'SET') {
    // Set absolute price
    return prisma.menu.updateMany({
      where: { id: { in: menuIds } },
      data: {
        price: value,
        updatedByUserId: userId,
      },
    });
  }

  // For percentage or fixed changes, we need to update each menu individually
  const menus = await prisma.menu.findMany({
    where: { id: { in: menuIds } },
    select: { id: true, price: true },
  });

  let updatedCount = 0;
  for (const menu of menus) {
    let newPrice = Number(menu.price);
    
    if (type === 'FIXED') {
      newPrice = direction === 'INCREASE' ? newPrice + value : newPrice - value;
    } else {
      // PERCENTAGE
      const changeAmount = newPrice * (value / 100);
      newPrice = direction === 'INCREASE' ? newPrice + changeAmount : newPrice - changeAmount;
    }

    // Ensure price doesn't go below 0
    newPrice = Math.max(0, newPrice);

    await prisma.menu.update({
      where: { id: menu.id },
      data: {
        price: newPrice,
        updatedByUserId: userId,
      },
    });
    updatedCount++;
  }

  return { count: updatedCount };
}

// Handle stock update
async function handleStockUpdate(
  menuIds: bigint[],
  stockChange: NonNullable<BulkOperationPayload['stockChange']>,
  userId: bigint
) {
  const { type, value, updateTemplate } = stockChange;

  if (type === 'SET') {
    // Set absolute stock value
    const updateData: Record<string, unknown> = {
      stockQty: value,
      trackStock: true,
      updatedByUserId: userId,
    };

    if (updateTemplate) {
      updateData.dailyStockTemplate = value;
    }

    return prisma.menu.updateMany({
      where: { id: { in: menuIds } },
      data: updateData,
    });
  }

  // For ADD or SUBTRACT, update each menu individually
  const menus = await prisma.menu.findMany({
    where: { id: { in: menuIds } },
    select: { id: true, stockQty: true, dailyStockTemplate: true },
  });

  let updatedCount = 0;
  for (const menu of menus) {
    let newStock = menu.stockQty ?? 0;
    
    if (type === 'ADD') {
      newStock += value;
    } else {
      newStock -= value;
    }

    // Ensure stock doesn't go below 0
    newStock = Math.max(0, newStock);

    const updateData: Record<string, unknown> = {
      stockQty: newStock,
      trackStock: true,
      updatedByUserId: userId,
    };

    if (updateTemplate) {
      updateData.dailyStockTemplate = newStock;
    }

    await prisma.menu.update({
      where: { id: menu.id },
      data: updateData,
    });
    updatedCount++;
  }

  return { count: updatedCount };
}

// Handle status toggle
async function handleStatusToggle(
  menuIds: bigint[],
  statusChange: NonNullable<BulkOperationPayload['statusChange']>,
  userId: bigint
) {
  return prisma.menu.updateMany({
    where: { id: { in: menuIds } },
    data: {
      isActive: statusChange.isActive,
      updatedByUserId: userId,
    },
  });
}

// Handle soft delete
async function handleSoftDelete(menuIds: bigint[], userId: bigint) {
  return prisma.menu.updateMany({
    where: { id: { in: menuIds } },
    data: {
      deletedAt: new Date(),
      deletedByUserId: userId,
      isActive: false,
    },
  });
}

// Handle schedule update
async function handleScheduleUpdate(
  menuIds: bigint[],
  scheduleChange: NonNullable<BulkOperationPayload['scheduleChange']>,
  userId: bigint
) {
  const updateData: Record<string, unknown> = {
    scheduleEnabled: scheduleChange.scheduleEnabled,
    updatedByUserId: userId,
  };

  if (scheduleChange.scheduleStartTime !== undefined) {
    updateData.scheduleStartTime = scheduleChange.scheduleStartTime;
  }
  if (scheduleChange.scheduleEndTime !== undefined) {
    updateData.scheduleEndTime = scheduleChange.scheduleEndTime;
  }
  if (scheduleChange.scheduleDays !== undefined) {
    updateData.scheduleDays = scheduleChange.scheduleDays;
  }

  return prisma.menu.updateMany({
    where: { id: { in: menuIds } },
    data: updateData,
  });
}

export const POST = withMerchant(handler);
