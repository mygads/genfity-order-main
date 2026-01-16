"use client";

import React from "react";
import { FaTimes, FaEnvelope, FaPhone, FaCalendar, FaShoppingBag } from "react-icons/fa";

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    merchant?: { name: string };
}

interface CustomerDetail {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
    totalOrders?: number;
    totalSpent?: number;
    lastOrderAt?: string | null;
    orders?: Order[];
    _count?: { orders: number };
    // Computed fields from API
    spentByCurrency?: Record<string, number>;
    computedLastOrderAt?: string | null;
    computedTotalOrders?: number;
}

interface CustomerDetailModalProps {
    customer: CustomerDetail | null;
    isOpen: boolean;
    onClose: () => void;
    isLoading?: boolean;
}

export default function CustomerDetailModal({
    customer,
    isOpen,
    onClose,
    isLoading = false,
}: CustomerDetailModalProps) {
    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        // Display without specific currency since customers may order from multiple merchants
        return amount.toLocaleString();
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            PENDING: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
            CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            READY: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
        };
        return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900 m-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Customer Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                        </div>
                    ) : customer ? (
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex items-start gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {customer.name}
                                        </h3>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${customer.isActive
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                }`}
                                        >
                                            {customer.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <FaEnvelope className="h-4 w-4" />
                                            <span>{customer.email}</span>
                                        </div>
                                        {customer.phone && (
                                            <div className="flex items-center gap-2">
                                                <FaPhone className="h-4 w-4" />
                                                <span>{customer.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <FaCalendar className="h-4 w-4" />
                                            <span>Registered {formatDate(customer.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {customer.computedTotalOrders || customer._count?.orders || customer.totalOrders || 0}
                                    </div>
                                    <div className="text-sm text-blue-600/70 dark:text-blue-400/70">
                                        Total Orders
                                    </div>
                                </div>
                                <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {customer.spentByCurrency && Object.keys(customer.spentByCurrency).length > 0 ? (
                                            <div className="space-y-1">
                                                {Object.entries(customer.spentByCurrency).map(([currency, amount]) => (
                                                    <div key={currency} className="flex items-baseline gap-1">
                                                        <span className="text-xs font-normal">{currency === 'AUD' ? 'A$' : currency === 'IDR' ? 'Rp' : currency}</span>
                                                        <span>{formatCurrency(amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            formatCurrency(customer.totalSpent || 0)
                                        )}
                                    </div>
                                    <div className="text-sm text-green-600/70 dark:text-green-400/70">
                                        Total Spent
                                    </div>
                                </div>
                                <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {(customer.computedLastOrderAt || customer.lastOrderAt)
                                            ? formatDate(customer.computedLastOrderAt || customer.lastOrderAt!)
                                            : "-"}
                                    </div>
                                    <div className="text-sm text-purple-600/70 dark:text-purple-400/70">
                                        Last Order
                                    </div>
                                </div>
                            </div>

                            {/* Order History */}
                            <div>
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                                    <FaShoppingBag className="h-4 w-4" />
                                    Recent Orders
                                </h4>
                                {customer.orders && customer.orders.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                    <th className="px-4 py-3">Order #</th>
                                                    <th className="px-4 py-3">Merchant</th>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {customer.orders.map((order) => (
                                                    <tr key={order.id} className="text-sm">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                            #{order.orderNumber}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                            {order.merchant?.name || "-"}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                            {formatDateTime(order.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                                                    order.status
                                                                )}`}
                                                            >
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                            {formatCurrency(order.totalAmount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-800">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            No orders found
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                            Customer not found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
