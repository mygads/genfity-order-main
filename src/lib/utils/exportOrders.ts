/**
 * Order Export Utilities
 * 
 * Utilities for exporting order data to CSV and Excel formats.
 * Handles data formatting, file generation, and browser downloads.
 * 
 * @module exportOrders
 */

import * as XLSX from 'xlsx';
import { formatInTimeZone } from 'date-fns-tz';

// ===== EXPORT OPTIONS =====

export interface ExportOptions {
  timezone?: string;
  currency?: string;
  locale?: string;
}

// ===== TYPES =====

export interface OrderExportData {
  orderNumber: string;
  orderType: string;
  status: string;
  customerName: string;
  customerPhone: string;
  tableNumber?: string;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAt?: string;
  placedAt: string;
  completedAt?: string;
}

// Input order type for formatOrderForExport
interface OrderItemAddon {
  addonItem?: { name: string };
}

interface OrderItem {
  quantity: number;
  menu?: { name: string };
  addons?: OrderItemAddon[];
}

interface OrderPayment {
  status?: string;
  paymentMethod?: string;
  paidAt?: Date | string;
}

interface OrderInput {
  orderNumber: string;
  orderType: string;
  status: string;
  customer?: { name?: string; phone?: string };
  tableNumber?: string;
  orderItems?: OrderItem[];
  subtotal?: number | string;
  taxAmount?: number | string;
  totalAmount?: number | string;
  payment?: OrderPayment;
  placedAt: Date | string;
  completedAt?: Date | string;
}

// Analytics data types
interface PopularItem {
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface RevenueByDate {
  date: string;
  revenue: number;
  orderCount: number;
}

interface PaymentMethodData {
  count: number;
  amount: number;
}

interface AnalyticsData {
  statistics: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
  };
  paymentStats: {
    totalRevenue: number;
    completedPayments: number;
    pendingPayments: number;
    byMethod: Record<string, PaymentMethodData>;
  };
  popularItems: PopularItem[];
  revenueByDate: RevenueByDate[];
}

// ===== CSV EXPORT =====

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: OrderExportData[]): string {
  if (data.length === 0) return '';

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');

  // Convert data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header as keyof OrderExportData];
        // Escape commas and quotes
        if (value === undefined || value === null) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: OrderExportData[], filename: string) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===== EXCEL EXPORT =====

/**
 * Convert data to Excel workbook
 */
export function convertToExcel(data: OrderExportData[]): XLSX.WorkBook {
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // orderNumber
    { wch: 12 }, // orderType
    { wch: 12 }, // status
    { wch: 20 }, // customerName
    { wch: 15 }, // customerPhone
    { wch: 10 }, // tableNumber
    { wch: 40 }, // items
    { wch: 12 }, // subtotal
    { wch: 10 }, // tax
    { wch: 12 }, // total
    { wch: 15 }, // paymentStatus
    { wch: 18 }, // paymentMethod
    { wch: 20 }, // paidAt
    { wch: 20 }, // placedAt
    { wch: 20 }, // completedAt
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  return workbook;
}

/**
 * Download Excel file
 */
export function downloadExcel(data: OrderExportData[], filename: string) {
  const workbook = convertToExcel(data);
  XLSX.writeFile(workbook, filename);
}

// ===== DATA FORMATTING =====

/**
 * Format currency for export with locale-aware formatting
 */
function formatCurrencyForExport(amount: number, options?: ExportOptions): string {
  const currency = options?.currency || 'AUD';
  const locale = currency === 'IDR' ? 'id-ID' : 'en-AU';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

/**
 * Format date for export using merchant timezone
 */
function formatDateForExport(date: Date | string, options?: ExportOptions): string {
  if (!date) return '-';
  const tz = options?.timezone || 'Australia/Sydney';
  try {
    return formatInTimeZone(new Date(date), tz, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return new Date(date).toLocaleString();
  }
}

/**
 * Format order data for export with timezone and currency options
 */
export function formatOrderForExport(order: OrderInput, options?: ExportOptions): OrderExportData {
  // Format items list
  const items = order.orderItems
    ?.map((item: OrderItem) => {
      const addons = item.addons
        ?.map((addon: OrderItemAddon) => `  + ${addon.addonItem?.name || 'Unknown'}`)
        .join('\n');
      return `${item.quantity}x ${item.menu?.name || 'Unknown'}${addons ? '\n' + addons : ''}`;
    })
    .join('\n');

  return {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerName: order.customer?.name || 'Guest',
    customerPhone: order.customer?.phone || '-',
    tableNumber: order.tableNumber || '-',
    items: items || 'No items',
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.taxAmount || 0),
    total: Number(order.totalAmount || 0),
    paymentStatus: order.payment?.status || 'PENDING',
    paymentMethod: order.payment?.paymentMethod || '-',
    paidAt: order.payment?.paidAt
      ? formatDateForExport(order.payment.paidAt, options)
      : '-',
    placedAt: formatDateForExport(order.placedAt, options),
    completedAt: order.completedAt
      ? formatDateForExport(order.completedAt, options)
      : '-',
  };
}

/**
 * Format multiple orders for export with options
 */
export function formatOrdersForExport(orders: OrderInput[], options?: ExportOptions): OrderExportData[] {
  return orders.map(order => formatOrderForExport(order, options));
}

// ===== EXPORT FUNCTIONS =====

/**
 * Export orders to CSV with timezone and currency options
 */
export function exportOrdersToCSV(orders: OrderInput[], filename?: string, options?: ExportOptions) {
  const formattedData = formatOrdersForExport(orders, options);
  const defaultFilename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, filename || defaultFilename);
}

/**
 * Export orders to Excel with timezone and currency options
 */
export function exportOrdersToExcel(orders: OrderInput[], filename?: string, options?: ExportOptions) {
  const formattedData = formatOrdersForExport(orders, options);
  const defaultFilename = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadExcel(formattedData, filename || defaultFilename);
}

// ===== ANALYTICS EXPORT =====

/**
 * Export analytics data to Excel with multiple sheets
 */
export function exportAnalyticsToExcel(analyticsData: AnalyticsData, filename?: string) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary Statistics
  const summaryData = [
    { Metric: 'Total Orders', Value: analyticsData.statistics.totalOrders },
    { Metric: 'Completed Orders', Value: analyticsData.statistics.completedOrders },
    { Metric: 'Cancelled Orders', Value: analyticsData.statistics.cancelledOrders },
    { Metric: 'Total Revenue', Value: analyticsData.paymentStats.totalRevenue },
    { Metric: 'Average Order Value', Value: analyticsData.statistics.averageOrderValue },
    { Metric: 'Completed Payments', Value: analyticsData.paymentStats.completedPayments },
    { Metric: 'Pending Payments', Value: analyticsData.paymentStats.pendingPayments },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Popular Items
  const popularItemsData = analyticsData.popularItems.map((item: PopularItem) => ({
    'Menu Item': item.menuName,
    'Quantity Sold': item.quantity,
    Revenue: item.revenue,
    'Number of Orders': item.orderCount,
  }));
  const popularItemsSheet = XLSX.utils.json_to_sheet(popularItemsData);
  popularItemsSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, popularItemsSheet, 'Popular Items');

  // Sheet 3: Revenue by Date
  const revenueByDateData = analyticsData.revenueByDate.map((item: RevenueByDate) => ({
    Date: item.date,
    Revenue: item.revenue,
    'Order Count': item.orderCount,
  }));
  const revenueSheet = XLSX.utils.json_to_sheet(revenueByDateData);
  revenueSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue by Date');

  // Sheet 4: Orders by Status
  const statusData = Object.entries(analyticsData.statistics.ordersByStatus).map(
    ([status, count]) => ({
      Status: status,
      Count: count,
    })
  );
  const statusSheet = XLSX.utils.json_to_sheet(statusData);
  statusSheet['!cols'] = [{ wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, statusSheet, 'Orders by Status');

  // Sheet 5: Payment Methods
  const paymentMethodData = Object.entries(analyticsData.paymentStats.byMethod).map(
    ([method, data]: [string, PaymentMethodData]) => ({
      'Payment Method': method,
      Count: data.count,
      Amount: data.amount,
    })
  );
  const paymentMethodSheet = XLSX.utils.json_to_sheet(paymentMethodData);
  paymentMethodSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, paymentMethodSheet, 'Payment Methods');

  // Download
  const defaultFilename = `analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename || defaultFilename);
}
