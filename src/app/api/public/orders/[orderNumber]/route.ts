/**
 * Public Order Tracking API
 * GET /api/public/orders/[orderNumber] - Track order status
 */

import { NextRequest, NextResponse } from 'next/server';
import orderService from '@/lib/services/OrderService';

/**
 * GET /api/public/orders/[orderNumber]
 * Public endpoint to track order by order number
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  try {
    const order = await orderService.getOrderByNumber(params.orderNumber);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderData = order as any;

    // Get status history
    const statusHistory = await orderService.getOrderStatusHistory(orderData.id);

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        orderType: orderData.orderType,
        tableNumber: orderData.tableNumber,
        customerName: orderData.customerName,
        subtotal: orderData.subtotal,
        taxAmount: orderData.taxAmount,
        totalAmount: orderData.totalAmount,
        notes: orderData.notes,
        placedAt: orderData.placedAt,
        statusHistory: statusHistory.map((history: { fromStatus: string | null; toStatus: string; note: string | null; createdAt: Date }) => ({
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          note: history.note,
          createdAt: history.createdAt,
        })),
        merchant: orderData.merchant ? {
          name: orderData.merchant.name,
          code: orderData.merchant.code,
          phone: orderData.merchant.phone,
          address: orderData.merchant.address,
        } : null,
      },
      message: 'Order retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error tracking order:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
