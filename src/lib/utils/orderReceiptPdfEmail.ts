import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { resolveAssetUrl } from '@/lib/utils/assetUrl';
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
  paymentStatus?: string | null;
  amountPaid?: number;
  changeAmount?: number;
  cashierName?: string | null;
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

function normalizeInlineText(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const lowerUrl = url.toLowerCase();

    const res = await fetch(url, {
      // Prevent long hangs when logo host is slow/unreachable.
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? (AbortSignal as any).timeout(4000) : undefined,
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    const isPng = contentType.includes('png') || lowerUrl.endsWith('.png');
    const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(lowerUrl);

    if (isPng) {
      const base64 = input.toString('base64');
      return { dataUrl: `data:image/png;base64,${base64}`, format: 'PNG' };
    }
    if (isJpeg) {
      const base64 = input.toString('base64');
      return { dataUrl: `data:image/jpeg;base64,${base64}`, format: 'JPEG' };
    }

    // Convert formats jsPDF can't handle directly (e.g., WebP/SVG) into PNG.
    // sharp supports SVG/WebP decoding in Node.
    const isSvg = contentType.includes('svg');
    const png = await sharp(input, isSvg ? { density: 300 } : undefined).png().toBuffer();
    const base64 = png.toString('base64');
    return { dataUrl: `data:image/png;base64,${base64}`, format: 'PNG' };
  } catch {
    return null;
  }
}

type ImageDataUrl = { dataUrl: string; format: 'PNG' | 'JPEG' } | null;
type CachedImageEntry = {
  promise: Promise<ImageDataUrl>;
  expiresAt: number;
};

const LOGO_CACHE_MAX_ENTRIES = 50;
const LOGO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const logoDataUrlCache = new Map<string, CachedImageEntry>();

async function loadImageAsDataUrlCached(url: string): Promise<ImageDataUrl> {
  const now = Date.now();
  const existing = logoDataUrlCache.get(url);
  if (existing && existing.expiresAt > now) {
    // Simple LRU: refresh key order on access.
    logoDataUrlCache.delete(url);
    logoDataUrlCache.set(url, existing);
    return existing.promise;
  }

  const entry: CachedImageEntry = {
    promise: loadImageAsDataUrl(url),
    expiresAt: now + LOGO_CACHE_TTL_MS,
  };
  logoDataUrlCache.set(url, entry);

  while (logoDataUrlCache.size > LOGO_CACHE_MAX_ENTRIES) {
    const oldestKey = logoDataUrlCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    logoDataUrlCache.delete(oldestKey);
  }

  try {
    return await entry.promise;
  } catch {
    // If something unexpected happens, don't poison the cache.
    logoDataUrlCache.delete(url);
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

  const spacing = {
    line: settings.paperSize === '58mm' ? 3.1 : 3.4,
    row: settings.paperSize === '58mm' ? 3.6 : 4,
    section: settings.paperSize === '58mm' ? 4 : 5,
  };

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

  const centerParagraph = (text: string, fontSize: number, bold: boolean, lineStep = spacing.row) => {
    const normalized = normalizeInlineText(text);
    if (!normalized) return;
    doc.setFontSize(fontSize);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(normalized, contentWidth);
    for (const line of lines) {
      centerText(String(line), y, fontSize, bold);
      y += lineStep;
    }
  };

  const addLine = (yPos: number, opts: { color: [number, number, number]; width: number; dash?: number[] }) => {
    doc.setDrawColor(opts.color[0], opts.color[1], opts.color[2]);
    doc.setLineWidth(opts.width);
    doc.setLineDashPattern(opts.dash || [], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.2);
  };

  // Divider styles aligned with unifiedReceipt.ts CSS
  const addDividerHeader = (yPos: number) => addLine(yPos, { color: [0, 0, 0], width: 0.5, dash: [1.6, 1.1] }); // 2px dashed #000
  const addDividerSection = (yPos: number) => addLine(yPos, { color: [153, 153, 153], width: 0.2, dash: [1, 1] }); // 1px dashed #999
  const addDividerTotal = (yPos: number) => addLine(yPos, { color: [0, 0, 0], width: 0.2 }); // 1px solid #000
  const addDividerBranding = (yPos: number) => addLine(yPos, { color: [221, 221, 221], width: 0.2 }); // 1px solid #ddd

  const addLeftRight = (left: string, right: string, yPos: number, fontSize = 8, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.text(left, margin, yPos);
    const rightWidth = doc.getTextWidth(right);
    doc.text(right, pageWidth - margin - rightWidth, yPos);
  };

  const fullOrderNumber = formatFullOrderNumber(data.orderNumber, data.merchantCode);

  const formatPaymentMethod = (): string | null => {
    const language = settings.receiptLanguage;
    const tr = (en: string, id: string) => (language === 'id' ? id : en);
    const type = String(data.orderType || '').toUpperCase();
    const method = String(data.paymentMethod || '').toUpperCase();
    const status = String(data.paymentStatus || '').toUpperCase();
    const paid = !data.paymentStatus || status === 'COMPLETED' || status === 'PAID';

    const normalizeFallback = (raw: string) => raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    if (!method) {
      // For dine-in/takeaway we still want a friendly label when unpaid.
      return !paid && (type === 'DINE_IN' || type === 'TAKEAWAY') ? tr('Pay at cashier', 'Bayar di kasir') : null;
    }

    if (method === 'CASH') return tr('Cash', 'Tunai');
    if (method === 'CARD') return tr('Card', 'Kartu');

    if (type === 'DELIVERY') {
      if (method === 'CASH_ON_DELIVERY') return tr('Cash on delivery', 'Tunai saat antar');
      if (method === 'CARD_ON_DELIVERY') return tr('Card on delivery', 'Kartu saat antar');
      return normalizeFallback(method);
    }

    // DINE_IN / TAKEAWAY
    if (!paid) return tr('Pay at cashier', 'Bayar di kasir');
    if (method === 'CASH_ON_COUNTER') return tr('Cash at cashier', 'Tunai di kasir');
    if (method === 'CARD_ON_COUNTER') return tr('Card at cashier', 'Kartu di kasir');
    return normalizeFallback(method);
  };

  // HEADER
  if (settings.showLogo && data.merchantLogoUrl) {
    const logoUrl = resolveAssetUrl(data.merchantLogoUrl, {
      fallbackOrigin: getPublicAppOrigin('https://order.genfity.com'),
    });
    const img = logoUrl ? await loadImageAsDataUrlCached(logoUrl) : null;
    if (img) {
      const logoSize = settings.paperSize === '58mm' ? 16 : 18;
      const x = (pageWidth - logoSize) / 2;
      doc.addImage(img.dataUrl, img.format, x, y - 2, logoSize, logoSize);
      y += logoSize + 2;
    }
  }

  if (settings.showMerchantName) {
    centerText(data.merchantName, y, settings.paperSize === '58mm' ? 10 : 11, true);
    y += spacing.section;
  }

  if (settings.showAddress && data.merchantAddress) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(normalizeInlineText(data.merchantAddress), contentWidth);
    for (const line of lines) {
      centerText(String(line), y, 7, false);
      y += spacing.line;
    }
    y += 1;
  }

  if (settings.showPhone && data.merchantPhone) {
    centerText(normalizeInlineText(data.merchantPhone), y, 7, false);
    y += spacing.line;
  }

  if (settings.showEmail && data.merchantEmail) {
    centerText(normalizeInlineText(data.merchantEmail), y, 7, false);
    y += spacing.line;
  }

  addDividerHeader(y);
  y += spacing.section;

  // ORDER INFO (match admin style: centered block)
  if (settings.showOrderNumber) {
    centerParagraph(
      `${labels.orderNumber}${fullOrderNumber}`,
      settings.paperSize === '58mm' ? 10 : 12,
      true,
      spacing.section
    );
  }

  const typeLine = (() => {
    const typeLabel =
      data.orderType === 'DINE_IN'
        ? labels.dineIn
        : data.orderType === 'TAKEAWAY'
          ? labels.takeaway
          : labels.delivery;

    if (settings.showTableNumber && data.tableNumber) {
      return `${typeLabel} - ${labels.table} ${normalizeInlineText(String(data.tableNumber))}`;
    }
    return typeLabel;
  })();

  if (settings.showOrderType) {
    centerParagraph(typeLine, 8, false);
  }

  if (settings.showDateTime) {
    centerParagraph(formatDateTime({ date: data.completedAt, locale: settings.receiptLanguage, timeZone: data.timeZone }), 8, false);
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

    const address = normalizeInlineText(String(data.deliveryAddress || ''));
    const fullAddress = prefix && address ? `${prefix}, ${address}` : (prefix || address);
    if (fullAddress) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(`📍 ${fullAddress}`, contentWidth);
      for (const line of lines) {
        doc.text(String(line), margin, y);
        y += spacing.line;
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
        y += spacing.line;
      }
      y += 1;
    }
  }

  if (settings.showCustomerName) {
    const safeName = normalizeInlineText(data.customerName || (settings.receiptLanguage === 'id' ? 'Pelanggan' : 'Customer'));
    centerParagraph(safeName, 8, false);
  }

  if (settings.showCustomerPhone && data.customerPhone) {
    centerParagraph(normalizeInlineText(data.customerPhone), 8, false);
  }

  y += 1;
  addDividerSection(y);
  y += spacing.section;

  // ITEMS
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(labels.items, margin, y);
  y += spacing.section;

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
      y += spacing.row;
    }

    if (settings.showUnitPrice && typeof item.unitPrice === 'number') {
      addLeftRight(
        labels.each,
        formatCurrency(item.unitPrice, data.currency, settings.receiptLanguage),
        y,
        7
      );
      y += spacing.line;
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
        y += spacing.line;
      }
    }

    if (settings.showItemNotes && item.notes) {
      doc.setFontSize(7);
      const noteLines = doc.splitTextToSize(`* ${item.notes}`, contentWidth);
      for (const line of noteLines) {
        doc.text(String(line), margin, y);
        y += spacing.line;
      }
    }
  }

  y += 2;
  addDividerSection(y);
  y += spacing.section + 1;

  // PAYMENT
  const fmt = (amount: number) => formatCurrency(amount, data.currency, settings.receiptLanguage);
  const isPaid =
    data.paymentStatus === undefined || data.paymentStatus === null
      ? true
      : data.paymentStatus === 'COMPLETED' || data.paymentStatus === 'PAID';

  if (settings.showSubtotal) {
    addLeftRight(labels.subtotal, fmt(data.subtotal), y, 8);
    y += spacing.row;
  }
  if (settings.showTax && (data.taxAmount || 0) > 0) {
    addLeftRight(labels.tax, fmt(data.taxAmount || 0), y, 8);
    y += spacing.row;
  }
  if (settings.showServiceCharge && (data.serviceChargeAmount || 0) > 0) {
    addLeftRight(labels.serviceCharge, fmt(data.serviceChargeAmount || 0), y, 8);
    y += spacing.row;
  }
  if (settings.showPackagingFee && (data.packagingFeeAmount || 0) > 0) {
    addLeftRight(labels.packagingFee, fmt(data.packagingFeeAmount || 0), y, 8);
    y += spacing.row;
  }
  if (settings.showDeliveryFee && (data.deliveryFeeAmount || 0) > 0) {
    addLeftRight(labels.deliveryFee, fmt(data.deliveryFeeAmount || 0), y, 8);
    y += spacing.row;
  }
  if (settings.showDiscount && (data.discountAmount || 0) > 0) {
    addLeftRight(labels.discount, `-${fmt(data.discountAmount || 0)}`, y, 8);
    y += spacing.row;
  }

  y += 1;
  addDividerTotal(y);
  y += spacing.section + 1;

  if (settings.showTotal) {
    addLeftRight(labels.total, fmt(data.totalAmount), y, 10, true);
    y += spacing.section + 2;
  }

  if (settings.showPaymentMethod) {
    const methodLabel = formatPaymentMethod();
    if (methodLabel) {
      addLeftRight(labels.paymentMethod, methodLabel, y, 8);
      y += spacing.section;
    }
  }

  if (isPaid && settings.showAmountPaid && typeof data.amountPaid === 'number' && Number.isFinite(data.amountPaid)) {
    addLeftRight(labels.amountPaid, fmt(data.amountPaid), y, 8);
    y += spacing.section;
  }

  if (
    isPaid &&
    settings.showChange &&
    typeof data.changeAmount === 'number' &&
    Number.isFinite(data.changeAmount) &&
    data.changeAmount > 0
  ) {
    addLeftRight(labels.change, fmt(data.changeAmount), y, 8);
    y += spacing.section;
  }

  // FOOTER + QR
  const trackingUrl = buildOrderTrackingUrl({
    merchantCode: data.merchantCode,
    orderNumber: data.orderNumber,
    baseUrlFallback: 'https://order.genfity.com',
  });

  const hasFooterContent =
    (settings.showCashierName && !!data.cashierName) ||
    settings.showThankYouMessage ||
    (settings.showCustomFooterText && !!settings.customFooterText) ||
    (settings.showFooterPhone && !!data.merchantPhone) ||
    settings.showTrackingQRCode;

  if (hasFooterContent) {
    y += 1;
    addDividerHeader(y);
    y += spacing.section;
  }

  if (settings.showCashierName && data.cashierName) {
    y += 1;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(`${labels.cashier}: ${normalizeInlineText(data.cashierName)}`, contentWidth);
    for (const line of lines) {
      centerText(String(line), y, 7, false);
      y += spacing.line;
    }
    y += 1;
  }

  if (settings.showThankYouMessage) {
    const message = settings.customThankYouMessage || labels.thankYou;
    if (message) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(String(message), contentWidth);
      for (const line of lines) {
        centerText(String(line), y, 8, true);
        y += spacing.line + 0.4;
      }
      doc.setFont('courier', 'normal');
      y += 2;
    }
  }

  if (settings.showCustomFooterText && settings.customFooterText) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const paragraphs = String(settings.customFooterText)
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const paragraph of paragraphs) {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        centerText(String(line), y, 7, false);
        y += spacing.line;
      }
      y += 1;
    }
    y += 1;
  }

  if (settings.showFooterPhone && data.merchantPhone) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(normalizeInlineText(data.merchantPhone), contentWidth);
    for (const line of lines) {
      centerText(String(line), y, 7, false);
      y += spacing.line;
    }
    y += 2;
  }

  if (settings.showTrackingQRCode) {
    // Match unifiedReceipt.ts: qr-section has a thin dashed separator.
    y += 1;
    addDividerSection(y);
    y += spacing.section - 1;

    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
    });

    const qrSize = settings.paperSize === '58mm' ? 22 : 26;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + spacing.section - 1;

    centerText(labels.scanToTrack, y, 8, false);
    y += spacing.section;
    y += 1;
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  y += 1;
  addDividerBranding(y);
  y += spacing.section - 1;
  centerText(`${labels.poweredBy} genfity.com`, y, 7, false);

  return toPdfBuffer(doc);
}
