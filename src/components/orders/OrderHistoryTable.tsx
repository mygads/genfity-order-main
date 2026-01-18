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
  FaTimes,
  FaFileExport,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaPrint,
  FaCalendarAlt,
  FaTruck,
  FaUtensils,
  FaShoppingBag,
} from 'react-icons/fa';
import { TableActionButton } from '@/components/common/TableActionButton';
import { OrderStatus, PaymentStatus, OrderType } from '@prisma/client';
import { exportOrdersToCSV, exportOrdersToExcel } from '@/lib/utils/exportOrders';
import { useMerchant } from '@/context/MerchantContext';
import { getCurrencySymbol } from '@/lib/utils/format';
import { formatFullOrderNumber } from '@/lib/utils/format';
import { formatPaymentMethodLabel } from '@/lib/utils/paymentDisplay';
import { useTranslation } from '@/lib/i18n/useTranslation';

// ===== TYPES =====

interface Order {
  id: string | number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName?: string;
  tableNumber?: string;
  reservation?: {
    partySize: number;
    reservationDate: string | Date;
    reservationTime: string;
    tableNumber?: string | null;
    status?: string;
  } | null;
  totalAmount: number;
  placedAt: string;
  completedAt?: string;
  editedAt?: string | null;
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
type OrderTypeFilter = 'ALL' | 'RESERVATION' | 'ORDER';

const getAdminStatusKey = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'admin.status.pending';
    case 'ACCEPTED':
      return 'admin.status.accepted';
    case 'IN_PROGRESS':
      return 'admin.status.inProgress';
    case 'READY':
      return 'admin.status.ready';
    case 'COMPLETED':
      return 'admin.status.completed';
    case 'CANCELLED':
      return 'admin.status.cancelled';
    default:
      return 'admin.status.pending';
  }
};

// ===== STATUS BADGES =====

const OrderStatusBadge: React.FC<{ status: OrderStatus; label: string }> = ({ status, label }) => {
  const statusConfig = {
    PENDING: { bg: 'bg-brand-100 dark:bg-brand-900/20', text: 'text-brand-700 dark:text-brand-400' },
    ACCEPTED: { bg: 'bg-brand-100 dark:bg-brand-900/20', text: 'text-brand-700 dark:text-brand-400' },
    IN_PROGRESS: { bg: 'bg-brand-100 dark:bg-brand-900/20', text: 'text-brand-700 dark:text-brand-400' },
    READY: { bg: 'bg-success-100 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-400' },
    COMPLETED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
    CANCELLED: { bg: 'bg-error-100 dark:bg-error-900/20', text: 'text-error-700 dark:text-error-400' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label}
    </span>
  );
};

const PaymentStatusBadge: React.FC<{ status: PaymentStatus; label: string }> = ({ status, label }) => {
  const statusConfig = {
    PENDING: { bg: 'bg-brand-100', text: 'text-brand-700' },
    COMPLETED: { bg: 'bg-success-100', text: 'text-success-700' },
    FAILED: { bg: 'bg-error-100', text: 'text-error-700' },
    REFUNDED: { bg: 'bg-brand-100', text: 'text-brand-700' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label}
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
  const { t } = useTranslation();
  const { currency, merchant } = useMerchant();
  const currencySymbol = getCurrencySymbol(currency);
  // Derive timezone from currency until timezone is added to merchant settings
  const timezone = currency === 'IDR' ? 'Asia/Jakarta' : 'Australia/Sydney';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('COMPLETED');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('placedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Format currency using merchant currency
  const formatCurrency = (amount: number) => {
    if (amount === 0) return t('admin.history.free');
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.round(amount))}`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Type filter (reservation vs normal order)
    if (typeFilter === 'RESERVATION') {
      filtered = filtered.filter((order) => !!order.reservation);
    } else if (typeFilter === 'ORDER') {
      filtered = filtered.filter((order) => !order.reservation);
    }

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
  }, [orders, typeFilter, searchQuery, statusFilter, paymentFilter, sortField, sortDirection]);


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
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <input
            type="text"
            placeholder={t('admin.history.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
          <FaSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={t('admin.history.filters.clearSearch')}
            >
              <FaTimes className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as OrderTypeFilter)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="ALL">{t('admin.history.filters.allTypes')}</option>
          <option value="RESERVATION">{t('admin.history.filters.reservationsOnly')}</option>
          <option value="ORDER">{t('admin.history.filters.ordersOnly')}</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="ALL">{t('admin.history.filters.allStatuses')}</option>
          <option value="PENDING">{t('admin.status.pending')}</option>
          <option value="ACCEPTED">{t('admin.status.accepted')}</option>
          <option value="IN_PROGRESS">{t('admin.status.inProgress')}</option>
          <option value="READY">{t('admin.status.ready')}</option>
          <option value="COMPLETED">{t('admin.status.completed')}</option>
          <option value="CANCELLED">{t('admin.status.cancelled')}</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'ALL')}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="ALL">{t('admin.history.filters.allPayments')}</option>
          <option value="PENDING">{t('admin.payment.unpaid')}</option>
          <option value="COMPLETED">{t('admin.payment.paid')}</option>
          <option value="FAILED">{t('admin.payment.failed')}</option>
          <option value="REFUNDED">{t('admin.payment.refunded')}</option>
        </select>

        {/* Export Buttons */}
        <div data-tutorial="export-orders-btn" className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title={t('admin.history.export.csv')}
          >
            <FaFileExport />
            {t('admin.history.export.csvShort')}
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            title={t('admin.history.export.excel')}
          >
            <FaFileExport />
            {t('admin.history.export.excelShort')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                <th
                  onClick={() => handleSort('orderNumber')}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {t('admin.history.table.orderNumber')} <SortIcon field="orderNumber" />
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.history.table.type')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.history.table.customer')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {t('admin.history.table.status')} <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.history.table.payment')}
                </th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('admin.history.table.total')} <SortIcon field="totalAmount" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('placedAt')}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {t('admin.history.table.date')} <SortIcon field="placedAt" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.history.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-600">
                    {t('admin.history.table.noOrdersFound')}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{formatFullOrderNumber(order.orderNumber, merchant?.code)}</span>
                        {order.editedAt ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            {t('common.changedByAdmin') || 'Changed by admin'}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        {order.reservation ? (
                          <FaCalendarAlt className="text-gray-400" />
                        ) : order.orderType === 'DELIVERY' ? (
                          <FaTruck className="text-gray-400" />
                        ) : order.orderType === 'DINE_IN' ? (
                          <FaUtensils className="text-gray-400" />
                        ) : (
                          <FaShoppingBag className="text-gray-400" />
                        )}
                        <span>
                          {order.reservation
                            ? t('admin.history.type.reservation')
                            : order.orderType === 'DELIVERY'
                              ? t('admin.history.type.delivery')
                              : order.orderType === 'DINE_IN'
                                ? t('admin.history.type.dineIn')
                                : t('admin.history.type.takeaway')}
                        </span>
                      </div>
                      {order.reservation ? (
                        <div className="text-xs text-gray-500">
                          {t('admin.history.type.guests', { count: order.reservation.partySize })}
                          {` • ${t('admin.history.type.table', {
                            tableNumber: String(order.tableNumber || order.reservation.tableNumber || '-'),
                          })}`}
                        </div>
                      ) : order.orderType === 'DINE_IN' ? (
                        <div className="text-xs text-gray-500">
                          {t('admin.history.type.table', { tableNumber: String(order.tableNumber || '-') })}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {order.customerName || t('admin.history.customer.guest')}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} label={t(getAdminStatusKey(order.status))} />
                    </td>
                    <td className="px-4 py-3">
                      {order.payment ? (
                        <div>
                          <PaymentStatusBadge
                            status={order.payment.status}
                            label={
                              order.payment.status === 'PENDING'
                                ? t('admin.payment.unpaid')
                                : order.payment.status === 'COMPLETED'
                                  ? t('admin.payment.paid')
                                  : order.payment.status === 'FAILED'
                                    ? t('admin.payment.failed')
                                    : order.payment.status === 'REFUNDED'
                                      ? t('admin.payment.refunded')
                                      : t('admin.payment.cancelled')
                            }
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPaymentMethodLabel({
                              orderType: order.orderType,
                              paymentStatus: order.payment.status,
                              paymentMethod: order.payment.paymentMethod,
                            }, { t })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t('admin.history.payment.na')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-gray-800 dark:text-white/90">
                      <span className={formatCurrency(Number(order.totalAmount)) === t('admin.history.free') ? 'text-success-600 dark:text-success-400' : ''}>
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
                        <TableActionButton
                          icon={FaEye}
                          label={t('common.view')}
                          onClick={() => onViewOrder?.(order.id)}
                        />
                        {onPrintReceipt && (
                          <TableActionButton
                            icon={FaPrint}
                            onClick={() => onPrintReceipt(order.id)}
                            title={t('admin.history.actions.printReceipt')}
                            aria-label={t('admin.history.actions.printReceipt')}
                          />
                        )}
                        <TableActionButton
                          icon={FaTrash}
                          tone="danger"
                          onClick={() => onDeleteOrder?.(order.id)}
                          title={hasDeletePin ? t('admin.history.actions.voidTransaction') : t('admin.history.actions.deleteOrder')}
                          aria-label={hasDeletePin ? t('admin.history.actions.voidTransaction') : t('admin.history.actions.deleteOrder')}
                        />
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
            {t('admin.history.pagination.showing', {
              from: (currentPage - 1) * itemsPerPage + 1,
              to: Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length),
              total: filteredAndSortedOrders.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FaChevronLeft size={12} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.history.pagination.page', { page: currentPage, totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
