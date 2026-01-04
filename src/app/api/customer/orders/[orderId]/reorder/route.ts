import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import jwt from 'jsonwebtoken';
import { decimalToNumber } from '@/lib/utils/serializer';

const JWT_SECRET = process.env.JWT_SECRET || 'genfity-jwt-secret';

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

interface JWTPayload {
  userId: string;
  email: string;
  type: 'customer';
  sessionId: string;
  iat: number;
  exp: number;
}

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { orderId } = await context.params;

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: JWTPayload;

    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify customer type
    if (decoded.type !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Customer access required' },
        { status: 403 }
      );
    }

    // Validate orderId
    const orderIdNum = parseInt(orderId, 10);
    if (isNaN(orderIdNum)) {
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
    if (order.customerId?.toString() !== decoded.userId) {
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
}
