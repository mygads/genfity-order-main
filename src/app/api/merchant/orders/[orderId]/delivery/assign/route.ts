/**
 * Merchant Delivery Assignment API
 * PUT /api/merchant/orders/[orderId]/delivery/assign - Assign/unassign a driver for a delivery order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ORDER_DETAIL_INCLUDE } from '@/lib/types/order';
import { invalidRouteParam, requireBigIntRouteParam } from '@/lib/utils/routeContext';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';

type AssignBody = {
  driverUserId?: string | null;
};

export const PUT = withMerchant(async (request: NextRequest, authContext: AuthContext, routeContext) => {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId', 'Order ID is required');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const orderId = orderIdResult.value;

    if (!authContext.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as AssignBody;
    const driverUserIdRaw = body?.driverUserId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: authContext.merchantId,
      },
      select: {
        id: true,
        orderType: true,
        deliveryStatus: true,
        deliveryDriverUserId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (order.orderType !== 'DELIVERY') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Only DELIVERY orders can be assigned a driver',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Prevent accidental edits after final delivery
    if (order.deliveryStatus === 'DELIVERED') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Delivered orders cannot be modified',
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    const isUnassign = driverUserIdRaw === null || driverUserIdRaw === '' || driverUserIdRaw === undefined;

    if (isUnassign) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryDriverUserId: null,
          deliveryAssignedAt: null,
          deliveryStatus: 'PENDING_ASSIGNMENT',
        },
        include: ORDER_DETAIL_INCLUDE,
      });

      return NextResponse.json({
        success: true,
        data: serializeBigInt(updated),
        message: 'Driver unassigned successfully',
        statusCode: 200,
      });
    }

    const driverUserIdValue = typeof driverUserIdRaw === 'string' ? driverUserIdRaw.trim() : '';
    if (!/^\d+$/.test(driverUserIdValue)) {
      const err = invalidRouteParam('driverUserId', 'driverUserId must be a valid ID');
      return NextResponse.json(err.body, { status: err.status });
    }

    const driverUserId = BigInt(driverUserIdValue);

    const driver = await prisma.merchantUser.findFirst({
      where: {
        merchantId: authContext.merchantId,
        userId: driverUserId,
        isActive: true,
        user: { isActive: true },
        OR: [
          { role: 'OWNER' },
          { role: 'DRIVER' },
          {
            role: 'STAFF',
            invitationStatus: 'ACCEPTED',
            permissions: { has: STAFF_PERMISSIONS.DRIVER_DASHBOARD },
          },
        ],
      },
      select: { userId: true },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Driver not found for this merchant',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryDriverUserId: driverUserId,
        deliveryAssignedAt: new Date(),
        deliveryStatus: 'ASSIGNED',
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Driver assigned successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error assigning driver:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to assign driver',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
