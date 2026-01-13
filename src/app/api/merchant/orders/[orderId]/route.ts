/**
 * Merchant Order Detail API - Phase 1
 * GET /api/merchant/orders/[orderId] - Get single order with full details
 * DELETE /api/merchant/orders/[orderId] - Delete an order with PIN verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import bcrypt from 'bcryptjs';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/orders/[orderId]
 * Get single order with full details (payment, items with addons, customer)
 */
async function handleGet(
  req: NextRequest,
  authContext: AuthContext,
  routeContext: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }
    const orderId = orderIdResult.value;
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch order with full details
    const order = await OrderManagementService.getOrderById(orderId, merchantId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/[orderId]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);

/**
 * DELETE /api/merchant/orders/[orderId]
 * Delete an order with PIN verification
 */
async function handleDelete(
  req: NextRequest,
  authContext: AuthContext,
  routeContext: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          error: 'PIN_REQUIRED',
          message: 'PIN is required to delete an order',
        },
        { status: 400 }
      );
    }

    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
        },
        { status: 404 }
      );
    }

    const merchant = merchantUser.merchant;

    // Check if merchant has delete PIN set
    if (!merchant.deletePin) {
      return NextResponse.json(
        {
          success: false,
          error: 'PIN_NOT_SET',
          message: 'Delete PIN is not configured for this merchant',
        },
        { status: 400 }
      );
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, merchant.deletePin);
    if (!isPinValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PIN',
          message: 'Invalid PIN',
        },
        { status: 401 }
      );
    }

    const orderId = orderIdResult.value;

    // Find the order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
        { status: 404 }
      );
    }

    // Delete order and related records in transaction
    await prisma.$transaction(async (tx) => {
      // Delete order item addons
      await tx.orderItemAddon.deleteMany({
        where: {
          orderItem: {
            orderId: order.id,
          },
        },
      });

      // Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      // Delete payment if exists
      await tx.payment.deleteMany({
        where: { orderId: order.id },
      });

      // Delete the order
      await tx.order.delete({
        where: { id: order.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/merchant/orders/[orderId]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order',
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);