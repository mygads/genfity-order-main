// Custom types based on Prisma schema
type Merchant = {
  id: bigint;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
};

type Menu = {
  id: bigint;
  name: string;
  price: any; // Decimal
  imageUrl?: string | null;
};

type OrderItem = {
  id: bigint;
  quantity: number;
  menuPrice: any; // Decimal
  menu: Menu;
};

type Order = {
  id: bigint;
  orderNumber: string;
  status: string;
  totalAmount: any; // Decimal
  createdAt: Date;
  orderItems: OrderItem[];
};

interface MerchantOwnerDashboardProps {
  merchant: Merchant;
  stats: {
    totalMenuItems: number;
    activeMenuItems: number;
    totalCategories: number;
    totalStaff: number;
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    todayRevenue: number;
  };
  recentOrders: Array<
    Order & {
      orderItems: Array<OrderItem & { menu: Menu }>;
    }
  >;
}

/**
 * GENFITY Merchant Owner Dashboard Component
 * 
 * @description
 * Displays merchant-specific statistics for owner users:
 * - Menu items and categories
 * - Staff count
 * - Orders (total, today, pending)
 * - Revenue (total, today)
 * - Recent orders with items
 */
export default function MerchantOwnerDashboard({
  merchant,
  stats,
  recentOrders,
}: MerchantOwnerDashboardProps) {
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
      {/* Merchant Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {merchant.name}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {merchant.code} • {merchant.city || 'No city'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Menu Items */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Menu Items
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalMenuItems}
              </h3>
              <p className="mt-1 text-sm text-green-600">
                {stats.activeMenuItems} active
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <svg
                className="h-6 w-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Categories
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalCategories}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Menu categories
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Staff
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalStaff}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Total staff
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

        {/* Pending Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.pendingOrders}
              </h3>
              <p className="mt-1 text-sm text-yellow-600">
                Needs attention
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <svg
                className="h-6 w-6 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Orders */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Today&apos;s Orders
          </p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {stats.todayOrders}
          </h3>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Orders
          </p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalOrders}
          </h3>
        </div>

        {/* Today's Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Today&apos;s Revenue
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.todayRevenue)}
          </h3>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Revenue
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.totalRevenue)}
          </h3>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Orders
        </h3>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id.toString()}
              className="rounded-lg border border-gray-100 p-4 dark:border-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Order #{order.id.toString().slice(-6)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : order.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(order.createdAt)} • {order.orderItems.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(order.totalAmount.toNumber())}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
