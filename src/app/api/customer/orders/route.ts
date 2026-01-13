/**
 * Customer Order History API
 * GET /api/customer/orders - Get all orders for authenticated customer
 * 
 * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
 * 
 * @description
 * Returns order history with:
 * - Order basic info (number, status, total)
 * - Merchant details
 * - Items count
 * - Latest status from order_status_history
 * 
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only see their own orders
 * 
 * @response
 * {
 *   success: true,
 *   data: OrderHistoryItem[],
 *   message: "Orders retrieved successfully",
 *   statusCode: 200
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

/**
 * GET /api/customer/orders
 * Fetch all orders for authenticated customer
 */
export const GET = withCustomer(async (
  _request: NextRequest,
  context: CustomerAuthContext,
) => {
  try {
    // console.log('👤 Fetching orders for customer:', context.customerId.toString());

    // ========================================
    // Fetch Orders from Customer table relation
    // ========================================
    
    // Exclude orders that were created from reservations.
    const reservationOrders = await prisma.reservation.findMany({
      where: {
        customerId: context.customerId,
        orderId: {
          not: null,
        },
      },
      select: {
        orderId: true,
      },
    });

    const excludedOrderIds = reservationOrders
      .map((r) => r.orderId)
      .filter((id): id is bigint => typeof id === 'bigint');

    const orders = await prisma.order.findMany({
      where: {
        customerId: context.customerId,
        ...(excludedOrderIds.length > 0
          ? {
              id: {
                notIn: excludedOrderIds,
              },
            }
          : {}),
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            currency: true,
            enableTax: true,
            taxPercentage: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
    });

    // ========================================
    // Format Response
    // ========================================
    
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      merchantName: order.merchant.name,
      merchantCode: order.merchant.code,
      merchantCurrency: order.merchant.currency,
      mode: order.orderType === 'DINE_IN' ? 'dinein' : order.orderType === 'TAKEAWAY' ? 'takeaway' : 'delivery',
      isScheduled: Boolean((order as any).isScheduled),
      scheduledTime: ((order as any).scheduledTime ?? null) as string | null,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount.toString()),
      placedAt: order.placedAt.toISOString(),
      itemsCount: order.orderItems.length,
      trackingToken: createOrderTrackingToken({ merchantCode: order.merchant.code, orderNumber: order.orderNumber }),
    }));

    // ✅ Serialize BigInt to string for JSON
    const serializedOrders = serializeBigInt(formattedOrders);

    return NextResponse.json({
      success: true,
      data: serializedOrders,
      message: 'Orders retrieved successfully',
      statusCode: 200,
    });

  } catch (error) {
    console.error('Get customer orders error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Gagal memuat riwayat pesanan',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
