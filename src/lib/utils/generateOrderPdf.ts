/**
 * Order Receipt PDF Generator
 * 
 * Client-side PDF generation using jsPDF
 * Generates styled receipt PDF for orders
 * Supports English and Indonesian languages
 * 
 * @specification implementation_plan.md - PDF Receipt Feature
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { formatFullOrderNumber } from '@/lib/utils/format';

// Receipt translations
const receiptTranslations = {
    en: {
        orderReceipt: 'ORDER RECEIPT',
        orderNumber: 'Order #',
        date: 'Date',
        type: 'Type',
        dineIn: 'Dine-in',
        takeaway: 'Takeaway',
        table: 'Table',
        customer: 'CUSTOMER',
        itemsOrdered: 'ITEMS ORDERED',
        note: 'Note',
        paymentDetails: 'Payment Details',
        subtotal: 'Subtotal',
        tax: 'Tax',
        serviceCharge: 'Service Charge',
        packagingFee: 'Packaging Fee',
        total: 'TOTAL',
        paymentMethod: 'Payment Method',
        status: 'Status',
        recordedBy: 'Recorded by',
        cashier: 'Cashier',
        thankYou: 'Thank you for your order!',
        paid: 'PAID',
    },
    id: {
        orderReceipt: 'STRUK PESANAN',
        orderNumber: 'No. Pesanan',
        date: 'Tanggal',
        type: 'Tipe',
        dineIn: 'Makan di Tempat',
        takeaway: 'Bawa Pulang',
        table: 'Meja',
        customer: 'PELANGGAN',
        itemsOrdered: 'ITEM PESANAN',
        note: 'Catatan',
        paymentDetails: 'Detail Pembayaran',
        subtotal: 'Subtotal',
        tax: 'Pajak',
        serviceCharge: 'Biaya Layanan',
        packagingFee: 'Biaya Kemasan',
        total: 'TOTAL',
        paymentMethod: 'Metode Pembayaran',
        status: 'Status',
        recordedBy: 'Dicatat oleh',
        cashier: 'Kasir',
        thankYou: 'Terima kasih atas pesanan Anda!',
        paid: 'LUNAS',
    },
};

export type ReceiptLanguage = 'en' | 'id';

export interface OrderReceiptData {
    orderNumber: string;
    merchantName: string;
    merchantCode: string;
    merchantAddress?: string;
    merchantPhone?: string;
    merchantLogo?: string | null;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string | null;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    placedAt: string;
    items: Array<{
        menuName: string;
        quantity: number;
        price: number;
        addons?: Array<{
            name: string;
            price: number;
        }>;
        notes?: string | null;
    }>;
    subtotal: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    packagingFeeAmount?: number;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    currency: string;
    // Staff who recorded the payment
    recordedBy?: {
        name: string;
        email: string;
    } | null;
    // Language for receipt (default: 'en')
    language?: ReceiptLanguage;
}

/**
 * Format currency based on currency code
 */
const formatCurrency = (amount: number, currency: string): string => {
    if (currency === 'AUD') {
        return `A$${amount.toFixed(2)}`;
    }
    if (currency === 'IDR') {
        return `Rp ${new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.round(amount))}`;
    }
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

/**
 * Format date for receipt based on language
 */
const formatDate = (dateString: string, lang: ReceiptLanguage): string => {
    const date = new Date(dateString);
    const locale = lang === 'id' ? 'id-ID' : 'en-AU';
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

/**
 * Format time for receipt
 */
const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
};

/**
 * Censor email for privacy (e.g., jo***@email.com)
 */
const censorEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    const visibleChars = Math.min(2, localPart.length);
    const censored = localPart.slice(0, visibleChars) + '***';
    return `${censored}@${domain}`;
};

/**
 * Load and compress image for PDF embedding
 * Uses canvas to resize and compress to JPEG
 * This significantly reduces PDF file size
 */
const loadAndCompressImage = async (url: string, maxSize: number = 100): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Calculate new dimensions (max 100x100 pixels for receipt logo)
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with 70% quality (much smaller than PNG)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };

            img.onerror = () => resolve(null);

            // Create object URL from blob
            img.src = URL.createObjectURL(blob);
        });
    } catch {
        return null;
    }
};

/**
 * Generate Order Receipt PDF
 * 
 * @param data - Order data for the receipt
 * @returns void - Downloads the PDF file
 */
export const generateOrderReceiptPdf = async (data: OrderReceiptData): Promise<void> => {
    const lang = data.language || 'en';
    const t = receiptTranslations[lang];

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 280], // Receipt paper width: 80mm, taller for logo and content
    });

    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 8;

    const displayOrderNumber = formatFullOrderNumber(data.orderNumber, data.merchantCode);

    // Helper function to add centered text
    const centerText = (text: string, y: number, fontSize: number = 10, bold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Helper function to add dashed line
    const addDashedLine = (y: number) => {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setLineDashPattern([], 0);
    };

        const addTrackingQrCode = async () => {
            try {
                if (!data.merchantCode || !data.orderNumber) return;

                const baseUrl = getPublicAppOrigin('https://order.genfity.com');
                const trackingUrl = `${baseUrl}/${data.merchantCode}/track/${data.orderNumber}`;

                const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 160,
                });

                // Draw QR in the center
                const qrSize = 26; // mm
                const qrX = (pageWidth - qrSize) / 2;

                doc.addImage(qrDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
                yPos += qrSize + 4;

                centerText(lang === 'id' ? 'Scan untuk lacak pesanan' : 'Scan to track your order', yPos, 8, false);
                yPos += 6;
            } catch {
                // If QR generation fails, skip silently (PDF still generated)
            }
        };

    // Helper function to add solid line
    const addLine = (y: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.line(margin, y, pageWidth - margin, y);
    };

    // Helper function to add left-right aligned text
    const addLeftRight = (left: string, right: string, y: number, fontSize: number = 8, bold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(left, margin, y);
        const rightWidth = doc.getTextWidth(right);
        doc.text(right, pageWidth - margin - rightWidth, y);
    };

    // ==========================================
    // HEADER - Logo and Merchant Info
    // ==========================================

    // Try to load and add logo
    if (data.merchantLogo) {
        try {
            const logoBase64 = await loadAndCompressImage(data.merchantLogo);
            if (logoBase64) {
                // Add logo centered, 15mm x 15mm
                const logoSize = 15;
                const logoX = (pageWidth - logoSize) / 2;
                doc.addImage(logoBase64, 'JPEG', logoX, yPos, logoSize, logoSize);
                yPos += logoSize + 3;
            }
        } catch (error) {
            console.error('Failed to load logo:', error);
        }
    }

    // Merchant name
    centerText(data.merchantName, yPos, 12, true);
    yPos += 5;

    // Merchant address
    if (data.merchantAddress) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const addressLines = doc.splitTextToSize(data.merchantAddress, contentWidth);
        for (const line of addressLines) {
            const lineWidth = doc.getTextWidth(line);
            doc.text(line, (pageWidth - lineWidth) / 2, yPos);
            yPos += 3.5;
        }
        doc.setTextColor(0, 0, 0);
    }

    yPos += 3;
    addDashedLine(yPos);
    yPos += 5;

    // ==========================================
    // ORDER TYPE & TABLE (Prominent)
    // ==========================================
    const orderTypeLabel = data.orderType === 'DINE_IN' ? t.dineIn : t.takeaway;
    let orderTypeDisplay = orderTypeLabel;
    if (data.tableNumber) {
        orderTypeDisplay = `${orderTypeLabel} / ${t.table} ${data.tableNumber}`;
    }
    centerText(orderTypeDisplay, yPos, 10, true);
    yPos += 6;

    // Tracking QR (match POS unified receipt behavior)
    await addTrackingQrCode();

    addDashedLine(yPos);
    yPos += 5;

    // ==========================================
    // ORDER INFO (Two columns)
    // ==========================================
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Row 1: Date and Cashier
    doc.setTextColor(100, 100, 100);
    doc.text(t.date, margin, yPos);
    if (data.recordedBy) {
        const cashierWidth = doc.getTextWidth(t.cashier);
        doc.text(t.cashier, pageWidth - margin - cashierWidth, yPos);
    }
    yPos += 4;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatDate(data.placedAt, lang)}`, margin, yPos);
    if (data.recordedBy) {
        const nameWidth = doc.getTextWidth(data.recordedBy.name);
        doc.text(data.recordedBy.name, pageWidth - margin - nameWidth, yPos);
    }
    yPos += 5;

    // Row 2: Order ID and Customer
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(t.orderNumber, margin, yPos);
    const custLabelWidth = doc.getTextWidth(t.customer);
    doc.text(t.customer, pageWidth - margin - custLabelWidth, yPos);
    yPos += 4;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(displayOrderNumber, margin, yPos);
    const custNameWidth = doc.getTextWidth(data.customerName);
    doc.text(data.customerName, pageWidth - margin - custNameWidth, yPos);
    yPos += 5;

    addDashedLine(yPos);
    yPos += 5;

    // ==========================================
    // ORDER ITEMS
    // ==========================================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];

        // Calculate item total
        const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);
        const itemTotal = (item.price + addonsTotal) * item.quantity;

        // Item name with quantity
        const itemText = `${item.menuName} x${item.quantity}`;
        const priceText = formatCurrency(itemTotal, data.currency);

        // Handle long item names with wrapping
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const maxWidth = contentWidth - doc.getTextWidth(priceText) - 5;
        const lines = doc.splitTextToSize(itemText, maxWidth);

        // First line with price
        addLeftRight(lines[0], priceText, yPos, 8);
        yPos += 4;

        // Additional wrapped lines
        for (let j = 1; j < lines.length; j++) {
            doc.text(lines[j], margin, yPos);
            yPos += 4;
        }

        // Addons (smaller, indented)
        if (item.addons && item.addons.length > 0) {
            for (const addon of item.addons) {
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                const addonText = `  ${addon.name}`;
                const addonPrice = formatCurrency(addon.price * item.quantity, data.currency);
                addLeftRight(addonText, addonPrice, yPos, 7);
                yPos += 3.5;
            }
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
        }

        // Notes
        if (item.notes) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            const noteLines = doc.splitTextToSize(`${t.note}: ${item.notes}`, contentWidth - 4);
            for (const noteLine of noteLines) {
                doc.text(noteLine, margin, yPos);
                yPos += 3;
            }
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
        }

        yPos += 1;
    }

    addDashedLine(yPos);
    yPos += 5;

    // ==========================================
    // PAYMENT DETAILS
    // ==========================================
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(t.paymentDetails, margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');

    addLeftRight(t.subtotal, formatCurrency(data.subtotal, data.currency), yPos);
    yPos += 4;

    if (data.taxAmount && data.taxAmount > 0) {
        addLeftRight(t.tax, formatCurrency(data.taxAmount, data.currency), yPos);
        yPos += 4;
    }

    if (data.serviceChargeAmount && data.serviceChargeAmount > 0) {
        addLeftRight(t.serviceCharge, formatCurrency(data.serviceChargeAmount, data.currency), yPos);
        yPos += 4;
    }

    if (data.packagingFeeAmount && data.packagingFeeAmount > 0) {
        addLeftRight(t.packagingFee, formatCurrency(data.packagingFeeAmount, data.currency), yPos);
        yPos += 4;
    }

    yPos += 1;

    // Total (Bold and prominent)
    doc.setFont('helvetica', 'bold');
    addLeftRight(t.total, formatCurrency(data.totalAmount, data.currency), yPos, 10, true);
    yPos += 6;

    addDashedLine(yPos);
    yPos += 5;

    // ==========================================
    // PAYMENT METHOD
    // ==========================================
    if (data.paymentMethod) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(t.paymentMethod, margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        const methodLabel = data.paymentMethod.replace(/_/g, ' ').toUpperCase();
        addLeftRight(methodLabel, formatCurrency(data.totalAmount, data.currency), yPos);
        yPos += 5;
    }

    addDashedLine(yPos);
    yPos += 6;

    // ==========================================
    // PAID STATUS
    // ==========================================
    if (data.paymentStatus === 'COMPLETED' || data.paymentStatus === 'PAID') {
        centerText(t.paid, yPos, 12, true);
        yPos += 4;
        const paidDateTime = `${formatDate(data.placedAt, lang)} - ${formatTime(data.placedAt)}`;
        centerText(paidDateTime, yPos, 8, false);
        yPos += 5;
    }

    // ==========================================
    // RECORDED BY (Staff with censored email)
    // ==========================================
    if (data.recordedBy) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const recordedText = `${t.recordedBy}: ${data.recordedBy.name} (${censorEmail(data.recordedBy.email)})`;
        centerText(recordedText, yPos, 7, false);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
    }

    yPos += 2;

    // ==========================================
    // FOOTER
    // ==========================================
    centerText(t.thankYou, yPos, 9, false);
    yPos += 8;

    doc.setTextColor(100, 100, 100);
    centerText('www.order.genfity.com', yPos, 7, false);
    doc.setTextColor(0, 0, 0);

    // ==========================================
    // SAVE PDF
    // ==========================================
    const filename = `receipt_${data.merchantCode}_${data.orderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(filename);
};

export default generateOrderReceiptPdf;
