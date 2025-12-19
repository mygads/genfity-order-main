import Link from 'next/link';
// Custom types based on Prisma schema
type Order = {
  id: bigint;
  orderNumber: string;
  status: string;
  totalAmount: any; // Decimal
  createdAt: Date;
};

interface SuperAdminDashboardProps {
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
  };
  recentMerchants: Array<{
    id: bigint;
    code: string;
    name: string;
    email: string | null;
    city: string | null;
    isActive: boolean;
    createdAt: Date;
  }>;
  recentOrders: Array<
    Order & {
      merchant: { name: string };
    }
  >;
}

/**
 * GENFITY Super Admin Dashboard Component
 * 
 * @description
 * Displays system-wide statistics for super admin users:
 * - Total merchants (active/inactive)
 * - Total users (admin/staff)
 * - Total orders and revenue
 * - Recent merchants and orders
 */
export default function SuperAdminDashboard({
  stats,
  recentMerchants,
  recentOrders,
}: SuperAdminDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Merchants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Merchants
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalMerchants}
              </h3>
              <p className="mt-1 text-sm text-green-600">
                {stats.activeMerchants} active
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
              <svg
                className="h-6 w-6 text-brand-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Users
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Admin & Staff
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <svg
                className="h-6 w-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalOrders}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                All time
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <svg
                className="h-6 w-6 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalRevenue)}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                All time
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Merchants & Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Merchants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Merchants
            </h3>
            <Link
              href="/admin/dashboard/merchants"
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentMerchants.map((merchant) => (
              <div
                key={merchant.id.toString()}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {merchant.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {merchant.code} • {merchant.city || 'No city'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    merchant.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {merchant.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Orders
            </h3>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id.toString()}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {order.merchant.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount))}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
