/**
 * Customer Detail API (Super Admin Only)
 * GET /api/admin/customers/[id] - Get customer details
 * PUT /api/admin/customers/[id] - Update customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/admin/customers/[id]
 * Get customer details
 */
export const GET = withSuperAdmin(async (_req: NextRequest, _context, routeContext: RouteContext) => {
  try {
    const customerId = await getBigIntRouteParam(routeContext, 'id');
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer id' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        totalOrders: true,
        totalSpent: true,
        lastOrderAt: true,
        orders: {
          where: { status: { in: ['COMPLETED', 'READY'] } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            merchant: {
              select: {
                name: true,
                currency: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer not found',
        },
        { status: 404 }
      );
    }

    // Calculate total spent grouped by currency from actual orders
    const spentByCurrency: Record<string, number> = {};
    let lastOrderDate: Date | null = null;

    for (const order of customer.orders) {
      const currency = order.merchant?.currency || 'AUD';
      const amount = Number(order.totalAmount) || 0;

      spentByCurrency[currency] = (spentByCurrency[currency] || 0) + amount;

      if (!lastOrderDate || order.createdAt > lastOrderDate) {
        lastOrderDate = order.createdAt;
      }
    }

    // Build response with calculated values
    const responseData = {
      ...customer,
      // Computed fields for display
      spentByCurrency,
      computedLastOrderAt: lastOrderDate,
      computedTotalOrders: customer._count.orders,
      // Limit orders to 10 for display
      orders: customer.orders.slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(responseData),
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customer',
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/customers/[id]
 * Update customer (e.g., toggle active status)
 */
export const PUT = withSuperAdmin(async (req: NextRequest, _context, routeContext: RouteContext) => {
  try {
    const customerId = await getBigIntRouteParam(routeContext, 'id');
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer id' },
        { status: 400 }
      );
    }
    const body = await req.json();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer not found',
        },
        { status: 404 }
      );
    }

    // Only allow updating certain fields
    const updateData: { isActive?: boolean } = {};

    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedCustomer),
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update customer',
      },
      { status: 500 }
    );
  }
});
