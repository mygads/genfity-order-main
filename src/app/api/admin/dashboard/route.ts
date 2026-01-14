/**
 * Admin Dashboard API
 * GET /api/admin/dashboard - Get role-based dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';
import { formatInTimeZone } from 'date-fns-tz';

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
        where: { userId: BigInt(userId), isActive: true },
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
        // If staff link exists but disabled, return a clearer state so UI can guide user.
        const disabledMerchantUser = await prisma.merchantUser.findFirst({
          where: { userId: BigInt(userId), isActive: false },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            role,
            noMerchant: true,
            ...(disabledMerchantUser
              ? {
                  merchantAccessDisabled: true,
                  disabledMerchant: serializeBigInt(disabledMerchantUser.merchant),
                }
              : {}),
          },
          statusCode: 200,
        });
      }

      const merchantId = merchantUser.merchantId;
      const merchantTimezone = merchantUser.merchant.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const decimalToNumber = (value: unknown): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'string') return Number(value);

        if (typeof value === 'object' && value !== null && 'toNumber' in (value as any)) {
          const maybe = (value as any).toNumber;
          if (typeof maybe === 'function') return maybe.call(value);
        }

        return Number(value);
      };

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
        last14DaysOrders,
        firstOrderPerCustomer,
        feedbackAgg30d,
        badReviewsCount7d,
        badReviewsCount30d,
        recentBadReviews,
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
        prisma.order.findMany({
          where: {
            merchantId,
            createdAt: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            createdAt: true,
            status: true,
            totalAmount: true,
            orderType: true,
            isScheduled: true,
            customerId: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId,
            customerId: { not: null },
            status: { not: 'CANCELLED' },
          },
          _min: { createdAt: true },
        }),
        prisma.orderFeedback.aggregate({
          where: {
            merchantId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          _avg: { overallRating: true },
          _count: { id: true },
        }),
        prisma.orderFeedback.count({
          where: {
            merchantId,
            overallRating: { lte: 2 },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.orderFeedback.count({
          where: {
            merchantId,
            overallRating: { lte: 2 },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.orderFeedback.findMany({
          where: {
            merchantId,
            overallRating: { lte: 2 },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            overallRating: true,
            comment: true,
            createdAt: true,
          },
        }),
      ]);

      // Only count COMPLETED orders for revenue
      const [revenueAgg, todayRevenueAgg] = await Promise.all([
        prisma.order.aggregate({
          where: { merchantId, status: 'COMPLETED' },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: { totalAmount: true },
        }),
      ]);

      // Build 14-day trend series in merchant timezone (simple JS aggregation)
      const todayKey = formatInTimeZone(new Date(), merchantTimezone, 'yyyy-MM-dd');
      const startKey = formatInTimeZone(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), merchantTimezone, 'yyyy-MM-dd');

      const dayKeys: string[] = [];
      for (let i = 13; i >= 0; i -= 1) {
        dayKeys.push(formatInTimeZone(new Date(Date.now() - i * 24 * 60 * 60 * 1000), merchantTimezone, 'yyyy-MM-dd'));
      }

      const byDay = new Map<string, { date: string; revenue: number; orderCount: number; scheduledCount: number; completedCount: number }>();
      dayKeys.forEach((key) => {
        byDay.set(key, { date: key, revenue: 0, orderCount: 0, scheduledCount: 0, completedCount: 0 });
      });

      const activeCustomersByDay = new Map<string, Set<bigint>>();
      dayKeys.forEach((key) => {
        activeCustomersByDay.set(key, new Set());
      });

      const newCustomersByDay = new Map<string, number>();
      dayKeys.forEach((key) => {
        newCustomersByDay.set(key, 0);
      });

      for (const o of last14DaysOrders) {
        const key = formatInTimeZone(o.createdAt, merchantTimezone, 'yyyy-MM-dd');
        const bucket = byDay.get(key);
        if (!bucket) continue;

        // Treat CANCELLED as non-contributing to revenue and count
        if (o.status !== 'CANCELLED') {
          bucket.orderCount += 1;
        }

        if (o.status === 'COMPLETED') {
          bucket.completedCount += 1;
          bucket.revenue += decimalToNumber(o.totalAmount);
        }

        if (o.isScheduled && o.status !== 'CANCELLED') {
          bucket.scheduledCount += 1;
        }

        if (o.status !== 'CANCELLED' && o.customerId) {
          const setForDay = activeCustomersByDay.get(key);
          setForDay?.add(o.customerId);
        }
      }

      for (const row of firstOrderPerCustomer) {
        const firstAt = row._min.createdAt;
        if (!firstAt) continue;
        const key = formatInTimeZone(firstAt, merchantTimezone, 'yyyy-MM-dd');
        if (!newCustomersByDay.has(key)) continue;
        newCustomersByDay.set(key, (newCustomersByDay.get(key) ?? 0) + 1);
      }

      const revenueByDate = dayKeys.map((k) => byDay.get(k)!).map((d) => ({
        date: d.date,
        revenue: Number.isFinite(d.revenue) ? d.revenue : 0,
        orderCount: d.orderCount,
        scheduledCount: d.scheduledCount,
        completedCount: d.completedCount,
      }));

      const customersByDate = dayKeys.map((k) => ({
        date: k,
        activeCustomers: activeCustomersByDay.get(k)?.size ?? 0,
        newCustomers: newCustomersByDay.get(k) ?? 0,
      }));

      const sum = (values: number[]) => values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
      const pctGrowth = (prev: number, next: number) => {
        if (prev <= 0) return null;
        return ((next - prev) / prev) * 100;
      };

      const first7 = revenueByDate.slice(0, 7);
      const last7 = revenueByDate.slice(7);
      const ordersPrev7Days = sum(first7.map((d) => d.orderCount));
      const ordersLast7Days = sum(last7.map((d) => d.orderCount));

      const customersFirst7 = customersByDate.slice(0, 7);
      const customersLast7 = customersByDate.slice(7);
      const newCustomersPrev7Days = sum(customersFirst7.map((d) => d.newCustomers));
      const newCustomersLast7Days = sum(customersLast7.map((d) => d.newCustomers));

      const scheduledOrdersToday = revenueByDate.find((d) => d.date === todayKey)?.scheduledCount ?? 0;
      const completedOrdersToday = revenueByDate.find((d) => d.date === todayKey)?.completedCount ?? 0;
      const nonCancelledOrdersToday = revenueByDate.find((d) => d.date === todayKey)?.orderCount ?? 0;
      const todayRevenueValue = decimalToNumber(todayRevenueAgg._sum.totalAmount);
      const avgOrderValueToday = completedOrdersToday > 0 ? todayRevenueValue / completedOrdersToday : 0;

      // Simple pace projection (linear by time elapsed in merchant timezone)
      const nowInTz = formatInTimeZone(new Date(), merchantTimezone, 'HH:mm');
      const [hh, mm] = nowInTz.split(':').map((v) => Number(v));
      const hoursElapsed = (Number.isFinite(hh) ? hh : 0) + (Number.isFinite(mm) ? mm : 0) / 60;
      const paceFactor = hoursElapsed > 0 ? Math.min(24 / hoursElapsed, 24) : 1;
      const projectedRevenueToday = todayRevenueValue * paceFactor;
      const projectedOrdersToday = nonCancelledOrdersToday * paceFactor;

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
              totalRevenue: decimalToNumber(revenueAgg._sum.totalAmount),
              todayRevenue: todayRevenueValue,
            },
            analytics: {
              range: {
                startDate: startKey,
                endDate: todayKey,
                timezone: merchantTimezone,
              },
              revenueByDate,
              customersByDate,
              growth: {
                ordersPrev7Days,
                ordersLast7Days,
                ordersGrowthPct: pctGrowth(ordersPrev7Days, ordersLast7Days),
                newCustomersPrev7Days,
                newCustomersLast7Days,
                newCustomersGrowthPct: pctGrowth(newCustomersPrev7Days, newCustomersLast7Days),
              },
              kpis: {
                scheduledOrdersToday,
                avgOrderValueToday,
                projectedRevenueToday,
                projectedOrdersToday,
                avgOverallRating30d: feedbackAgg30d._avg.overallRating ?? null,
                totalFeedback30d: feedbackAgg30d._count.id,
                badReviewsCount7d,
                badReviewsCount30d,
              },
              alerts: {
                recentBadReviews: serializeBigInt(recentBadReviews),
              },
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
