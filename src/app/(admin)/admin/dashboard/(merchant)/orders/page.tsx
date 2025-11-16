"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface OrderItem {
  itemName: string;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: string;
  taxAmount: string;
  grandTotal: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  items: OrderItem[];
}

export default function MerchantOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const url = statusFilter === "all" 
        ? "/api/merchant/orders"
        : `/api/merchant/orders?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      
      // Handle response format: { success: true, data: [...] }
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update order status");
      }

      setSuccess(`Order status updated to ${newStatus}`);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400";
      case "CONFIRMED":
        return "bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400";
      case "PREPARING":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      case "READY":
        return "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400";
      case "COMPLETED":
        return "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400";
      case "CANCELLED":
        return "bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case "PENDING":
        return ["CONFIRMED", "CANCELLED"];
      case "CONFIRMED":
        return ["PREPARING", "CANCELLED"];
      case "PREPARING":
        return ["READY", "CANCELLED"];
      case "READY":
        return ["COMPLETED"];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Orders" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Orders" />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-error-50 p-4 dark:bg-error-900/20">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-success-50 p-4 dark:bg-success-900/20">
            <p className="text-sm text-success-600 dark:text-success-400">{success}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Orders List</h3>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Orders</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button
              onClick={fetchOrders}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            >
              Refresh
            </button>
          </div>
          
          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Order #</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Total</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{order.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{order.customerName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">Rp {parseFloat(order.grandTotal).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">{new Date(order.createdAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-sm text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Number</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-white/90">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Name</p>
                    <p className="mt-1 text-gray-800 dark:text-white/90">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Phone</p>
                    <p className="mt-1 text-gray-800 dark:text-white/90">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Date</p>
                    <p className="mt-1 text-gray-800 dark:text-white/90">{new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                  <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Order Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.itemName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          Rp {parseFloat(item.price).toLocaleString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        Rp {parseFloat(selectedOrder.totalAmount).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tax</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        Rp {parseFloat(selectedOrder.taxAmount).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
                      <p className="font-bold text-gray-800 dark:text-white/90">Grand Total</p>
                      <p className="font-bold text-gray-800 dark:text-white/90">
                        Rp {parseFloat(selectedOrder.grandTotal).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                {getNextStatuses(selectedOrder.status).length > 0 && (
                  <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                    <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Update Status</p>
                    <div className="flex gap-3">
                      {getNextStatuses(selectedOrder.status).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateOrderStatus(selectedOrder.id, status)}
                          className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
                        >
                          Mark as {status}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
