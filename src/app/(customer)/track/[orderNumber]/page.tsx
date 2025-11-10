"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrderItem {
  itemName: string;
  quantity: number;
  price: string;
}

interface OrderDetails {
  orderNumber: string;
  merchantName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  taxAmount: string;
  grandTotal: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  items: OrderItem[];
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/orders/${orderNumber}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Order not found");
      }

      setOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return { label: "Pending", color: "bg-warning/10 text-warning", description: "Waiting for merchant confirmation" };
      case "CONFIRMED":
        return { label: "Confirmed", color: "bg-primary/10 text-primary", description: "Order confirmed by merchant" };
      case "PREPARING":
        return { label: "Preparing", color: "bg-meta-9/10 text-meta-9", description: "Your order is being prepared" };
      case "READY":
        return { label: "Ready", color: "bg-meta-3/10 text-meta-3", description: "Your order is ready for pickup/delivery" };
      case "COMPLETED":
        return { label: "Completed", color: "bg-success/10 text-success", description: "Order completed successfully" };
      case "CANCELLED":
        return { label: "Cancelled", color: "bg-meta-1/10 text-meta-1", description: "Order has been cancelled" };
      default:
        return { label: status, color: "bg-body/10 text-body", description: "" };
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "PENDING": return 20;
      case "CONFIRMED": return 40;
      case "PREPARING": return 60;
      case "READY": return 80;
      case "COMPLETED": return 100;
      case "CANCELLED": return 0;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-boxdark-2">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-body-color">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 p-4 dark:bg-boxdark-2">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-boxdark">
          <div className="mb-6 text-center">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-black dark:text-white">Order Not Found</h2>
            <p className="mt-2 text-sm text-body-color">{error || "The order number you entered could not be found"}</p>
          </div>
          <button
            onClick={() => router.push("/lookup")}
            className="w-full rounded bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const progress = getProgressPercentage(order.status);

  return (
    <div className="min-h-screen bg-gray-2 p-4 dark:bg-boxdark-2">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">Order Tracking</h1>
          <p className="mt-2 text-body-color">Track your order status in real-time</p>
        </div>

        {/* Order Number & Status */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <p className="text-sm text-body-color">Order Number</p>
              <p className="text-2xl font-bold text-primary">{order.orderNumber}</p>
            </div>
            <div className="text-center md:text-right">
              <span className={`inline-flex rounded-full px-6 py-2 text-lg font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <p className="mt-2 text-sm text-body-color">{statusInfo.description}</p>
            </div>
          </div>

          {/* Progress Bar */}
          {order.status !== "CANCELLED" && (
            <div className="mt-6">
              <div className="h-3 w-full rounded-full bg-gray-2 dark:bg-meta-4">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-body-color">
                <span>Pending</span>
                <span>Confirmed</span>
                <span>Preparing</span>
                <span>Ready</span>
                <span>Completed</span>
              </div>
            </div>
          )}
        </div>

        {/* Merchant & Customer Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
            <h3 className="mb-4 text-lg font-bold text-black dark:text-white">Merchant</h3>
            <p className="text-base text-black dark:text-white">{order.merchantName}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
            <h3 className="mb-4 text-lg font-bold text-black dark:text-white">Customer</h3>
            <div className="space-y-2 text-sm">
              <p className="text-black dark:text-white">{order.customerName}</p>
              <p className="text-body-color">{order.customerEmail}</p>
              <p className="text-body-color">{order.customerPhone}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
          <h3 className="mb-4 text-lg font-bold text-black dark:text-white">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between rounded bg-gray-2 p-4 dark:bg-meta-4">
                <div>
                  <p className="font-medium text-black dark:text-white">{item.itemName}</p>
                  <p className="text-sm text-body-color">Quantity: {item.quantity}</p>
                </div>
                <p className="font-medium text-black dark:text-white">
                  Rp {parseFloat(item.price).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-stroke pt-4 dark:border-strokedark">
            <div className="flex justify-between">
              <p className="text-body-color">Subtotal</p>
              <p className="font-medium text-black dark:text-white">
                Rp {parseFloat(order.totalAmount).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-body-color">Tax</p>
              <p className="font-medium text-black dark:text-white">
                Rp {parseFloat(order.taxAmount).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex justify-between border-t border-stroke pt-2 dark:border-strokedark">
              <p className="text-lg font-bold text-black dark:text-white">Grand Total</p>
              <p className="text-lg font-bold text-primary">
                Rp {parseFloat(order.grandTotal).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-body-color">Order Date</p>
              <p className="mt-1 text-base font-medium text-black dark:text-white">
                {new Date(order.createdAt).toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={fetchOrder}
              className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push("/lookup")}
            className="rounded border border-stroke px-6 py-2.5 font-medium text-black hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            New Order
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
