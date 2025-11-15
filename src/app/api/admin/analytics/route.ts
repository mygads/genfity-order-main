/**
 * Analytics API Route
 * GET /api/admin/analytics
 * Access: SUPER_ADMIN only
 * 
 * Returns analytics data for dashboard charts
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';

async function getAnalyticsHandler(
  request: NextRequest,
  _authContext: AuthContext
) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month'; // month, year

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  
  if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
  } else {
    // Default: last 30 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
  }

  // 1. Customer registrations in last month
  const customerRegistrations = await db.query(
    `SELECT COUNT(*) as total
     FROM users
     WHERE role = 'CUSTOMER'
       AND created_at >= $1`,
    [startDate.toISOString()]
  );

  // 2. Most orders by merchant
  const merchantsByOrders = await db.query(
    `SELECT 
       m.id,
       m.name,
       COUNT(o.id) as order_count
     FROM merchants m
     LEFT JOIN orders o ON o.merchant_id = m.id
       AND o.created_at >= $1
     GROUP BY m.id, m.name
     ORDER BY order_count DESC
     LIMIT 10`,
    [startDate.toISOString()]
  );

  // 3. Most popular menu items by merchant
  const merchantsByMenuPopularity = await db.query(
    `SELECT 
       m.id,
       m.name,
       COUNT(oi.id) as item_count
     FROM merchants m
     LEFT JOIN menus menu ON menu.merchant_id = m.id
     LEFT JOIN order_items oi ON oi.menu_id = menu.id
     LEFT JOIN orders o ON o.id = oi.order_id
       AND o.created_at >= $1
     GROUP BY m.id, m.name
     ORDER BY item_count DESC
     LIMIT 10`,
    [startDate.toISOString()]
  );

  // 4. Revenue by merchant (using total_amount from schema)
  const merchantsByRevenue = await db.query(
    `SELECT 
       m.id,
       m.name,
       COALESCE(SUM(o.total_amount), 0) as revenue
     FROM merchants m
     LEFT JOIN orders o ON o.merchant_id = m.id
       AND o.created_at >= $1
       AND o.status IN ('COMPLETED')
     GROUP BY m.id, m.name
     ORDER BY revenue DESC
     LIMIT 10`,
    [startDate.toISOString()]
  );

  // 5. Merchant growth over time (monthly)
  const merchantGrowth = await db.query(
    `SELECT 
       DATE_TRUNC('month', created_at) as month,
       COUNT(*) as count
     FROM merchants
     WHERE created_at >= $1
     GROUP BY month
     ORDER BY month ASC`,
    [startDate.toISOString()]
  );

  // 6. Customer growth over time (monthly)
  const customerGrowth = await db.query(
    `SELECT 
       DATE_TRUNC('month', created_at) as month,
       COUNT(*) as count
     FROM users
     WHERE role = 'CUSTOMER'
       AND created_at >= $1
     GROUP BY month
     ORDER BY month ASC`,
    [startDate.toISOString()]
  );

  // Format data for response
  return successResponse(
    {
      customerRegistrations: parseInt(customerRegistrations.rows[0]?.total || '0'),
      merchantsByOrders: merchantsByOrders.rows.map(row => ({
        merchantId: row.id,
        merchantName: row.name,
        orderCount: parseInt(row.order_count || '0'),
      })),
      merchantsByMenuPopularity: merchantsByMenuPopularity.rows.map(row => ({
        merchantId: row.id,
        merchantName: row.name,
        itemCount: parseInt(row.item_count || '0'),
      })),
      merchantsByRevenue: merchantsByRevenue.rows.map(row => ({
        merchantId: row.id,
        merchantName: row.name,
        revenue: parseFloat(row.revenue || '0'),
      })),
      merchantGrowth: merchantGrowth.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count || '0'),
      })),
      customerGrowth: customerGrowth.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count || '0'),
      })),
    },
    'Analytics data retrieved successfully',
    200
  );
}

export const GET = withSuperAdmin(getAnalyticsHandler);
