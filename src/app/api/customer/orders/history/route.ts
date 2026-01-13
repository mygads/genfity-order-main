/**
 * Customer Order History API
 * GET /api/customer/orders/history - Get order history for logged-in customer
 * 
 * Features:
 * - Pagination
 * - Filter by status
 * - Filter by date range
 * - Re-order capability
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { decimalToNumber } from '@/lib/utils/serializer';
import { withCustomer } from '@/lib/middleware/auth';
import type { CustomerAuthContext } from '@/lib/middleware/auth';

export const GET = withCustomer(async (request: NextRequest, customerContext: CustomerAuthContext) => {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // COMPLETED, CANCELLED, etc.
    const merchantCode = searchParams.get('merchant');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      customerId: customerContext.customerId,
    };

    // Status filter
    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    // Merchant filter
    if (merchantCode) {
      const merchant = await prisma.merchant.findUnique({
        where: { code: merchantCode },
        select: { id: true },
      });
      if (merchant) {
        whereCondition.merchantId = merchant.id;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      whereCondition.placedAt = {};
      if (startDate) {
        whereCondition.placedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereCondition.placedAt.lte = endDateTime;
      }
    }

    // Get total count
    const totalCount = await prisma.order.count({
      where: whereCondition,
    });

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            logoUrl: true,
            currency: true,
          },
        },
        orderItems: {
          include: {
            menu: {
              select: {
                id: true,
                imageUrl: true,
              },
            },
            addons: true,
          },
        },
        payment: {
          select: {
            paymentMethod: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format response
    const formattedOrders = orders.map((order) => ({
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      status: order.status,
      subtotal: decimalToNumber(order.subtotal),
      taxAmount: decimalToNumber(order.taxAmount),
      serviceChargeAmount: decimalToNumber(order.serviceChargeAmount),
      packagingFeeAmount: decimalToNumber(order.packagingFeeAmount),
      totalAmount: decimalToNumber(order.totalAmount),
      notes: order.notes,
      placedAt: order.placedAt.toISOString(),
      completedAt: order.completedAt?.toISOString() || null,
      cancelledAt: order.cancelledAt?.toISOString() || null,
      cancelReason: order.cancelReason,
      merchant: {
        id: order.merchant.id.toString(),
        code: order.merchant.code,
        name: order.merchant.name,
        logoUrl: order.merchant.logoUrl,
        currency: order.merchant.currency,
      },
      items: order.orderItems.map((item) => ({
        id: item.id.toString(),
        menuId: item.menuId?.toString() || null,
        menuName: item.menuName,
        menuPrice: decimalToNumber(item.menuPrice),
        quantity: item.quantity,
        subtotal: decimalToNumber(item.subtotal),
        notes: item.notes,
        imageUrl: item.menu?.imageUrl || null,
        addons: item.addons.map((addon) => ({
          id: addon.id.toString(),
          addonName: addon.addonName,
          addonPrice: decimalToNumber(addon.addonPrice),
          quantity: addon.quantity,
          subtotal: decimalToNumber(addon.subtotal),
        })),
      })),
      payment: order.payment
        ? {
            paymentMethod: order.payment.paymentMethod,
            status: order.payment.status,
            paidAt: order.payment.paidAt?.toISOString() || null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Order history error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Failed to fetch order history' },
      { status: 500 }
    );
  }
});
