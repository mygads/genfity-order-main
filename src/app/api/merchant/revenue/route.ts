/**
 * Merchant Revenue API
 * GET /api/merchant/revenue - Get revenue reports
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { PaymentStatus } from '@prisma/client';

/**
 * GET /api/merchant/revenue
 * Get comprehensive revenue analytics
 * Query params: startDate, endDate
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
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

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, currency: true },
    });

    if (!merchant) {
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
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Default to last 30 days if not provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Revenue is based on PAID transactions only
    const paidOrders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
        payment: {
          is: {
            status: PaymentStatus.COMPLETED,
          },
        },
      },
      select: {
        placedAt: true,
        status: true,
        orderType: true,
        subtotal: true,
        taxAmount: true,
        serviceChargeAmount: true,
        packagingFeeAmount: true,
        totalAmount: true,
        payment: {
          select: {
            status: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: {
        placedAt: 'asc',
      },
    });

    // 1. Daily Revenue Report (grouped in JS)
    const dailyMap = new Map<
      string,
      {
        totalOrders: number;
        totalRevenue: number;
        totalTax: number;
        totalServiceCharge: number;
        totalPackagingFee: number;
        grandTotal: number;
      }
    >();

    for (const order of paidOrders) {
      const day = order.placedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(day) || {
        totalOrders: 0,
        totalRevenue: 0,
        totalTax: 0,
        totalServiceCharge: 0,
        totalPackagingFee: 0,
        grandTotal: 0,
      };

      existing.totalOrders += 1;
      existing.totalRevenue += Number(order.subtotal);
      existing.totalTax += Number(order.taxAmount);
      existing.totalServiceCharge += Number(order.serviceChargeAmount ?? 0);
      existing.totalPackagingFee += Number(order.packagingFeeAmount ?? 0);
      existing.grandTotal += Number(order.totalAmount);

      dailyMap.set(day, existing);
    }

    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, row]) => ({
      date,
      ...row,
    }));

    // 2. Total Summary
    const totalOrders = paidOrders.length;
    const totalSubtotal = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const totalTax = paidOrders.reduce((sum, o) => sum + Number(o.taxAmount), 0);
    const totalServiceCharge = paidOrders.reduce((sum, o) => sum + Number(o.serviceChargeAmount ?? 0), 0);
    const totalPackagingFee = paidOrders.reduce((sum, o) => sum + Number(o.packagingFeeAmount ?? 0), 0);
    const grandTotal = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgOrderValue = totalOrders > 0 ? grandTotal / totalOrders : 0;

    // 3. Order Status Breakdown (paid orders only)
    const statusCounts = paidOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const orderStatusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // 4. Order Type Breakdown (paid orders only)
    const orderTypeMap = new Map<string, { count: number; revenue: number }>();
    for (const o of paidOrders) {
      const key = o.orderType;
      const existing = orderTypeMap.get(key) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(o.totalAmount);
      orderTypeMap.set(key, existing);
    }
    const orderTypeBreakdown = Array.from(orderTypeMap.entries()).map(([type, v]) => ({
      type,
      count: v.count,
      revenue: v.revenue,
    }));

    // 5. Top Selling Menu Items (paid orders only)
    const topMenuItems = await prisma.orderItem.groupBy({
      by: ['menuId', 'menuName'],
      where: {
        order: {
          merchantId,
          placedAt: {
            gte: startDate,
            lte: endDate,
          },
          payment: {
            is: {
              status: PaymentStatus.COMPLETED,
            },
          },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: 10,
    });

    // 6. Hourly Distribution (paid orders only)
    const hourlyCounts = new Array(24).fill(0).map(() => ({ orderCount: 0, revenue: 0 }));
    for (const o of paidOrders) {
      const hour = o.placedAt.getHours();
      hourlyCounts[hour].orderCount += 1;
      hourlyCounts[hour].revenue += Number(o.totalAmount);
    }
    const hourlyDistribution = hourlyCounts.map((v, hour) => ({
      hour,
      orderCount: v.orderCount,
      revenue: v.revenue,
    }));

    // Format the response
    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }, merchant: {
          currency: merchant.currency || 'AUD',
        }, summary: {
          totalOrders,
          totalRevenue: totalSubtotal,
          totalTax,
          totalServiceCharge,
          totalPackagingFee,
          grandTotal,
          averageOrderValue: avgOrderValue,
        },
        dailyRevenue,
        orderStatusBreakdown,
        orderTypeBreakdown,
        topMenuItems: topMenuItems
          .filter(item => item.menuId !== null)
          .map(item => ({
            menuId: item.menuId!.toString(),
            menuName: item.menuName,
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: Number(item._sum.subtotal) || 0,
          })),
        hourlyDistribution,
      },
      message: 'Revenue analytics retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting revenue:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve revenue data',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
