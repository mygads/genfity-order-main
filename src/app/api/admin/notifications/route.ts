/**
 * Real-time Notifications API for Super Admin
 * GET /api/admin/notifications - Get recent orders/activities for real-time dashboard
 * 
 * Query Parameters:
 * - since: ISO timestamp to get notifications after (for polling)
 * - limit: Number of notifications to return (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

export interface AdminNotification {
  id: string;
  type: 'NEW_ORDER' | 'ORDER_COMPLETED' | 'NEW_CUSTOMER' | 'NEW_MERCHANT' | 'MERCHANT_SUBSCRIPTION';
  title: string;
  message: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
}

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const notifications: AdminNotification[] = [];

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: since },
      },
      include: {
        merchant: {
          select: { name: true, currency: true },
        },
        customer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    for (const order of recentOrders) {
      const customerName = order.customer?.name || 'Guest Customer';
      
      notifications.push({
        id: `order-${order.id}`,
        type: order.status === 'COMPLETED' ? 'ORDER_COMPLETED' : 'NEW_ORDER',
        title: order.status === 'COMPLETED' ? 'Order Completed' : 'New Order',
        message: `${customerName} ordered from ${order.merchant.name}`,
        timestamp: order.createdAt.toISOString(),
        metadata: serializeBigInt({
          orderId: order.id,
          orderNumber: order.orderNumber,
          merchantName: order.merchant.name,
          totalAmount: Number(order.totalAmount),
          currency: order.merchant.currency,
          status: order.status,
        }) as Record<string, unknown>,
        isRead: false,
      });
    }

    // Get new customers
    const newCustomers = await prisma.customer.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    for (const customer of newCustomers) {
      notifications.push({
        id: `customer-${customer.id}`,
        type: 'NEW_CUSTOMER',
        title: 'New Customer Registered',
        message: `${customer.name} joined the platform`,
        timestamp: customer.createdAt.toISOString(),
        metadata: serializeBigInt({
          customerId: customer.id,
          email: customer.email,
          phone: customer.phone,
        }) as Record<string, unknown>,
        isRead: false,
      });
    }

    // Get new merchants
    const newMerchants = await prisma.merchant.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    for (const merchant of newMerchants) {
      notifications.push({
        id: `merchant-${merchant.id}`,
        type: 'NEW_MERCHANT',
        title: 'New Merchant Onboarded',
        message: `${merchant.name} joined the platform`,
        timestamp: merchant.createdAt.toISOString(),
        metadata: serializeBigInt({
          merchantId: merchant.id,
          merchantCode: merchant.code,
          merchantName: merchant.name,
        }) as Record<string, unknown>,
        isRead: false,
      });
    }

    // Sort all notifications by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit total notifications
    const limitedNotifications = notifications.slice(0, limit);

    // Get counts for badges
    const counts = {
      newOrders: recentOrders.filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED').length,
      newCustomers: newCustomers.length,
      newMerchants: newMerchants.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        notifications: limitedNotifications,
        counts,
        since: since.toISOString(),
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(handleGet);
