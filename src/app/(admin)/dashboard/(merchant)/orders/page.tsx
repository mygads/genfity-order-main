"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

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
        router.push("/signin");
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
      setOrders(data.data || []);
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
        router.push("/signin");
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
        return "bg-warning/10 text-warning";
      case "CONFIRMED":
        return "bg-primary/10 text-primary";
      case "PREPARING":
        return "bg-meta-9/10 text-meta-9";
      case "READY":
        return "bg-meta-3/10 text-meta-3";
      case "COMPLETED":
        return "bg-success/10 text-success";
      case "CANCELLED":
        return "bg-meta-1/10 text-meta-1";
      default:
        return "bg-body/10 text-body";
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
      <>
        <PageBreadCrumb pageTitle="Orders" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading orders...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Orders" />

      <div className="mt-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <ComponentCard title="Orders List">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-black dark:text-white">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded border border-stroke bg-gray px-4 py-2 text-sm focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
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
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              Refresh
            </button>
          </div>
          
          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-body-color">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Order #</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Customer</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Total</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Date</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-4 font-medium">{order.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-body-color">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">Rp {parseFloat(order.grandTotal).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">{new Date(order.createdAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary hover:text-primary/80"
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
        </ComponentCard>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-boxdark">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-body-color hover:text-black dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-body-color">Order Number</p>
                    <p className="mt-1 font-medium text-black dark:text-white">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Status</p>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Customer Name</p>
                    <p className="mt-1 text-black dark:text-white">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Customer Phone</p>
                    <p className="mt-1 text-black dark:text-white">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Order Date</p>
                    <p className="mt-1 text-black dark:text-white">{new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="border-t border-stroke pt-4 dark:border-strokedark">
                  <p className="mb-3 font-medium text-black dark:text-white">Order Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded bg-gray-2 p-3 dark:bg-meta-4">
                        <div>
                          <p className="font-medium text-black dark:text-white">{item.itemName}</p>
                          <p className="text-sm text-body-color">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-black dark:text-white">
                          Rp {parseFloat(item.price).toLocaleString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-stroke pt-4 dark:border-strokedark">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-body-color">Subtotal</p>
                      <p className="font-medium text-black dark:text-white">
                        Rp {parseFloat(selectedOrder.totalAmount).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-body-color">Tax</p>
                      <p className="font-medium text-black dark:text-white">
                        Rp {parseFloat(selectedOrder.taxAmount).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex justify-between border-t border-stroke pt-2 dark:border-strokedark">
                      <p className="font-bold text-black dark:text-white">Grand Total</p>
                      <p className="font-bold text-black dark:text-white">
                        Rp {parseFloat(selectedOrder.grandTotal).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                {getNextStatuses(selectedOrder.status).length > 0 && (
                  <div className="border-t border-stroke pt-4 dark:border-strokedark">
                    <p className="mb-3 font-medium text-black dark:text-white">Update Status</p>
                    <div className="flex gap-3">
                      {getNextStatuses(selectedOrder.status).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateOrderStatus(selectedOrder.id, status)}
                          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
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
    </>
  );
}
