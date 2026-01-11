/**
 * Order History Table Component
 * 
 * Comprehensive table for viewing order history with sorting, filtering,
 * search, and pagination. Includes export functionality.
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaFileExport,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaPrint,
} from 'react-icons/fa';
import { OrderStatus, PaymentStatus, OrderType } from '@prisma/client';
import { exportOrdersToCSV, exportOrdersToExcel } from '@/lib/utils/exportOrders';
import { useMerchant } from '@/context/MerchantContext';
import { getCurrencySymbol } from '@/lib/utils/format';
import { formatFullOrderNumber } from '@/lib/utils/format';

// ===== TYPES =====

interface Order {
  id: string | number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName?: string;
  tableNumber?: string;
  totalAmount: number;
  placedAt: string;
  completedAt?: string;
  payment?: {
    status: PaymentStatus;
    paymentMethod?: string;
  };
}

interface OrderHistoryTableProps {
  orders: Order[];
  onViewOrder?: (orderId: string | number) => void;
  onDeleteOrder?: (orderId: string | number) => void;
  onPrintReceipt?: (orderId: string | number) => void;
  hasDeletePin?: boolean;
  loading?: boolean;
}

type SortField = 'orderNumber' | 'placedAt' | 'totalAmount' | 'status';
type SortDirection = 'asc' | 'desc';

// ===== STATUS BADGES =====

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const statusConfig = {
    PENDING: { bg: 'bg-warning-100 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-400', label: 'Pending' },
    ACCEPTED: { bg: 'bg-brand-100 dark:bg-brand-900/20', text: 'text-brand-700 dark:text-brand-400', label: 'Accepted' },
    IN_PROGRESS: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'In Progress' },
    READY: { bg: 'bg-success-100 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-400', label: 'Ready' },
    COMPLETED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Completed' },
    CANCELLED: { bg: 'bg-error-100 dark:bg-error-900/20', text: 'text-error-700 dark:text-error-400', label: 'Cancelled' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const statusConfig = {
    PENDING: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Unpaid' },
    COMPLETED: { bg: 'bg-success-100', text: 'text-success-700', label: 'Paid' },
    FAILED: { bg: 'bg-error-100', text: 'text-error-700', label: 'Failed' },
    REFUNDED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Refunded' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ===== MAIN COMPONENT =====

export const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({
  orders,
  onViewOrder,
  onDeleteOrder,
  onPrintReceipt,
  hasDeletePin = false,
  loading = false,
}) => {
  const { currency, merchant } = useMerchant();
  const currencySymbol = getCurrencySymbol(currency);
  // Derive timezone from currency until timezone is added to merchant settings
  const timezone = currency === 'IDR' ? 'Asia/Jakarta' : 'Australia/Sydney';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('COMPLETED');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('placedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Format currency using merchant currency
  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Free';
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.round(amount))}`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.tableNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.payment?.status === paymentFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortField] as string | number | Date;
      let bValue: string | number | Date = b[sortField] as string | number | Date;

      if (sortField === 'placedAt') {
        aValue = new Date(a.placedAt).getTime();
        bValue = new Date(b.placedAt).getTime();
      } else if (sortField === 'totalAmount') {
        aValue = Number(a.totalAmount);
        bValue = Number(b.totalAmount);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [orders, searchQuery, statusFilter, paymentFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort icon
  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? (
      <FaSortUp className="text-brand-500" />
    ) : (
      <FaSortDown className="text-brand-500" />
    );
  };

  // Export handlers with timezone and currency options
  const exportOptions = { timezone, currency };

  const handleExportCSV = () => {
    exportOrdersToCSV(filteredAndSortedOrders, undefined, exportOptions);
  };

  const handleExportExcel = () => {
    exportOrdersToExcel(filteredAndSortedOrders, undefined, exportOptions);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="h-96 bg-gray-100 dark:bg-gray-900 rounded"></div>
      </div>
    );
  }

  return (
    <div data-tutorial="order-history-list" className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by order number, customer, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'ALL')}
          className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="ALL">All Payments</option>
          <option value="PENDING">Unpaid</option>
          <option value="COMPLETED">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>

        {/* Export Buttons */}
        <div data-tutorial="export-orders-btn" className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <FaFileExport />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="h-10 px-4 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2"
          >
            <FaFileExport />
            Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th
                  onClick={() => handleSort('orderNumber')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    Order # <SortIcon field="orderNumber" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payment
                </th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-end gap-2">
                    Total <SortIcon field="totalAmount" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('placedAt')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    Date <SortIcon field="placedAt" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-600">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatFullOrderNumber(order.orderNumber, merchant?.code)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {order.orderType === 'DINE_IN' ? '🍽️ Dine In' : '🥡 Takeaway'}
                      {order.tableNumber && (
                        <div className="text-xs text-gray-500">Table {order.tableNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {order.customerName || 'Guest'}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.payment ? (
                        <div>
                          <PaymentStatusBadge status={order.payment.status} />
                          {order.payment.paymentMethod && (
                            <div className="text-xs text-gray-500 mt-1">
                              {order.payment.paymentMethod.replace(/_/g, ' ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-gray-800 dark:text-white/90">
                      <span className={formatCurrency(Number(order.totalAmount)) === 'Free' ? 'text-success-600 dark:text-success-400' : ''}>
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(order.placedAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <div className="text-xs text-gray-500">
                        {new Date(order.placedAt).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewOrder?.(order.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FaEye />
                          View
                        </button>
                        {onPrintReceipt && (
                          <button
                            onClick={() => onPrintReceipt(order.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-sm hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
                            title="Print Receipt"
                          >
                            <FaPrint />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteOrder?.(order.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm hover:bg-error-100 dark:hover:bg-error-900/40 transition-colors"
                          title="Void Transaction"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of{' '}
            {filteredAndSortedOrders.length} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FaChevronLeft size={12} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryTable;
