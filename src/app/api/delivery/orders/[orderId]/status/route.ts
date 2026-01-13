/**
 * Delivery Driver Order Status API
 * PUT /api/delivery/orders/[orderId]/status - Update delivery status for assigned order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withDelivery } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import CustomerPushService from '@/lib/services/CustomerPushService';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

const ALLOWED_STATUS = ['PICKED_UP', 'DELIVERED', 'FAILED'] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export const PUT = withDelivery(async (request: NextRequest, context: AuthContext, routeContext) => {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId', 'Invalid orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const orderId = orderIdResult.value;
    const body = await request.json();

    const confirmCodReceived = Boolean(body?.confirmCodReceived);

    const nextStatus = body?.deliveryStatus as AllowedStatus | undefined;
    if (!nextStatus || !ALLOWED_STATUS.includes(nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `deliveryStatus must be one of: ${ALLOWED_STATUS.join(', ')}`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        merchantId: true,
        orderType: true,
        status: true,
        orderNumber: true,
        customerId: true,
        totalAmount: true,
        deliveryDriverUserId: true,
        deliveryStatus: true,
        payment: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            amount: true,
          },
        },
        merchant: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (!order || order.orderType !== 'DELIVERY') {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Delivery order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (context.merchantId && order.merchantId !== context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have access to this order',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    if (order.deliveryDriverUserId !== context.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Order is not assigned to you',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Enforce valid transition sequence.
    // Expected flow: ASSIGNED -> PICKED_UP -> DELIVERED (or FAILED).
    const current = order.deliveryStatus;
    const isAllowedTransition = (() => {
      if (nextStatus === 'PICKED_UP') return current === 'ASSIGNED';
      if (nextStatus === 'DELIVERED') return current === 'PICKED_UP';
      if (nextStatus === 'FAILED') return current === 'ASSIGNED' || current === 'PICKED_UP';
      return false;
    })();

    if (!isAllowedTransition) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Cannot transition deliveryStatus from ${current ?? 'null'} to ${nextStatus}`,
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Cannot update delivery status for a cancelled order',
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    const isCod = order.payment?.paymentMethod === 'CASH_ON_DELIVERY';
    const paymentCompleted = order.payment?.status === 'COMPLETED';

    if (nextStatus === 'DELIVERED' && isCod && !paymentCompleted && !confirmCodReceived) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_CONFIRMATION_REQUIRED',
          message: 'COD payment confirmation is required before marking as delivered',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // If driver picks up but merchant hasn't marked READY yet, auto-advance
    // from IN_PROGRESS -> READY (valid transition) to keep customer tracking consistent.
    if (nextStatus === 'PICKED_UP' && order.status === 'IN_PROGRESS') {
      try {
        await OrderManagementService.updateStatus(order.id, {
          status: 'READY',
          userId: context.userId,
          note: 'Auto-marked READY when driver picked up',
        });
      } catch (statusError) {
        console.error(`[Order ${order.orderNumber}] Failed to auto-mark READY on pickup:`, statusError);
      }
    }

    const updateData: Record<string, unknown> = {
      deliveryStatus: nextStatus,
    };

    if (nextStatus === 'DELIVERED') {
      updateData.deliveryDeliveredAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      if (nextStatus === 'DELIVERED') {
        const amount = order.payment?.amount ?? order.totalAmount;

        if (order.payment?.id) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              paidByUserId: context.userId,
              amount,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              amount,
              paymentMethod: isCod ? 'CASH_ON_DELIVERY' : 'CASH_ON_DELIVERY',
              status: 'COMPLETED',
              paidAt: new Date(),
              paidByUserId: context.userId,
            },
          });
        }
      }

      return updatedOrder;
    });

    // Side effects
    if (nextStatus === 'PICKED_UP' && order.merchant) {
      try {
        const sentCount = await CustomerPushService.notifyDeliveryPickedUp(
          order.orderNumber,
          order.merchant.name,
          order.merchant.code,
          order.customerId
        );
        console.log(`📱 [Order ${order.orderNumber}] Delivery picked-up push sent: ${sentCount}`);
      } catch (pushError) {
        console.error(`[Order ${order.orderNumber}] Failed to send delivery picked-up push:`, pushError);
      }
    }

    // Auto-complete the order when delivered
    if (nextStatus === 'DELIVERED') {
      try {
        await OrderManagementService.updateStatus(order.id, {
          status: 'COMPLETED',
          userId: context.userId,
          note: 'Auto-completed when driver marked DELIVERED',
        });
      } catch (completeError) {
        console.error(`[Order ${order.orderNumber}] Failed to auto-complete order:`, completeError);
        // Do not fail the delivery status update if completion side-effect fails.
      }
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Delivery status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update delivery status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
