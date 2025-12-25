/**
 * Menu Performance Analytics API
 * GET /api/merchant/analytics/menu-performance - Item popularity, profit analysis
 * 
 * Features:
 * - Item popularity rankings
 * - Sales velocity (units per day)
 * - Revenue contribution
 * - Category performance
 * - Addon attachment rates
 * - Low/high performers identification
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

interface MenuPerformanceAnalytics {
  summary: {
    totalMenuItems: number;
    activeItems: number;
    totalItemsSold: number;
    totalRevenue: number;
    averageItemRevenue: number;
  };
  topPerformers: Array<{
    menuId: string;
    menuName: string;
    categoryName: string;
    price: number;
    quantitySold: number;
    revenue: number;
    revenuePercentage: number;
    salesVelocity: number; // items per day
    addonAttachmentRate: number;
  }>;
  lowPerformers: Array<{
    menuId: string;
    menuName: string;
    categoryName: string;
    price: number;
    quantitySold: number;
    revenue: number;
    daysSinceLastOrder: number | null;
  }>;
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalQuantitySold: number;
    totalRevenue: number;
    revenuePercentage: number;
  }>;
  addonPerformance: Array<{
    addonId: string;
    addonName: string;
    categoryName: string;
    price: number;
    quantitySold: number;
    revenue: number;
    attachmentRate: number;
  }>;
  salesTrendByItem: Array<{
    menuId: string;
    menuName: string;
    trend: 'rising' | 'stable' | 'falling';
    changePercent: number;
  }>;
  neverOrdered: Array<{
    menuId: string;
    menuName: string;
    categoryName: string;
    price: number;
    daysActive: number;
  }>;
}

/**
 * GET /api/merchant/analytics/menu-performance
 * Get menu performance analytics for merchant
 * 
 * Query params:
 * - period: 'week' | 'month' | 'quarter' | 'year'
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Fetch all menu items
    const menus = await prisma.menu.findMany({
      where: {
        merchantId: context.merchantId,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Fetch completed orders with items in current period
    const currentOrders = await prisma.order.findMany({
      where: {
        merchantId: context.merchantId,
        status: 'COMPLETED',
        placedAt: { gte: startDate, lte: now },
      },
      include: {
        orderItems: {
          include: {
            menu: { select: { id: true, name: true } },
            addons: {
              include: {
                addonItem: {
                  select: { id: true, name: true, price: true },
                  // Include addon category
                },
              },
            },
          },
        },
      },
    });

    // Fetch previous period orders for trend comparison
    const previousOrders = await prisma.order.findMany({
      where: {
        merchantId: context.merchantId,
        status: 'COMPLETED',
        placedAt: { gte: previousStartDate, lte: previousEndDate },
      },
      include: {
        orderItems: {
          include: {
            menu: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Calculate menu performance metrics
    const menuPerformanceMap = new Map<string, {
      menuId: bigint;
      menuName: string;
      categoryName: string;
      price: number;
      quantitySold: number;
      revenue: number;
      ordersWithAddons: number;
      totalOrders: number;
      lastOrderDate: Date | null;
    }>();

    // Initialize with all menus
    menus.forEach(menu => {
      const categoryName = menu.categories[0]?.category.name || 'Uncategorized';
      menuPerformanceMap.set(menu.id.toString(), {
        menuId: menu.id,
        menuName: menu.name,
        categoryName,
        price: decimalToNumber(menu.price),
        quantitySold: 0,
        revenue: 0,
        ordersWithAddons: 0,
        totalOrders: 0,
        lastOrderDate: null,
      });
    });

    // Aggregate current period data
    currentOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.menu) {
          const key = item.menu.id.toString();
          const existing = menuPerformanceMap.get(key);
          
          if (existing) {
            existing.quantitySold += item.quantity;
            existing.revenue += decimalToNumber(item.subtotal);
            existing.totalOrders += 1;
            
            if (item.addons.length > 0) {
              existing.ordersWithAddons += 1;
            }
            
            if (!existing.lastOrderDate || order.placedAt > existing.lastOrderDate) {
              existing.lastOrderDate = order.placedAt;
            }
          }
        }
      });
    });

    // Previous period data for trend
    const previousPerformanceMap = new Map<string, number>();
    previousOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.menu) {
          const key = item.menu.id.toString();
          previousPerformanceMap.set(key, (previousPerformanceMap.get(key) || 0) + item.quantity);
        }
      });
    });

    // Calculate totals
    const performanceArray = Array.from(menuPerformanceMap.values());
    const totalRevenue = performanceArray.reduce((sum, p) => sum + p.revenue, 0);
    const totalItemsSold = performanceArray.reduce((sum, p) => sum + p.quantitySold, 0);

    // Summary
    const summary = {
      totalMenuItems: menus.length,
      activeItems: menus.filter(m => m.isActive).length,
      totalItemsSold,
      totalRevenue,
      averageItemRevenue: menus.length > 0 ? totalRevenue / menus.length : 0,
    };

    // Top performers (by quantity)
    const topPerformers = performanceArray
      .filter(p => p.quantitySold > 0)
      .map(p => ({
        menuId: p.menuId.toString(),
        menuName: p.menuName,
        categoryName: p.categoryName,
        price: p.price,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        revenuePercentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
        salesVelocity: daysInPeriod > 0 ? p.quantitySold / daysInPeriod : 0,
        addonAttachmentRate: p.totalOrders > 0 ? (p.ordersWithAddons / p.totalOrders) * 100 : 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Low performers (items that sold but poorly)
    const lowPerformers = performanceArray
      .filter(p => p.quantitySold > 0 && p.quantitySold < 5)
      .map(p => ({
        menuId: p.menuId.toString(),
        menuName: p.menuName,
        categoryName: p.categoryName,
        price: p.price,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        daysSinceLastOrder: p.lastOrderDate 
          ? Math.ceil((now.getTime() - p.lastOrderDate.getTime()) / (24 * 60 * 60 * 1000))
          : null,
      }))
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, 10);

    // Never ordered items
    const neverOrdered = performanceArray
      .filter(p => p.quantitySold === 0)
      .map(p => {
        const menu = menus.find(m => m.id === p.menuId);
        const daysActive = menu 
          ? Math.ceil((now.getTime() - menu.createdAt.getTime()) / (24 * 60 * 60 * 1000))
          : 0;
        
        return {
          menuId: p.menuId.toString(),
          menuName: p.menuName,
          categoryName: p.categoryName,
          price: p.price,
          daysActive,
        };
      })
      .sort((a, b) => b.daysActive - a.daysActive);

    // Category performance
    const categoryMap = new Map<string, {
      categoryId: string;
      categoryName: string;
      itemCount: number;
      totalQuantitySold: number;
      totalRevenue: number;
    }>();

    performanceArray.forEach(p => {
      const menu = menus.find(m => m.id === p.menuId);
      if (menu && menu.categories.length > 0) {
        const cat = menu.categories[0].category;
        const key = cat.id.toString();
        const existing = categoryMap.get(key);
        
        if (existing) {
          existing.itemCount += 1;
          existing.totalQuantitySold += p.quantitySold;
          existing.totalRevenue += p.revenue;
        } else {
          categoryMap.set(key, {
            categoryId: cat.id.toString(),
            categoryName: cat.name,
            itemCount: 1,
            totalQuantitySold: p.quantitySold,
            totalRevenue: p.revenue,
          });
        }
      }
    });

    const categoryPerformance = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        revenuePercentage: totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Addon performance
    const addonMap = new Map<string, {
      addonId: bigint;
      addonName: string;
      categoryName: string;
      price: number;
      quantitySold: number;
      revenue: number;
      orderCount: number;
    }>();

    currentOrders.forEach(order => {
      order.orderItems.forEach(item => {
        item.addons.forEach(addon => {
          if (addon.addonItem) {
            const key = addon.addonItem.id.toString();
            const existing = addonMap.get(key);
            
            if (existing) {
              existing.quantitySold += addon.quantity;
              existing.revenue += decimalToNumber(addon.addonItem.price) * addon.quantity;
              existing.orderCount += 1;
            } else {
              addonMap.set(key, {
                addonId: addon.addonItem.id,
                addonName: addon.addonItem.name,
                categoryName: 'Addon', // Would need to fetch addon category
                price: decimalToNumber(addon.addonItem.price),
                quantitySold: addon.quantity,
                revenue: decimalToNumber(addon.addonItem.price) * addon.quantity,
                orderCount: 1,
              });
            }
          }
        });
      });
    });

    const totalOrderItems = currentOrders.reduce((sum, o) => sum + o.orderItems.length, 0);
    const addonPerformance = Array.from(addonMap.values())
      .map(a => ({
        addonId: a.addonId.toString(),
        addonName: a.addonName,
        categoryName: a.categoryName,
        price: a.price,
        quantitySold: a.quantitySold,
        revenue: a.revenue,
        attachmentRate: totalOrderItems > 0 ? (a.orderCount / totalOrderItems) * 100 : 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Sales trend by item
    const salesTrendByItem = performanceArray
      .filter(p => p.quantitySold > 0)
      .map(p => {
        const previousQty = previousPerformanceMap.get(p.menuId.toString()) || 0;
        let changePercent = 0;
        let trend: 'rising' | 'stable' | 'falling' = 'stable';
        
        if (previousQty > 0) {
          changePercent = ((p.quantitySold - previousQty) / previousQty) * 100;
          if (changePercent > 10) trend = 'rising';
          else if (changePercent < -10) trend = 'falling';
        } else if (p.quantitySold > 0) {
          trend = 'rising';
          changePercent = 100;
        }
        
        return {
          menuId: p.menuId.toString(),
          menuName: p.menuName,
          trend,
          changePercent,
        };
      })
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);

    const analytics: MenuPerformanceAnalytics = {
      summary,
      topPerformers,
      lowPerformers,
      categoryPerformance,
      addonPerformance,
      salesTrendByItem,
      neverOrdered,
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(analytics),
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        daysInPeriod,
      },
    });
  } catch (error) {
    console.error('Menu performance analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'ANALYTICS_ERROR', message: 'Failed to fetch menu performance analytics' },
      { status: 500 }
    );
  }
});
