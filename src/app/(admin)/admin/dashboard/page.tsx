import type { Metadata } from "next";
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/serverAuth';
import { PrismaClient } from '@prisma/client';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import MerchantOwnerDashboard from '@/components/dashboard/MerchantOwnerDashboard';
import MerchantStaffDashboard from '@/components/dashboard/MerchantStaffDashboard';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Dashboard | GENFITY",
  description: "GENFITY admin dashboard for restaurant management",
};

/**
 * GENFITY Admin Dashboard Page
 * 
 * @description
 * Role-based personalized dashboard with real database data
 * - SUPER_ADMIN: Total merchants, users, orders, revenue
 * - MERCHANT_OWNER: Total menu items, staff, orders, revenue
 * - MERCHANT_STAFF: Today's orders, pending orders
 */
export default async function AdminDashboardPage() {
  const user = await requireAuth('/admin/dashboard');

  // Block CUSTOMER role
  if (user.role === 'CUSTOMER') {
    redirect('/admin/login?error=forbidden');
  }

  // Render dashboard based on role
  if (user.role === 'SUPER_ADMIN') {
    // Get Super Admin stats
    const [
      totalMerchants,
      activeMerchants,
      totalUsers,
      totalOrders,
      recentMerchants,
      recentOrders,
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: { not: 'CUSTOMER' } } }),
      prisma.order.count(),
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
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { name: true } },
        },
      }),
    ]);

    // Calculate revenue (total from all orders)
    const revenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    return (
      <SuperAdminDashboard
        stats={{
          totalMerchants,
          activeMerchants,
          totalUsers,
          totalOrders,
          totalRevenue: revenue._sum.totalAmount?.toNumber() || 0,
        }}
        recentMerchants={recentMerchants}
        recentOrders={recentOrders}
      />
    );
  }

  if (user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_STAFF') {
    // Get merchant ID from merchant_users table
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: BigInt(user.id) },
      include: { merchant: true },
    });

    if (!merchantUser) {
      redirect('/admin/login?error=no_merchant');
    }

    const merchantId = merchantUser.merchantId;

    // Get Merchant stats
    const [
      totalMenuItems,
      activeMenuItems,
      totalCategories,
      totalStaff,
      totalOrders,
      todayOrders,
      pendingOrders,
      recentOrders,
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
    ]);

    // Calculate revenue
    const revenue = await prisma.order.aggregate({
      where: { merchantId },
      _sum: { totalAmount: true },
    });

    const todayRevenue = await prisma.order.aggregate({
      where: {
        merchantId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { totalAmount: true },
    });

    if (user.role === 'MERCHANT_OWNER') {
      return (
        <MerchantOwnerDashboard
          merchant={merchantUser.merchant}
          stats={{
            totalMenuItems,
            activeMenuItems,
            totalCategories,
            totalStaff,
            totalOrders,
            todayOrders,
            pendingOrders,
            totalRevenue: revenue._sum.totalAmount?.toNumber() || 0,
            todayRevenue: todayRevenue._sum.totalAmount?.toNumber() || 0,
          }}
          recentOrders={recentOrders}
        />
      );
    }

    // MERCHANT_STAFF
    return (
      <MerchantStaffDashboard
        merchant={merchantUser.merchant}
        stats={{
          todayOrders,
          pendingOrders,
          totalOrders,
          activeMenuItems,
        }}
        recentOrders={recentOrders}
      />
    );
  }

  redirect('/admin/login?error=forbidden');
}
