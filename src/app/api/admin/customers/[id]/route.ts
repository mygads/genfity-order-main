/**
 * Customer Detail API (Super Admin Only)
 * GET /api/admin/customers/[id] - Get customer details
 * PUT /api/admin/customers/[id] - Update customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

type RouteContext = {
  params: Promise<Record<string, string>>;
};

/**
 * GET /api/admin/customers/[id]
 * Get customer details
 */
export const GET = withSuperAdmin(async (_req: NextRequest, _context, routeContext: RouteContext) => {
  try {
    const params = await routeContext.params;
    const customerId = BigInt(params.id);

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
          take: 10,
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

    return NextResponse.json({
      success: true,
      data: serializeBigInt(customer),
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
    const params = await routeContext.params;
    const customerId = BigInt(params.id);
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
