'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/hooks/useToast';

type DeliveryOrder = {
  id: string;
  orderNumber: string;
  placedAt: string;
  totalAmount: string | number;
  deliveryStatus?: string | null;
  deliveryAddress?: string | null;
  customer?: { name: string; phone?: string | null; email: string } | null;
  merchant?: { name: string; code: string; currency: string };
  itemsCount: number;
  payment?: {
    paymentMethod?: string | null;
    status?: string | null;
    paidAt?: string | null;
    amount?: string | number;
  } | null;
};

export default function DeliveryOrdersPage() {
  const { success, error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const url = useMemo(() => {
    const base = '/api/delivery/orders';
    return statusFilter ? `${base}?status=${encodeURIComponent(statusFilter)}` : base;
  }, [statusFilter]);

  const { data, isLoading, mutate } = useSWR(url, { refreshInterval: 15000 });

  const orders: DeliveryOrder[] = data?.success ? data.data : [];

  const updateStatus = async (orderId: string, deliveryStatus: 'PICKED_UP' | 'DELIVERED' | 'FAILED') => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deliveryStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to update delivery status');
      }

      success('Success', 'Delivery status updated successfully');
      mutate();
    } catch (e) {
      showError('Error', (e as Error).message || 'Failed to update delivery status');
    }
  };

  const confirmCod = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/delivery/orders/${orderId}/cod/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to confirm cash payment');
      }

      success('Success', 'Cash payment confirmed');
      mutate();
    } catch (e) {
      showError('Error', (e as Error).message || 'Failed to confirm cash payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Deliveries</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage assigned delivery orders.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">All statuses</option>
            <option value="PENDING_ASSIGNMENT">Pending assignment</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked up</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="button"
            onClick={() => mutate()}
            className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
            No deliveries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="py-3">Payment</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 text-sm dark:border-gray-800">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{o.orderNumber}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{o.deliveryStatus || '—'}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{o.customer?.name || '—'}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{o.deliveryAddress || '—'}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{o.itemsCount}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{String(o.totalAmount)}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{new Date(o.placedAt).toLocaleString()}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      <div className="space-y-0.5">
                        <div className="text-xs">
                          {o.payment?.paymentMethod === 'CASH_ON_DELIVERY'
                            ? 'Cash on Delivery'
                            : o.payment?.paymentMethod || '—'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {o.payment?.status || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(o.id, 'PICKED_UP')}
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          Picked up
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(o.id, 'DELIVERED')}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                        >
                          Delivered
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(o.id, 'FAILED')}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Failed
                        </button>

                        {o.payment?.paymentMethod === 'CASH_ON_DELIVERY' && o.payment?.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => confirmCod(o.id)}
                            className="rounded-lg bg-success-500 px-3 py-2 text-xs font-medium text-white hover:bg-success-600"
                          >
                            Confirm cash
                          </button>
                        )}
                      </div>
                    </td>
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
