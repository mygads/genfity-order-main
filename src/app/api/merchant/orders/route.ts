/**
 * Merchant Orders API
 * GET /api/merchant/orders - List orders with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import orderService from '@/lib/services/OrderService';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * GET /api/merchant/orders
 * Get orders with filters: status, orderType, startDate, endDate
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
    });
    
    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filters
    const filters: {
      status?: string;
      orderType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const orders = await orderService.getOrdersByMerchant(
      merchantUser.merchantId,
      filters
    );

    return NextResponse.json({
      success: true,
      data: orders,
      message: 'Orders retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting orders:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve orders',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
