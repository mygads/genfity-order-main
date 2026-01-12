import Link from 'next/link';
import { formatFullOrderNumber } from '@/lib/utils/format';

type Merchant = {
  id: bigint;
  code: string;
  name: string;
  currency?: string;
};

type DeliveryOrder = {
  id: bigint;
  orderNumber: string;
  totalAmount: number | { toString(): string };
  placedAt: Date;
  deliveryStatus?: string | null;
  deliveryAddress?: string | null;
  deliveryFeeAmount?: number | { toString(): string };
  itemsCount: number;
  customer?: {
    name: string;
    phone?: string | null;
    email: string;
  } | null;
};

interface DeliveryDriverDashboardProps {
  merchant: Merchant;
  stats: {
    assignedCount: number;
    pickedUpCount: number;
    deliveredTodayCount: number;
  };
  activeDeliveries: DeliveryOrder[];
}

export default function DeliveryDriverDashboard({
  merchant,
  stats,
  activeDeliveries,
}: DeliveryDriverDashboardProps) {
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

    return `A$${amount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const toNumber = (value: number | { toString(): string }) => {
    return typeof value === 'number' ? value : Number(value.toString());
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{merchant.name}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Delivery Dashboard</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/dashboard/delivery/orders"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            View Deliveries
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.assignedCount}</h3>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Picked Up</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.pickedUpCount}</h3>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered Today</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.deliveredTodayCount}</h3>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Deliveries</h3>
          <Link
            href="/admin/dashboard/delivery/orders"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Manage →
          </Link>
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
            No active deliveries right now.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-3">Order</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Address</th>
                  <th className="py-3">Items</th>
                  <th className="py-3">Total</th>
                  <th className="py-3">Placed</th>
                </tr>
              </thead>
              <tbody>
                {activeDeliveries.map((order) => (
                  <tr key={order.id.toString()} className="border-b border-gray-100 text-sm dark:border-gray-800">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {formatFullOrderNumber(order.orderNumber)}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {order.deliveryStatus || '—'}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {order.customer?.name || '—'}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {order.deliveryAddress || '—'}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{order.itemsCount}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {formatCurrency(toNumber(order.totalAmount))}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{formatDate(order.placedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
