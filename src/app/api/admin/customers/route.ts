/**
 * Customers API (Super Admin Only)
 * GET /api/admin/customers - List all customers
 */

import { NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/admin/customers
 * List all customers (Super Admin only)
 */
export const GET = withSuperAdmin(async () => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        totalOrders: true,
        totalSpent: true,
        lastOrderAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(customers),
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customers',
      },
      { status: 500 }
    );
  }
});
