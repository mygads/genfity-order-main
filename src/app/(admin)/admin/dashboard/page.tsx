import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getMenuItemsByRole } from '@/lib/constants/adminMenus';

export const dynamic = 'force-dynamic';

/**
 * GENFITY Admin Dashboard Page
 * 
 * @description
 * Main dashboard page for admin users with role-based access control.
 * Displays different content and sidebar menu based on user role.
 * 
 * @specification
 * - Server-side authentication check using requireAuth()
 * - Role-based sidebar menu filtering
 * - Different dashboard stats for each role
 * - SUPER_ADMIN: All merchants overview
 * - MERCHANT_OWNER: Own merchant stats
 * - MERCHANT_STAFF: Limited view (orders, menu)
 * 
 * @security
 * - Server component with JWT verification
 * - Redirects to /admin/login if not authenticated
 * - Blocks CUSTOMER role access
 */
export default async function AdminDashboardPage() {
  // Server-side auth check - redirects if not authenticated
  const user = await requireAuth('/admin/dashboard');

  // Block CUSTOMER role
  if (user.role === 'CUSTOMER') {
    redirect('/admin/login?error=forbidden');
  }

  // Ensure only admin roles can access
  if (!['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'].includes(user.role)) {
    redirect('/admin/login?error=forbidden');
  }

  // Get menu items based on role
  const menuItems = getMenuItemsByRole(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-2xl">🍽️</span>
          <span className="ml-2 text-xl font-bold text-gray-900">GENFITY</span>
          <span className="ml-2 text-xs font-medium text-gray-500">Admin</span>
        </div>

        {/* User Info */}
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <span className="text-lg">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.role === 'SUPER_ADMIN' && 'Super Admin'}
                {user.role === 'MERCHANT_OWNER' && 'Merchant Owner'}
                {user.role === 'MERCHANT_STAFF' && 'Staff'}
              </p>
              <p className="text-xs text-gray-500">ID: {user.id.toString()}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                      {item.badge}
                    </span>
                  )}
                </a>
                {item.children && item.children.length > 0 && (
                  <ul className="ml-9 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <a
                          href={child.href}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                          <span className="text-base">{child.icon}</span>
                          <span>{child.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-200 p-4">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="text-lg">🚪</span>
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
                <span className="text-xl">🔔</span>
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Selamat Datang! 👋
            </h2>
            <p className="mt-2 text-gray-600">
              {user.role === 'SUPER_ADMIN' &&
                'Anda memiliki akses penuh ke semua fitur admin.'}
              {user.role === 'MERCHANT_OWNER' &&
                'Kelola outlet dan monitor penjualan Anda.'}
              {user.role === 'MERCHANT_STAFF' &&
                'Kelola pesanan dan menu outlet.'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Stat Card 1 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pesanan Hari Ini
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">24</p>
                  <p className="mt-1 text-sm text-green-600">+12% dari kemarin</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pendapatan
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">Rp 2.4jt</p>
                  <p className="mt-1 text-sm text-green-600">+8% dari kemarin</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Menu Aktif
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">48</p>
                  <p className="mt-1 text-sm text-gray-500">dari 52 total</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <span className="text-2xl">🍽️</span>
                </div>
              </div>
            </div>

            {/* Stat Card 4 - Conditional based on role */}
            {user.role === 'SUPER_ADMIN' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Merchant
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">12</p>
                    <p className="mt-1 text-sm text-green-600">+2 bulan ini</p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3">
                    <span className="text-2xl">🏪</span>
                  </div>
                </div>
              </div>
            )}

            {(user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_STAFF') && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Rating
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">4.8</p>
                    <p className="mt-1 text-sm text-gray-500">dari 120 ulasan</p>
                  </div>
                  <div className="rounded-full bg-yellow-100 p-3">
                    <span className="text-2xl">⭐</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Aksi Cepat
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/dashboard/orders"
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all"
              >
                <span className="text-3xl">📦</span>
                <div>
                  <p className="font-semibold text-gray-900">Lihat Pesanan</p>
                  <p className="text-sm text-gray-600">Kelola pesanan masuk</p>
                </div>
              </Link>

              <Link
                href="/admin/dashboard/menu/items"
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all"
              >
                <span className="text-3xl">🍽️</span>
                <div>
                  <p className="font-semibold text-gray-900">Kelola Menu</p>
                  <p className="text-sm text-gray-600">Tambah atau edit menu</p>
                </div>
              </Link>

              {user.role !== 'MERCHANT_STAFF' && (
                <Link
                  href="/admin/dashboard/reports/sales"
                  className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                  <span className="text-3xl">📈</span>
                  <div>
                    <p className="font-semibold text-gray-900">Lihat Laporan</p>
                    <p className="text-sm text-gray-600">Analisis penjualan</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
