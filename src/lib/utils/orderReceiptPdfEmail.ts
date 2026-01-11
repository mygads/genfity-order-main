import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { formatCurrency, formatFullOrderNumber } from '@/lib/utils/format';

export type OrderReceiptEmailLanguage = 'en' | 'id';

export interface OrderReceiptEmailPdfData {
  orderNumber: string;
  merchantCode: string;
  merchantName: string;
  customerName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  currency: string;
  completedAt: Date;
  locale: OrderReceiptEmailLanguage;
  timeZone: string;
}

const t = (locale: OrderReceiptEmailLanguage) => {
  const isID = locale === 'id';
  return {
    title: isID ? 'STRUK PESANAN' : 'ORDER RECEIPT',
    merchant: isID ? 'Restoran' : 'Restaurant',
    customer: isID ? 'Pelanggan' : 'Customer',
    orderNumber: isID ? 'No. Pesanan' : 'Order #',
    date: isID ? 'Waktu' : 'Date',
    type: isID ? 'Tipe' : 'Type',
    dineIn: isID ? 'Makan di Tempat' : 'Dine-in',
    takeaway: isID ? 'Bawa Pulang' : 'Takeaway',
    table: isID ? 'Meja' : 'Table',
    items: isID ? 'Item Pesanan' : 'Items',
    total: isID ? 'Total' : 'Total',
    track: isID ? 'Lacak pesanan:' : 'Track your order:',
  };
};

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

export async function generateOrderReceiptPdfBuffer(data: OrderReceiptEmailPdfData): Promise<Buffer> {
  const labels = t(data.locale);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 40;
  const lineHeight = 16;
  let y = margin;

  const writeLine = (text: string, options?: { bold?: boolean; size?: number; right?: boolean }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 11);
    if (options?.right) {
      doc.text(text, pageWidth - margin, y, { align: 'right' });
    } else {
      doc.text(text, margin, y);
    }
    y += lineHeight;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const fullOrderNumber = formatFullOrderNumber(data.orderNumber, data.merchantCode);

  writeLine(labels.title, { bold: true, size: 16 });
  y += 6;

  writeLine(`${labels.merchant}: ${data.merchantName}`, { size: 11 });
  writeLine(`${labels.customer}: ${data.customerName}`, { size: 11 });
  writeLine(`${labels.orderNumber}: ${fullOrderNumber}`, { bold: true, size: 11 });
  writeLine(`${labels.date}: ${formatDateTime({ date: data.completedAt, locale: data.locale, timeZone: data.timeZone })}`, {
    size: 11,
  });

  const typeLabel =
    data.orderType === 'DINE_IN'
      ? labels.dineIn
      : labels.takeaway;

  writeLine(
    `${labels.type}: ${typeLabel}${data.tableNumber ? ` • ${labels.table}: ${data.tableNumber}` : ''}`,
    { size: 11 }
  );

  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  writeLine(labels.items, { bold: true, size: 12 });
  y += 4;

  for (const item of data.items) {
    ensureSpace(3 * lineHeight);

    const left = `${item.quantity} × ${item.name}`;
    const right = formatCurrency(item.price, data.currency, data.locale);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const maxWidth = pageWidth - margin * 2 - 120;
    const lines = doc.splitTextToSize(left, maxWidth);

    for (let i = 0; i < lines.length; i++) {
      ensureSpace(lineHeight);
      doc.text(lines[i], margin, y);
      if (i === 0) {
        doc.text(right, pageWidth - margin, y, { align: 'right' });
      }
      y += lineHeight;
    }
  }

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  writeLine(labels.total, { bold: true, size: 12 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(formatCurrency(data.total, data.currency, data.locale), pageWidth - margin, y - lineHeight, { align: 'right' });

  y += 18;

  // QR Code for tracking
  ensureSpace(140);
  const baseUrl = getPublicAppOrigin('https://order.genfity.com');
  const trackingUrl = `${baseUrl}/${data.merchantCode}/track/${data.orderNumber}`;

  const qrDataUrl = await QRCode.toDataURL(trackingUrl, { margin: 1, width: 180 });
  doc.addImage(qrDataUrl, 'PNG', margin, y, 140, 140);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(labels.track, margin + 150, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const urlLines = doc.splitTextToSize(trackingUrl, pageWidth - margin * 2 - 150);
  doc.text(urlLines, margin + 150, y + 40);

  return toPdfBuffer(doc);
}
