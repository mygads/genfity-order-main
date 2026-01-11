/**
 * Payment Receipt Utility
 * 
 * Generate and print payment receipts
 * Supports both browser print and thermal printer format
 * 
 * Multi-language support:
 * - IDR currency → Indonesian labels
 * - AUD currency → English labels
 */

import type { OrderWithDetails } from '@/lib/types/order';

export interface ReceiptData {
  order: OrderWithDetails;
  payment: {
    method: string;
    amount: number;
    paidAt: Date;
    paidByName?: string;
  };
  merchant: {
    name: string;
    address?: string;
    phone?: string;
    currency: string;
  };
}

// ============================================================================
// RECEIPT LABELS - Multi-Language
// ============================================================================

interface ReceiptLabels {
  orderNumber: string;
  orderType: string;
  table: string;
  date: string;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  packagingFee: string;
  total: string;
  paymentMethod: string;
  amountPaid: string;
  change: string;
  paidAt: string;
  servedBy: string;
  thankYou: string;
  comeAgain: string;
  phone: string;
  // Order types
  orderTypeDineIn: string;
  orderTypeTakeaway: string;
  // Payment methods
  paymentCash: string;
  paymentCard: string;
  paymentQris: string;
  paymentTransfer: string;
}

const labelsEN: ReceiptLabels = {
  orderNumber: 'Order #',
  orderType: 'Order Type',
  table: 'Table',
  date: 'Date',
  subtotal: 'Subtotal',
  tax: 'Tax',
  serviceCharge: 'Service Charge',
  packagingFee: 'Packaging Fee',
  total: 'TOTAL',
  paymentMethod: 'Payment Method',
  amountPaid: 'Amount Paid',
  change: 'Change',
  paidAt: 'Paid At',
  servedBy: 'Served By',
  thankYou: 'Thank you for your order!',
  comeAgain: 'Please come again',
  phone: 'Phone',
  orderTypeDineIn: 'Dine In',
  orderTypeTakeaway: 'Takeaway',
  paymentCash: 'Cash',
  paymentCard: 'Card',
};

const labelsID: ReceiptLabels = {
  orderNumber: 'Pesanan #',
  orderType: 'Tipe Pesanan',
  table: 'Meja',
  date: 'Tanggal',
  subtotal: 'Subtotal',
  tax: 'Pajak',
  serviceCharge: 'Biaya Layanan',
  packagingFee: 'Biaya Kemasan',
  total: 'TOTAL',
  paymentMethod: 'Metode Pembayaran',
  amountPaid: 'Jumlah Dibayar',
  change: 'Kembalian',
  paidAt: 'Dibayar Pada',
  servedBy: 'Dilayani Oleh',
  thankYou: 'Terima kasih atas pesanan Anda!',
  comeAgain: 'Silakan datang kembali',
  phone: 'Telepon',
  orderTypeDineIn: 'Makan di Tempat',
  orderTypeTakeaway: 'Bawa Pulang',
  paymentCash: 'Tunai',
  paymentCard: 'Kartu',
};

/**
 * Get receipt labels based on currency
 * IDR → Indonesian, AUD → English
 */
function getLabels(currency: string): ReceiptLabels {
  return currency === 'IDR' ? labelsID : labelsEN;
}

/**
 * Format order type with locale
 */
function formatOrderType(orderType: string, labels: ReceiptLabels): string {
  const typeMap: Record<string, string> = {
    'DINE_IN': labels.orderTypeDineIn,
    'TAKEAWAY': labels.orderTypeTakeaway,
  };
  return typeMap[orderType] || orderType;
}

/**
 * Format payment method with locale
 */
function formatPaymentMethod(method: string, labels: ReceiptLabels): string {
  const methodMap: Record<string, string> = {
    'CASH': labels.paymentCash,
    'CARD': labels.paymentCard,
  };
  return methodMap[method] || method.replace('_', ' ');
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency for display
 * - IDR: Rp 10.000 (no decimals)
 * - AUD: A$10.00 (2 decimals)
 */
function formatCurrency(amount: number, currency: string): string {
  // Special handling for AUD to show A$ prefix
  if (currency === 'AUD') {
    return `A$${amount.toFixed(2)}`;
  }
  
  // Special handling for IDR - no decimals
  if (currency === 'IDR') {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
    return `Rp ${formatted}`;
  }

  // Fallback for other currencies
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date for display based on currency/locale
 * IDR → Indonesian format, AUD → Australian format
 */
function formatDateTime(date: Date, currency: string): string {
  const locale = currency === 'IDR' ? 'id-ID' : 'en-AU';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

// ============================================================================
// RECEIPT HTML GENERATION
// ============================================================================

/**
 * Generate HTML receipt content with multi-language support
 * Language is determined by merchant currency:
 * - IDR → Indonesian
 * - AUD → English
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const { order, payment, merchant } = data;
  const labels = getLabels(merchant.currency);

  return `
<!DOCTYPE html>
<html lang="${merchant.currency === 'IDR' ? 'id' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${labels.orderNumber}${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 20px;
      max-width: 300px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header p {
      font-size: 10px;
      margin: 2px 0;
    }
    
    .section {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px dashed #ccc;
    }
    
    .section:last-child {
      border-bottom: 2px dashed #000;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }
    
    .label {
      font-weight: bold;
    }
    
    .items {
      margin: 5px 0;
    }
    
    .item {
      margin: 5px 0;
    }
    
    .item-name {
      font-weight: bold;
    }
    
    .item-addon {
      margin-left: 15px;
      font-size: 10px;
    }
    
    .total {
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
    }
    
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 10px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      @page {
        margin: 0;
        size: 80mm auto;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>${merchant.name}</h1>
    ${merchant.address ? `<p>${merchant.address}</p>` : ''}
    ${merchant.phone ? `<p>${labels.phone}: ${merchant.phone}</p>` : ''}
  </div>

  <!-- Order Info -->
  <div class="section">
    <div class="row">
      <span class="label">${labels.orderNumber}:</span>
      <span>${order.orderNumber}</span>
    </div>
    <div class="row">
      <span class="label">${labels.orderType}:</span>
      <span>${formatOrderType(order.orderType, labels)}</span>
    </div>
    ${order.tableNumber
      ? `<div class="row">
      <span class="label">${labels.table}:</span>
      <span>${order.tableNumber}</span>
    </div>`
      : ''
    }
    <div class="row">
      <span class="label">${labels.date}:</span>
      <span>${formatDateTime(order.placedAt, merchant.currency)}</span>
    </div>
  </div>

  <!-- Items -->
  <div class="section">
    <div class="items">
      ${order.orderItems
      ?.map(
        (item) => `
        <div class="item">
          <div class="row">
            <span class="item-name">${item.quantity}x ${item.menuName}</span>
            <span>${formatCurrency(Number(item.subtotal), merchant.currency)}</span>
          </div>
          ${item.addons && item.addons.length > 0
            ? item.addons
              .map(
                (addon) => `
            <div class="item-addon">
              + ${addon.addonName} ${addon.quantity > 1 ? `(${addon.quantity}x)` : ''}
              ${formatCurrency(Number(addon.addonPrice) * addon.quantity, merchant.currency)}
            </div>
          `
              )
              .join('')
            : ''
          }
        </div>
      `
      )
      .join('') || ''
    }
    </div>
  </div>

  <!-- Totals -->
  <div class="section">
    <div class="row">
      <span>${labels.subtotal}:</span>
      <span>${formatCurrency(Number(order.subtotal), merchant.currency)}</span>
    </div>
    ${Number((order as unknown as { taxAmount?: number }).taxAmount) > 0 ? `<div class="row">
      <span>${labels.tax}:</span>
      <span>${formatCurrency(Number((order as unknown as { taxAmount?: number }).taxAmount), merchant.currency)}</span>
    </div>` : ''}
    ${Number((order as unknown as { serviceChargeAmount?: number }).serviceChargeAmount) > 0 ? `<div class="row">
      <span>${labels.serviceCharge}:</span>
      <span>${formatCurrency(Number((order as unknown as { serviceChargeAmount?: number }).serviceChargeAmount), merchant.currency)}</span>
    </div>` : ''}
    ${Number((order as unknown as { packagingFeeAmount?: number }).packagingFeeAmount) > 0 ? `<div class="row">
      <span>${labels.packagingFee}:</span>
      <span>${formatCurrency(Number((order as unknown as { packagingFeeAmount?: number }).packagingFeeAmount), merchant.currency)}</span>
    </div>` : ''}
    <div class="row total">
      <span>${labels.total}:</span>
      <span>${formatCurrency(Number(order.totalAmount), merchant.currency)}</span>
    </div>
  </div>

  <!-- Payment Info -->
  <div class="section">
    <div class="row">
      <span class="label">${labels.paymentMethod}:</span>
      <span>${formatPaymentMethod(payment.method, labels)}</span>
    </div>
    <div class="row">
      <span class="label">${labels.amountPaid}:</span>
      <span>${formatCurrency(payment.amount, merchant.currency)}</span>
    </div>
    ${payment.amount > Number(order.totalAmount)
      ? `<div class="row">
      <span class="label">${labels.change}:</span>
      <span>${formatCurrency(payment.amount - Number(order.totalAmount), merchant.currency)}</span>
    </div>`
      : ''
    }
    <div class="row">
      <span class="label">${labels.paidAt}:</span>
      <span>${formatDateTime(payment.paidAt, merchant.currency)}</span>
    </div>
    ${payment.paidByName
      ? `<div class="row">
      <span class="label">${labels.servedBy}:</span>
      <span>${payment.paidByName}</span>
    </div>`
      : ''
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>${labels.thankYou}</p>
    <p>${labels.comeAgain}</p>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// PRINT FUNCTIONS
// ============================================================================

/**
 * Print receipt in browser
 */
export function printReceipt(data: ReceiptData): void {
  const receiptHTML = generateReceiptHTML(data);

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  printWindow.document.write(receiptHTML);
  printWindow.document.close();

  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.print();
    // Close window after printing (optional)
    setTimeout(() => {
      printWindow.close();
    }, 100);
  };
}

/**
 * Generate thermal printer format (ESC/POS commands)
 * For future integration with thermal printers like Epson TM-T88, Star Micronics
 */
export function generateThermalPrinterData(data: ReceiptData): Uint8Array {
  const labels = getLabels(data.merchant.currency);
  
  // ESC/POS commands
  const ESC = 0x1b;
  const GS = 0x1d;

  const commands: number[] = [];

  // Initialize printer
  commands.push(ESC, 0x40);

  // Center alignment
  commands.push(ESC, 0x61, 0x01);

  // Large font for merchant name
  commands.push(ESC, 0x21, 0x30);
  commands.push(...stringToBytes(`${data.merchant.name}\n`));

  // Normal font
  commands.push(ESC, 0x21, 0x00);
  if (data.merchant.address) {
    commands.push(...stringToBytes(`${data.merchant.address}\n`));
  }
  if (data.merchant.phone) {
    commands.push(...stringToBytes(`${labels.phone}: ${data.merchant.phone}\n`));
  }

  // Line separator
  commands.push(...stringToBytes('--------------------------------\n'));

  // Left alignment for details
  commands.push(ESC, 0x61, 0x00);

  // Order details
  commands.push(...stringToBytes(`${labels.orderNumber}: ${data.order.orderNumber}\n`));
  commands.push(...stringToBytes(`${labels.date}: ${formatDateTime(data.order.placedAt, data.merchant.currency)}\n`));

  // Items (implement remaining ESC/POS commands as needed)
  // ... (truncated for brevity, full implementation would include all items, totals, etc.)

  // Cut paper
  commands.push(GS, 0x56, 0x00);

  return new Uint8Array(commands);
}

/**
 * Convert string to byte array (for thermal printer)
 */
function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

/**
 * Download receipt as PDF (future enhancement)
 */
export async function downloadReceiptPDF(data: ReceiptData): Promise<void> {
  // Future implementation using jsPDF or similar library
  console.log('PDF download not yet implemented', data);
  alert('PDF download feature coming soon!');
}
