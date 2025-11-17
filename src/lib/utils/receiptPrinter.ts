/**
 * Payment Receipt Utility
 * 
 * Generate and print payment receipts
 * Supports both browser print and thermal printer format
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

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

/**
 * Generate HTML receipt content
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const { order, payment, merchant } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${order.orderNumber}</title>
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
    ${merchant.phone ? `<p>Phone: ${merchant.phone}</p>` : ''}
  </div>

  <!-- Order Info -->
  <div class="section">
    <div class="row">
      <span class="label">Order #:</span>
      <span>${order.orderNumber}</span>
    </div>
    <div class="row">
      <span class="label">Order Type:</span>
      <span>${order.orderType}</span>
    </div>
    ${
      order.tableNumber
        ? `<div class="row">
      <span class="label">Table:</span>
      <span>${order.tableNumber}</span>
    </div>`
        : ''
    }
    <div class="row">
      <span class="label">Date:</span>
      <span>${formatDateTime(order.placedAt)}</span>
    </div>
  </div>

  <!-- Items -->
  <div class="section">
    <div class="items">
      ${
        order.orderItems
          ?.map(
            (item) => `
        <div class="item">
          <div class="row">
            <span class="item-name">${item.quantity}x ${item.menuName}</span>
            <span>${formatCurrency(Number(item.subtotal), merchant.currency)}</span>
          </div>
          ${
            item.addons && item.addons.length > 0
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
      <span>Subtotal:</span>
      <span>${formatCurrency(Number(order.subtotal), merchant.currency)}</span>
    </div>
    <div class="row">
      <span>Tax:</span>
      <span>${formatCurrency(Number(order.taxAmount), merchant.currency)}</span>
    </div>
    <div class="row total">
      <span>TOTAL:</span>
      <span>${formatCurrency(Number(order.totalAmount), merchant.currency)}</span>
    </div>
  </div>

  <!-- Payment Info -->
  <div class="section">
    <div class="row">
      <span class="label">Payment Method:</span>
      <span>${payment.method.replace('_', ' ')}</span>
    </div>
    <div class="row">
      <span class="label">Amount Paid:</span>
      <span>${formatCurrency(payment.amount, merchant.currency)}</span>
    </div>
    ${
      payment.amount > Number(order.totalAmount)
        ? `<div class="row">
      <span class="label">Change:</span>
      <span>${formatCurrency(payment.amount - Number(order.totalAmount), merchant.currency)}</span>
    </div>`
        : ''
    }
    <div class="row">
      <span class="label">Paid At:</span>
      <span>${formatDateTime(payment.paidAt)}</span>
    </div>
    ${
      payment.paidByName
        ? `<div class="row">
      <span class="label">Served By:</span>
      <span>${payment.paidByName}</span>
    </div>`
        : ''
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for your order!</p>
    <p>Please come again</p>
  </div>
</body>
</html>
  `;
}

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
    commands.push(...stringToBytes(`Phone: ${data.merchant.phone}\n`));
  }

  // Line separator
  commands.push(...stringToBytes('--------------------------------\n'));

  // Left alignment for details
  commands.push(ESC, 0x61, 0x00);

  // Order details
  commands.push(...stringToBytes(`Order #: ${data.order.orderNumber}\n`));
  commands.push(...stringToBytes(`Date: ${formatDateTime(data.order.placedAt)}\n`));

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
