/**
 * Unified Receipt Generator
 * 
 * Centralized HTML receipt generator with merchant customization support
 * Used across POS Order History, Order History Page, and any print location
 * 
 * Features:
 * - Customizable sections based on merchant settings
 * - Multi-language support (English/Indonesian)
 * - Logo support
 * - Genfity branding (always shown)
 */

import { ReceiptSettings, DEFAULT_RECEIPT_SETTINGS } from '@/lib/types/receiptSettings';

// ============================================
// TYPES
// ============================================

export interface ReceiptOrderItem {
  quantity: number;
  menuName: string;
  unitPrice?: number;
  subtotal: number;
  notes?: string | null;
  addons?: Array<{
    addonName: string;
    addonPrice?: number;
  }>;
}

export interface ReceiptOrderData {
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  placedAt: string;
  paidAt?: string | null;
  items: ReceiptOrderItem[];
  subtotal: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  packagingFeeAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  changeAmount?: number;
  paymentMethod?: string | null;
  paymentStatus?: string;
  cashierName?: string | null;
}

export interface ReceiptMerchantInfo {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
}

export interface GenerateReceiptOptions {
  order: ReceiptOrderData;
  merchant: ReceiptMerchantInfo;
  settings?: Partial<ReceiptSettings> | null;
  language?: 'en' | 'id';
}

// ============================================
// LABELS
// ============================================

interface ReceiptLabels {
  orderNumber: string;
  table: string;
  dineIn: string;
  takeaway: string;
  customer: string;
  phone: string;
  email: string;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  packagingFee: string;
  discount: string;
  total: string;
  paymentMethod: string;
  amountPaid: string;
  change: string;
  cashier: string;
  thankYou: string;
  poweredBy: string;
}

const labelsEN: ReceiptLabels = {
  orderNumber: 'Order #',
  table: 'Table',
  dineIn: 'Dine In',
  takeaway: 'Takeaway',
  customer: 'Customer',
  phone: 'Phone',
  email: 'Email',
  subtotal: 'Subtotal',
  tax: 'Tax',
  serviceCharge: 'Service Charge',
  packagingFee: 'Packaging Fee',
  discount: 'Discount',
  total: 'TOTAL',
  paymentMethod: 'Payment',
  amountPaid: 'Amount Paid',
  change: 'Change',
  cashier: 'Cashier',
  thankYou: 'Thank you for your order!',
  poweredBy: 'Powered by',
};

const labelsID: ReceiptLabels = {
  orderNumber: 'Pesanan #',
  table: 'Meja',
  dineIn: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  customer: 'Pelanggan',
  phone: 'Telepon',
  email: 'Email',
  subtotal: 'Subtotal',
  tax: 'Pajak',
  serviceCharge: 'Biaya Layanan',
  packagingFee: 'Biaya Kemasan',
  discount: 'Diskon',
  total: 'TOTAL',
  paymentMethod: 'Pembayaran',
  amountPaid: 'Jumlah Dibayar',
  change: 'Kembalian',
  cashier: 'Kasir',
  thankYou: 'Terima kasih atas pesanan Anda!',
  poweredBy: 'Diberdayakan oleh',
};

// ============================================
// HELPERS
// ============================================

function getLabels(language: 'en' | 'id'): ReceiptLabels {
  return language === 'id' ? labelsID : labelsEN;
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'IDR') {
    return `Rp${new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount))}`;
  }
  if (currency === 'AUD') {
    return `A$${amount.toFixed(2)}`;
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDateTime(dateString: string, language: 'en' | 'id'): string {
  const date = new Date(dateString);
  const locale = language === 'id' ? 'id-ID' : 'en-AU';
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate receipt HTML with merchant customization
 */
export function generateReceiptHTML(options: GenerateReceiptOptions): string {
  const { order, merchant, language = 'en' } = options;
  
  // Merge default settings with merchant custom settings
  const settings: ReceiptSettings = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(options.settings || {}),
  };
  
  const labels = getLabels(language);
  const currency = merchant.currency || 'AUD';
  const fmt = (amount: number) => formatCurrency(amount, currency);
  
  // Build receipt sections
  const headerHtml = buildHeaderSection(merchant, settings, labels);
  const orderInfoHtml = buildOrderInfoSection(order, settings, labels, language);
  const itemsHtml = buildItemsSection(order.items, settings, fmt);
  const paymentHtml = buildPaymentSection(order, settings, labels, fmt);
  const footerHtml = buildFooterSection(order, settings, labels, merchant);

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <title>${labels.orderNumber}${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', 'Lucida Console', monospace; 
      font-size: 12px; 
      line-height: 1.4;
      padding: 10px; 
      max-width: 280px; 
      margin: 0 auto; 
      color: #000;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px dashed #000; 
      padding-bottom: 10px; 
      margin-bottom: 10px; 
    }
    .logo { 
      max-width: 80px; 
      max-height: 80px; 
      margin: 0 auto 8px; 
      display: block; 
    }
    .merchant-name { 
      font-size: 16px; 
      font-weight: bold; 
      margin: 0 0 4px; 
    }
    .merchant-info { 
      font-size: 10px; 
      margin: 2px 0; 
      color: #333; 
    }
    .order-info { 
      text-align: center; 
      margin-bottom: 10px; 
      padding-bottom: 8px; 
      border-bottom: 1px dashed #999; 
    }
    .order-number { 
      font-size: 14px; 
      font-weight: bold;
      margin: 0 0 4px; 
    }
    .order-meta { 
      margin: 2px 0; 
      font-size: 11px;
    }
    .items { margin-bottom: 10px; }
    .item { margin: 6px 0; }
    .item-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 2px 0; 
    }
    .item-name { font-weight: 500; }
    .item-addon { 
      margin-left: 12px; 
      font-size: 10px; 
      color: #555; 
    }
    .item-notes { 
      margin-left: 12px; 
      font-size: 10px; 
      font-style: italic; 
      color: #666; 
    }
    .payment-section { 
      border-top: 1px dashed #999; 
      padding-top: 8px; 
      margin-bottom: 10px;
    }
    .payment-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0; 
    }
    .total-row { 
      font-size: 16px; 
      font-weight: bold; 
      margin-top: 8px; 
      padding-top: 8px;
      border-top: 1px solid #000;
    }
    .discount { color: #228B22; }
    .footer { 
      text-align: center; 
      margin-top: 15px; 
      padding-top: 10px; 
      border-top: 2px dashed #000; 
    }
    .thank-you { 
      font-weight: bold; 
      margin-bottom: 5px; 
    }
    .cashier { 
      font-size: 10px; 
      color: #555; 
      margin-bottom: 8px;
    }
    .custom-footer {
      font-size: 10px;
      color: #333;
      margin: 8px 0;
      padding: 6px 8px;
      background: #f5f5f5;
      border-radius: 4px;
      text-align: center;
    }
    .branding { 
      margin-top: 12px; 
      padding-top: 8px; 
      border-top: 1px solid #ddd; 
      font-size: 9px; 
      color: #888; 
    }
    .branding a { 
      color: #0066cc; 
      text-decoration: none; 
    }
    @media print { 
      @page { margin: 0; size: 80mm auto; } 
      body { padding: 5px; }
    }
  </style>
</head>
<body>
  ${headerHtml}
  ${orderInfoHtml}
  ${itemsHtml}
  ${paymentHtml}
  ${footerHtml}
</body>
</html>
  `.trim();
}

// ============================================
// SECTION BUILDERS
// ============================================

function buildHeaderSection(
  merchant: ReceiptMerchantInfo,
  settings: ReceiptSettings,
  labels: ReceiptLabels
): string {
  const parts: string[] = [];
  
  if (settings.showLogo && merchant.logoUrl) {
    parts.push(`<img src="${merchant.logoUrl}" alt="${merchant.name}" class="logo" crossorigin="anonymous" />`);
  }
  
  if (settings.showMerchantName) {
    parts.push(`<h1 class="merchant-name">${merchant.name}</h1>`);
  }
  
  if (settings.showAddress && merchant.address) {
    parts.push(`<p class="merchant-info">${merchant.address}</p>`);
  }
  
  if (settings.showPhone && merchant.phone) {
    parts.push(`<p class="merchant-info">📞 ${merchant.phone}</p>`);
  }
  
  if (settings.showEmail && merchant.email) {
    parts.push(`<p class="merchant-info">✉️ ${merchant.email}</p>`);
  }
  
  if (parts.length === 0) return '';
  
  return `<div class="header">${parts.join('\n')}</div>`;
}

function buildOrderInfoSection(
  order: ReceiptOrderData,
  settings: ReceiptSettings,
  labels: ReceiptLabels,
  language: 'en' | 'id'
): string {
  const parts: string[] = [];
  
  if (settings.showOrderNumber) {
    parts.push(`<h2 class="order-number">${labels.orderNumber}${order.orderNumber}</h2>`);
  }
  
  if (settings.showOrderType) {
    const typeLabel = order.orderType === 'DINE_IN' ? labels.dineIn : labels.takeaway;
    const tableInfo = settings.showTableNumber && order.tableNumber 
      ? ` - ${labels.table} ${order.tableNumber}` 
      : '';
    parts.push(`<p class="order-meta">${typeLabel}${tableInfo}</p>`);
  } else if (settings.showTableNumber && order.tableNumber) {
    parts.push(`<p class="order-meta">${labels.table} ${order.tableNumber}</p>`);
  }
  
  if (settings.showDateTime) {
    parts.push(`<p class="order-meta">${formatDateTime(order.placedAt, language)}</p>`);
  }
  
  if (settings.showCustomerName && order.customerName) {
    parts.push(`<p class="order-meta">👤 ${order.customerName}</p>`);
  }
  
  if (settings.showCustomerPhone && order.customerPhone) {
    parts.push(`<p class="order-meta">📱 ${order.customerPhone}</p>`);
  }
  
  if (parts.length === 0) return '';
  
  return `<div class="order-info">${parts.join('\n')}</div>`;
}

function buildItemsSection(
  items: ReceiptOrderItem[],
  settings: ReceiptSettings,
  fmt: (n: number) => string
): string {
  const itemsHtml = items.map(item => {
    const parts: string[] = [];
    
    // Main item row
    parts.push(`
      <div class="item-row">
        <span class="item-name">${item.quantity}x ${item.menuName}</span>
        <span>${fmt(item.subtotal)}</span>
      </div>
    `);
    
    // Unit price if enabled
    if (settings.showUnitPrice && item.unitPrice) {
      parts.push(`<div class="item-addon">@ ${fmt(item.unitPrice)} each</div>`);
    }
    
    // Addons
    if (settings.showAddons && item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        parts.push(`<div class="item-addon">+ ${addon.addonName}</div>`);
      });
    }
    
    // Notes
    if (settings.showItemNotes && item.notes) {
      parts.push(`<div class="item-notes">📝 ${item.notes}</div>`);
    }
    
    return `<div class="item">${parts.join('\n')}</div>`;
  }).join('\n');
  
  return `<div class="items">${itemsHtml}</div>`;
}

function buildPaymentSection(
  order: ReceiptOrderData,
  settings: ReceiptSettings,
  labels: ReceiptLabels,
  fmt: (n: number) => string
): string {
  const rows: string[] = [];
  
  if (settings.showSubtotal) {
    rows.push(`<div class="payment-row"><span>${labels.subtotal}</span><span>${fmt(order.subtotal)}</span></div>`);
  }
  
  if (settings.showTax && order.taxAmount && order.taxAmount > 0) {
    rows.push(`<div class="payment-row"><span>${labels.tax}</span><span>${fmt(order.taxAmount)}</span></div>`);
  }
  
  if (settings.showServiceCharge && order.serviceChargeAmount && order.serviceChargeAmount > 0) {
    rows.push(`<div class="payment-row"><span>${labels.serviceCharge}</span><span>${fmt(order.serviceChargeAmount)}</span></div>`);
  }
  
  if (settings.showPackagingFee && order.packagingFeeAmount && order.packagingFeeAmount > 0) {
    rows.push(`<div class="payment-row"><span>${labels.packagingFee}</span><span>${fmt(order.packagingFeeAmount)}</span></div>`);
  }
  
  if (settings.showDiscount && order.discountAmount && order.discountAmount > 0) {
    rows.push(`<div class="payment-row discount"><span>${labels.discount}</span><span>-${fmt(order.discountAmount)}</span></div>`);
  }
  
  if (settings.showTotal) {
    rows.push(`<div class="payment-row total-row"><span>${labels.total}</span><span>${fmt(order.totalAmount)}</span></div>`);
  }
  
  // Payment details for paid orders
  const isPaid = order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PAID';
  
  if (isPaid) {
    if (settings.showPaymentMethod && order.paymentMethod) {
      rows.push(`<div class="payment-row"><span>${labels.paymentMethod}</span><span>${order.paymentMethod}</span></div>`);
    }
    
    if (settings.showAmountPaid && order.amountPaid) {
      rows.push(`<div class="payment-row"><span>${labels.amountPaid}</span><span>${fmt(order.amountPaid)}</span></div>`);
    }
    
    if (settings.showChange && order.changeAmount && order.changeAmount > 0) {
      rows.push(`<div class="payment-row"><span>${labels.change}</span><span>${fmt(order.changeAmount)}</span></div>`);
    }
  }
  
  if (rows.length === 0) return '';
  
  return `<div class="payment-section">${rows.join('\n')}</div>`;
}

function buildFooterSection(
  order: ReceiptOrderData,
  settings: ReceiptSettings,
  labels: ReceiptLabels,
  merchant: ReceiptMerchantInfo
): string {
  const parts: string[] = [];
  
  if (settings.showCashierName && order.cashierName) {
    parts.push(`<p class="cashier">${labels.cashier}: ${order.cashierName}</p>`);
  }
  
  if (settings.showThankYouMessage) {
    const message = settings.customThankYouMessage || labels.thankYou;
    parts.push(`<p class="thank-you">${message}</p>`);
  }
  
  if (settings.showCustomFooterText && settings.customFooterText) {
    parts.push(`<p class="custom-footer">${settings.customFooterText.replace(/\n/g, '<br/>')}</p>`);
  }
  
  if (settings.showFooterPhone && merchant.phone) {
    parts.push(`<p class="merchant-info">📞 ${merchant.phone}</p>`);
  }
  
  // Genfity branding - ALWAYS SHOWN, cannot be disabled
  parts.push(`
    <div class="branding">
      ${labels.poweredBy} <a href="https://genfity.com" target="_blank">genfity.com</a>
    </div>
  `);
  
  return `<div class="footer">${parts.join('\n')}</div>`;
}

// ============================================
// PRINT HELPER
// ============================================

/**
 * Open print window with receipt HTML
 */
export function printReceipt(options: GenerateReceiptOptions): boolean {
  try {
    const html = generateReceiptHTML(options);
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      console.error('Failed to open print window - please allow popups');
      return false;
    }
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 100);
    };
    
    return true;
  } catch (error) {
    console.error('Print receipt error:', error);
    return false;
  }
}
