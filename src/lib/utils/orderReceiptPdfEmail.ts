import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { formatCurrency, formatFullOrderNumber } from '@/lib/utils/format';
import { ReceiptSettings } from '@/lib/types/receiptSettings';
import { getReceiptLabels, mergeReceiptSettingsWithDefaults } from '@/lib/utils/receiptShared';
import { buildOrderTrackingUrl } from '@/lib/utils/orderTrackingLinks.server';

export type OrderReceiptEmailLanguage = 'en' | 'id';

export interface OrderReceiptEmailPdfData {
  orderNumber: string;
  merchantCode: string;
  merchantName: string;
  merchantLogoUrl?: string | null;
  merchantAddress?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  receiptSettings?: Partial<ReceiptSettings> | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string | null;
  deliveryUnit?: string | null;
  deliveryBuildingName?: string | null;
  deliveryBuildingNumber?: string | null;
  deliveryFloor?: string | null;
  deliveryInstructions?: string | null;
  deliveryAddress?: string | null;
  items: Array<{
    menuName: string;
    quantity: number;
    unitPrice?: number;
    subtotal: number;
    notes?: string | null;
    addons?: Array<{
      addonName: string;
      addonPrice?: number;
      quantity?: number;
      subtotal?: number;
    }>;
  }>;
  subtotal: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  packagingFeeAmount?: number;
  deliveryFeeAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: string | null;
  currency: string;
  completedAt: Date;
  locale: OrderReceiptEmailLanguage;
  timeZone: string;
}


function formatDateTime(params: {
  date: Date;
  locale: OrderReceiptEmailLanguage;
  timeZone: string;
}): string {
  const intlLocale = params.locale === 'id' ? 'id-ID' : 'en-AU';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: params.timeZone,
  }).format(params.date);
}

function toPdfBuffer(doc: jsPDF): Buffer {
  // jsPDF supports arraybuffer output in Node.
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(new Uint8Array(arrayBuffer));
}

// Receipt settings and labels are shared with unifiedReceipt.ts via receiptShared.ts

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const isPng = contentType.includes('png') || url.toLowerCase().endsWith('.png');
    const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(url);

    if (isPng) {
      return { dataUrl: `data:image/png;base64,${base64}`, format: 'PNG' };
    }
    if (isJpeg) {
      return { dataUrl: `data:image/jpeg;base64,${base64}`, format: 'JPEG' };
    }

    // Default to PNG data URL; jsPDF is usually fine with it.
    return { dataUrl: `data:image/png;base64,${base64}`, format: 'PNG' };
  } catch {
    return null;
  }
}

export async function generateOrderReceiptPdfBuffer(data: OrderReceiptEmailPdfData): Promise<Buffer> {
  const { settings } = mergeReceiptSettingsWithDefaults({
    rawSettings: data.receiptSettings,
    currency: data.currency,
    preferredLanguage: data.locale,
  });
  const labels = getReceiptLabels(settings.receiptLanguage);

  const pageWidth = settings.paperSize === '58mm' ? 58 : 80;
  const pageHeight = settings.paperSize === '58mm' ? 420 : 520;
  const margin = settings.paperSize === '58mm' ? 3 : 4;

  // Match the merchant receipt style: compact receipt paper.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageWidth, pageHeight] });
  const contentWidth = pageWidth - 2 * margin;
  let y = settings.paperSize === '58mm' ? 7 : 8;

  const centerText = (text: string, yPos: number, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  const addDashedLine = (yPos: number) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
  };

  const addLeftRight = (left: string, right: string, yPos: number, fontSize = 8, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.text(left, margin, yPos);
    const rightWidth = doc.getTextWidth(right);
    doc.text(right, pageWidth - margin - rightWidth, yPos);
  };

  const fullOrderNumber = formatFullOrderNumber(data.orderNumber, data.merchantCode);

  // HEADER
  if (settings.showLogo && data.merchantLogoUrl) {
    const baseUrl = getPublicAppOrigin('https://order.genfity.com');
    const logoUrl = data.merchantLogoUrl.startsWith('http') ? data.merchantLogoUrl : `${baseUrl}${data.merchantLogoUrl}`;
    const img = await loadImageAsDataUrl(logoUrl);
    if (img) {
      const logoSize = settings.paperSize === '58mm' ? 16 : 18;
      const x = (pageWidth - logoSize) / 2;
      doc.addImage(img.dataUrl, img.format, x, y - 2, logoSize, logoSize);
      y += logoSize + 2;
    }
  }

  centerText(labels.title, y, settings.paperSize === '58mm' ? 10 : 12, true);
  y += settings.paperSize === '58mm' ? 5 : 6;

  if (settings.showMerchantName) {
    centerText(data.merchantName, y, settings.paperSize === '58mm' ? 10 : 11, true);
    y += 5;
  }

  if (settings.showAddress && data.merchantAddress) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(data.merchantAddress, contentWidth);
    for (const line of lines) {
      centerText(String(line), y, 7, false);
      y += 3.2;
    }
    y += 1;
  }

  if (settings.showPhone && data.merchantPhone) {
    centerText(data.merchantPhone, y, 7, false);
    y += 3.5;
  }

  if (settings.showEmail && data.merchantEmail) {
    centerText(data.merchantEmail, y, 7, false);
    y += 3.5;
  }

  addDashedLine(y);
  y += 5;

  // ORDER INFO
  if (settings.showOrderNumber) {
    addLeftRight(labels.orderNumber, fullOrderNumber, y, 8, true);
    y += 4;
  }
  if (settings.showDateTime) {
    addLeftRight(
      labels.date,
      formatDateTime({ date: data.completedAt, locale: settings.receiptLanguage, timeZone: data.timeZone }),
      y,
      8
    );
    y += 4;
  }

  if (settings.showOrderType) {
    const typeLabel =
      data.orderType === 'DINE_IN'
        ? labels.dineIn
        : data.orderType === 'TAKEAWAY'
          ? labels.takeaway
          : labels.delivery;
    const typeRight = settings.showTableNumber && data.tableNumber
      ? `${typeLabel} / ${labels.table} ${data.tableNumber}`
      : typeLabel;
    addLeftRight(labels.type, typeRight, y, 8);
    y += 5;
  }

  if (data.orderType === 'DELIVERY') {
    const prefix = [
      data.deliveryUnit,
      data.deliveryBuildingName,
      data.deliveryBuildingNumber ? `No ${data.deliveryBuildingNumber}` : null,
      data.deliveryFloor ? `Floor ${data.deliveryFloor}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const address = String(data.deliveryAddress || '').trim();
    const fullAddress = prefix && address ? `${prefix}, ${address}` : (prefix || address);
    if (fullAddress) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(`📍 ${fullAddress}`, contentWidth);
      for (const line of lines) {
        doc.text(String(line), margin, y);
        y += 3.2;
      }
      y += 1;
    }

    const instructions = String(data.deliveryInstructions || '').trim();
    if (instructions) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(`📝 ${instructions}`, contentWidth);
      for (const line of lines) {
        doc.text(String(line), margin, y);
        y += 3.2;
      }
      y += 1;
    }
  }

  if (settings.showCustomerName) {
    const safeName = data.customerName || (settings.receiptLanguage === 'id' ? 'Pelanggan' : 'Customer');
    addLeftRight(labels.customer, safeName, y, 8);
    y += 4;
  }

  if (settings.showCustomerPhone && data.customerPhone) {
    addLeftRight(labels.phone, data.customerPhone, y, 8);
    y += 4;
  }

  addDashedLine(y);
  y += 5;

  // ITEMS
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(labels.items, margin, y);
  y += 5;

  for (const item of data.items) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);

    const left = `${item.quantity} × ${item.menuName}`;
    const right = formatCurrency(item.subtotal, data.currency, settings.receiptLanguage);

    const maxLeftWidth = contentWidth - 22;
    const lines = doc.splitTextToSize(left, maxLeftWidth);
    for (let i = 0; i < lines.length; i++) {
      if (i === 0) {
        addLeftRight(String(lines[i]), right, y, 8);
      } else {
        doc.text(String(lines[i]), margin, y);
      }
      y += 4;
    }

    if (settings.showUnitPrice && typeof item.unitPrice === 'number') {
      addLeftRight(
          labels.each,
        formatCurrency(item.unitPrice, data.currency, settings.receiptLanguage),
        y,
        7
      );
      y += 3.5;
    }

    if (settings.showAddons && item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        const qty = addon.quantity && addon.quantity > 1 ? `${addon.quantity}× ` : '';
        const addonLeft = `+ ${qty}${addon.addonName}`;
        const addonRight = settings.showAddonPrices && typeof addon.subtotal === 'number'
          ? formatCurrency(addon.subtotal, data.currency, settings.receiptLanguage)
          : '';
        if (addonRight) {
          addLeftRight(addonLeft, addonRight, y, 7);
        } else {
          doc.setFontSize(7);
          doc.text(addonLeft, margin, y);
        }
        y += 3.5;
      }
    }

    if (settings.showItemNotes && item.notes) {
      doc.setFontSize(7);
      const noteLines = doc.splitTextToSize(`* ${item.notes}`, contentWidth);
      for (const line of noteLines) {
        doc.text(String(line), margin, y);
        y += 3.2;
      }
    }
  }

  y += 2;
  addDashedLine(y);
  y += 6;

  // PAYMENT
  const fmt = (amount: number) => formatCurrency(amount, data.currency, settings.receiptLanguage);

  if (settings.showSubtotal) {
    addLeftRight(labels.subtotal, fmt(data.subtotal), y, 8);
    y += 4;
  }
  if (settings.showTax && (data.taxAmount || 0) > 0) {
    addLeftRight(labels.tax, fmt(data.taxAmount || 0), y, 8);
    y += 4;
  }
  if (settings.showServiceCharge && (data.serviceChargeAmount || 0) > 0) {
    addLeftRight(labels.serviceCharge, fmt(data.serviceChargeAmount || 0), y, 8);
    y += 4;
  }
  if (settings.showPackagingFee && (data.packagingFeeAmount || 0) > 0) {
    addLeftRight(labels.packagingFee, fmt(data.packagingFeeAmount || 0), y, 8);
    y += 4;
  }
  if (settings.showDeliveryFee && (data.deliveryFeeAmount || 0) > 0) {
    addLeftRight(labels.deliveryFee, fmt(data.deliveryFeeAmount || 0), y, 8);
    y += 4;
  }
  if (settings.showDiscount && (data.discountAmount || 0) > 0) {
    addLeftRight(labels.discount, `-${fmt(data.discountAmount || 0)}`, y, 8);
    y += 4;
  }

  y += 1;
  addDashedLine(y);
  y += 6;

  if (settings.showTotal) {
    addLeftRight(labels.total, fmt(data.totalAmount), y, 10, true);
    y += 7;
  }

  if (settings.showPaymentMethod && data.paymentMethod) {
    addLeftRight(labels.paymentMethod, data.paymentMethod, y, 8);
    y += 5;
  }

  // FOOTER + QR
  const trackingUrl = buildOrderTrackingUrl({
    merchantCode: data.merchantCode,
    orderNumber: data.orderNumber,
    baseUrlFallback: 'https://order.genfity.com',
  });

  if (settings.showTrackingQRCode) {
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
    });

    const qrSize = settings.paperSize === '58mm' ? 22 : 26;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 4;

    centerText(labels.scanToTrack, y, 8, false);
    y += 5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const urlLines = doc.splitTextToSize(trackingUrl, contentWidth);
    for (const line of urlLines) {
      centerText(String(line), y, 7, false);
      y += 3.5;
    }

    y += 2;
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  centerText(`${labels.poweredBy} genfity.com`, y, 7, false);

  return toPdfBuffer(doc);
}
