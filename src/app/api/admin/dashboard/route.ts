/**
 * Admin Dashboard API
 * GET /api/admin/dashboard - Get role-based dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';

/**
 * GET /api/admin/dashboard
 * Get dashboard data based on user role
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const { userId, role } = context;

    // Note: Customers use separate auth system and cannot access admin routes
    // The withAuth middleware already validates User roles (not Customer)

    // Super Admin Dashboard Data
    if (role === 'SUPER_ADMIN') {
      const [
        totalMerchants,
        activeMerchants,
        totalUsers,
        totalOrders,
        totalCustomers,
        recentMerchants,
      ] = await Promise.all([
        prisma.merchant.count(),
        prisma.merchant.count({ where: { isActive: true } }),
        prisma.user.count(), // All users are admin/merchant/staff (no CUSTOMER in User table)
        prisma.order.count(),
        prisma.customer.count(), // Count from Customer table
        prisma.merchant.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            city: true,
            isActive: true,
            createdAt: true,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          role: 'SUPER_ADMIN',
          stats: {
            totalMerchants,
            activeMerchants,
            totalUsers,
            totalOrders,
            totalCustomers,
          },
          recentMerchants: serializeBigInt(recentMerchants),
        },
        statusCode: 200,
      });
    }

    // Merchant Owner / Staff Dashboard Data
    if (role === 'MERCHANT_OWNER' || role === 'MERCHANT_STAFF') {
      const merchantUser = await prisma.merchantUser.findFirst({
        where: { userId: BigInt(userId) },
        include: { 
          merchant: {
            include: {
              openingHours: {
                select: {
                  dayOfWeek: true,
                  openTime: true,
                  closeTime: true,
                  isClosed: true,
                },
                orderBy: {
                  dayOfWeek: 'asc',
                },
              },
            },
          },
        },
      });

      if (!merchantUser) {
        return NextResponse.json({
          success: true,
          data: {
            role,
            noMerchant: true,
          },
          statusCode: 200,
        });
      }

      const merchantId = merchantUser.merchantId;

      const [
        totalMenuItems,
        activeMenuItems,
        totalCategories,
        totalStaff,
        totalOrders,
        todayOrders,
        pendingOrders,
        recentOrders,
        topSellingItems,
        orderStatusBreakdown,
        lowStockItems,
      ] = await Promise.all([
        prisma.menu.count({ where: { merchantId } }),
        prisma.menu.count({ where: { merchantId, isActive: true } }),
        prisma.menuCategory.count({ where: { merchantId } }),
        prisma.merchantUser.count({ where: { merchantId } }),
        prisma.order.count({ where: { merchantId } }),
        prisma.order.count({
          where: {
            merchantId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.order.count({
          where: { merchantId, status: 'PENDING' },
        }),
        prisma.order.findMany({
          where: { merchantId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            orderItems: { include: { menu: true } },
          },
        }),
        prisma.$queryRaw<Array<{
          menu_id: bigint;
          menu_name: string;
          menu_image_url: string | null;
          total_quantity: bigint;
          total_revenue: number;
        }>>`
          SELECT 
            oi.menu_id,
            oi.menu_name,
            m.image_url as menu_image_url,
            SUM(oi.quantity)::BIGINT as total_quantity,
            SUM(oi.subtotal)::FLOAT as total_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN menus m ON oi.menu_id = m.id
          WHERE o.merchant_id = ${merchantId}
            AND o.created_at >= NOW() - INTERVAL '30 days'
            AND o.status != 'CANCELLED'
          GROUP BY oi.menu_id, oi.menu_name, m.image_url
          ORDER BY total_quantity DESC
          LIMIT 5
        `,
        prisma.order.groupBy({
          by: ['status'],
          where: { merchantId },
          _count: { id: true },
        }),
        prisma.menu.findMany({
          where: {
            merchantId,
            trackStock: true,
            isActive: true,
            stockQty: { lte: 10 },
          },
          take: 5,
          orderBy: { stockQty: 'asc' },
          select: {
            id: true,
            name: true,
            stockQty: true,
            price: true,
            imageUrl: true,
          },
        }),
      ]);

      // Only count COMPLETED orders for revenue
      const revenue = await prisma.order.aggregate({
        where: { merchantId, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      });

      // Only count COMPLETED orders for today's revenue
      const todayRevenue = await prisma.order.aggregate({
        where: {
          merchantId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { totalAmount: true },
      });

      if (role === 'MERCHANT_OWNER') {
        return NextResponse.json({
          success: true,
          data: {
            role: 'MERCHANT_OWNER',
            merchant: serializeBigInt(merchantUser.merchant),
            stats: {
              totalMenuItems,
              activeMenuItems,
              totalCategories,
              totalStaff,
              totalOrders,
              todayOrders,
              pendingOrders,
              totalRevenue: revenue._sum.totalAmount?.toNumber() || 0,
              todayRevenue: todayRevenue._sum.totalAmount?.toNumber() || 0,
            },
            recentOrders: serializeBigInt(recentOrders),
            topSellingItems: topSellingItems.map(item => ({
              menuId: item.menu_id.toString(),
              menuName: item.menu_name,
              menuImageUrl: item.menu_image_url,
              totalQuantity: Number(item.total_quantity),
              totalRevenue: item.total_revenue,
            })),
            orderStatusBreakdown: orderStatusBreakdown.map(item => ({
              status: item.status,
              count: item._count.id,
            })),
            lowStockItems: serializeBigInt(lowStockItems),
          },
          statusCode: 200,
        });
      }

      // MERCHANT_STAFF
      return NextResponse.json({
        success: true,
        data: {
          role: 'MERCHANT_STAFF',
          merchant: serializeBigInt(merchantUser.merchant),
          stats: {
            todayOrders,
            pendingOrders,
            totalOrders,
            activeMenuItems,
          },
          recentOrders: serializeBigInt(recentOrders),
        },
        statusCode: 200,
      });
    }

    // Delivery Driver Dashboard Data
    if (role === 'DELIVERY') {
      const merchantUser = await prisma.merchantUser.findFirst({
        where: {
          userId: BigInt(userId),
          isActive: true,
        },
        include: {
          merchant: {
            select: {
              id: true,
              code: true,
              name: true,
              currency: true,
            },
          },
        },
      });

      if (!merchantUser) {
        return NextResponse.json({
          success: true,
          data: {
            role,
            noMerchant: true,
          },
          statusCode: 200,
        });
      }

      const merchantId = merchantUser.merchantId;
      const driverId = BigInt(userId);

      const [assignedCount, pickedUpCount, deliveredTodayCount, activeDeliveries] = await Promise.all([
        prisma.order.count({
          where: {
            merchantId,
            orderType: 'DELIVERY',
            deliveryDriverUserId: driverId,
            deliveryStatus: { in: ['PENDING_ASSIGNMENT', 'ASSIGNED'] },
          },
        }),
        prisma.order.count({
          where: {
            merchantId,
            orderType: 'DELIVERY',
            deliveryDriverUserId: driverId,
            deliveryStatus: 'PICKED_UP',
          },
        }),
        prisma.order.count({
          where: {
            merchantId,
            orderType: 'DELIVERY',
            deliveryDriverUserId: driverId,
            deliveryStatus: 'DELIVERED',
            deliveryDeliveredAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.order.findMany({
          where: {
            merchantId,
            orderType: 'DELIVERY',
            deliveryDriverUserId: driverId,
            deliveryStatus: { in: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP'] },
          },
          orderBy: { placedAt: 'desc' },
          take: 20,
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
                email: true,
              },
            },
            orderItems: {
              select: { id: true },
            },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          role: 'DELIVERY',
          merchant: serializeBigInt(merchantUser.merchant),
          stats: {
            assignedCount,
            pickedUpCount,
            deliveredTodayCount,
          },
          activeDeliveries: serializeBigInt(activeDeliveries.map((o) => ({
            ...o,
            itemsCount: o.orderItems.length,
          }))),
        },
        statusCode: 200,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'Invalid role',
        statusCode: 403,
      },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error getting dashboard data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve dashboard data',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
