import { formatFullOrderNumber } from '@/lib/utils/format';

// Custom types based on Prisma schema
type Merchant = {
  id: bigint;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  currency?: string;
};

type Menu = {
  id: bigint;
  name: string;
  price: number | { toString(): string }; // Decimal
  imageUrl?: string | null;
};

type OrderItem = {
  id: bigint;
  quantity: number;
  menuPrice: number | { toString(): string }; // Decimal
  menu: Menu;
};

type Order = {
  id: bigint;
  orderNumber: string;
  status: string;
  totalAmount: number | { toString(): string }; // Decimal
  createdAt: Date;
  orderItems: OrderItem[];
};

interface MerchantStaffDashboardProps {
  merchant: Merchant;
  stats: {
    todayOrders: number;
    pendingOrders: number;
    totalOrders: number;
    activeMenuItems: number;
  };
  recentOrders: Array<
    Order & {
      orderItems: Array<OrderItem & { menu: Menu }>;
    }
  >;
}

/**
 * GENFITY Merchant Staff Dashboard Component
 * 
 * @description
 * Displays limited statistics for staff users:
 * - Today's orders (priority metric)
 * - Pending orders (action required)
 * - Total orders (historical context)
 * - Active menu items (inventory awareness)
 * - Recent orders (work list)
 * 
 * @note
 * Staff users DO NOT have access to revenue data
 */
export default function MerchantStaffDashboard({
  merchant,
  stats,
  recentOrders,
}: MerchantStaffDashboardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number) => {
    const currency = merchant.currency || 'AUD';
    if (currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }
    // Default: AUD
    return `A$${amount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Merchant Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {merchant.name}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Staff Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Orders - Priority */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Orders
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.todayOrders}
              </h3>
              <p className="mt-1 text-sm text-brand-600">
                Current workload
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Orders - Action Required */}
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

        {/* Total Orders - Historical Context */}
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

        {/* Active Menu Items - Inventory Awareness */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Menu
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeMenuItems}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Available items
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders - Work List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Orders
          </h3>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              type="button"
            >
              All Orders
            </button>
            <button
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              type="button"
            >
              Pending Only
            </button>
          </div>
        </div>

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
                      #{formatFullOrderNumber(order.orderNumber, merchant.code)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${order.status === 'COMPLETED'
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
                    {formatDate(order.createdAt)}
                  </p>
                  <div className="mt-2 space-y-1">
                    {order.orderItems.slice(0, 3).map((item: OrderItem) => (
                      <p
                        key={item.id.toString()}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        • {item.quantity}x {item.menu.name} - {formatCurrency(typeof item.menuPrice === 'number' ? item.menuPrice : Number(item.menuPrice))}
                      </p>
                    ))}
                    {order.orderItems.length > 3 && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        +{order.orderItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount))}
                  </p>
                  {order.status === 'PENDING' && (
                    <button
                      className="mt-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                      type="button"
                    >
                      Process
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
