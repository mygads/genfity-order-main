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

    // If no merchant connection, show message
    if (!merchantUser) {
      return (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Not Connected to Any Merchant
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              You are currently not connected to any merchant. Please contact the merchant owner or super admin to get added to a merchant team.
            </p>
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    Need Help?
                  </p>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                    Contact your administrator to request access to a merchant account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
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
