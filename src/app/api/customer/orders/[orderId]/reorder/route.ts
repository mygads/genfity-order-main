import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { decimalToNumber } from '@/lib/utils/serializer';
import { getIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GENFITY - Customer Re-order API
 *
 * GET /api/customer/orders/[orderId]/reorder
 *
 * @description
 * Fetches order items with current menu availability for re-ordering.
 * Validates menu items still exist and are available.
 *
 * @security JWT Bearer token authentication (Customer only)
 *
 * @specification
 * - STEP_04_API_ENDPOINTS.txt - Customer Endpoints
 * - copilot-instructions.md - Authentication Requirements
 */

export const GET = withCustomer(async (
  _request: NextRequest,
  authContext: CustomerAuthContext,
  routeContext: RouteContext
): Promise<NextResponse> => {
  try {
    const orderIdNum = await getIntRouteParam(routeContext, 'orderId');
    if (orderIdNum === null || orderIdNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Fetch order with items and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderIdNum) },
      include: {
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            currency: true,
            isOpen: true,
          },
        },
        orderItems: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                isActive: true,
                deletedAt: true,
                trackStock: true,
                stockQty: true,
              },
            },
            addons: {
              include: {
                addonItem: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    isActive: true,
                    deletedAt: true,
                    trackStock: true,
                    stockQty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order belongs to customer
    if (order.customerId?.toString() !== authContext.customerId.toString()) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Access denied to this order' },
        { status: 403 }
      );
    }

    // Build re-order items with availability check
    const reorderItems = order.orderItems
      .filter((item: typeof order.orderItems[0]) => item.menuId !== null)
      .map((item: typeof order.orderItems[0]) => {
      const menu = item.menu;

      // Check menu availability
      const menuAvailable =
        menu &&
        !menu.deletedAt &&
        menu.isActive &&
        (!menu.trackStock || (menu.stockQty !== null && menu.stockQty > 0));

      // Check addons availability
      const addons = item.addons.map((addon: typeof item.addons[0]) => {
        const addonItem = addon.addonItem;
        const addonAvailable =
          addonItem &&
          !addonItem.deletedAt &&
          addonItem.isActive &&
          (!addonItem.trackStock || (addonItem.stockQty !== null && addonItem.stockQty > 0));

        return {
          id: addon.addonItemId.toString(),
          name: addon.addonName,
          originalPrice: decimalToNumber(addon.addonPrice),
          currentPrice: addonItem ? decimalToNumber(addonItem.price) : null,
          isAvailable: addonAvailable,
          reason: !addonAvailable
            ? !addonItem
              ? 'DELETED'
              : !addonItem.isActive
                ? 'UNAVAILABLE'
                : 'OUT_OF_STOCK'
            : null,
        };
      });

      return {
        menuId: item.menuId!.toString(),
        menuName: item.menuName,
        originalPrice: decimalToNumber(item.menuPrice),
        currentPrice: menu ? decimalToNumber(menu.price) : null,
        quantity: item.quantity,
        notes: item.notes,
        imageUrl: menu?.imageUrl || null,
        isAvailable: menuAvailable,
        reason: !menuAvailable
          ? !menu
            ? 'DELETED'
            : menu.deletedAt
              ? 'DELETED'
              : !menu.isActive
                ? 'UNAVAILABLE'
                : 'OUT_OF_STOCK'
          : null,
        addons,
        allAddonsAvailable: addons.every((a: { isAvailable: boolean }) => a.isAvailable),
      };
    });

    // Calculate summary
    const availableItems = reorderItems.filter((item) => item.isAvailable && item.allAddonsAvailable);
    const unavailableItems = reorderItems.filter((item) => !item.isAvailable || !item.allAddonsAvailable);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id.toString(),
        orderNumber: order.orderNumber,
        merchant: {
          code: order.merchant.code,
          name: order.merchant.name,
          currency: order.merchant.currency,
          isOpen: order.merchant.isOpen,
        },
        items: reorderItems,
        summary: {
          totalItems: reorderItems.length,
          availableItems: availableItems.length,
          unavailableItems: unavailableItems.length,
          canReorder: availableItems.length > 0,
          merchantOpen: order.merchant.isOpen,
        },
      },
    });
  } catch (error) {
    console.error('Re-order API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Failed to fetch re-order data' },
      { status: 500 }
    );
  }
});
