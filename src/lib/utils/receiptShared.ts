import { DEFAULT_RECEIPT_SETTINGS, ReceiptSettings } from '@/lib/types/receiptSettings';

export type ReceiptLanguage = 'en' | 'id';

export interface ReceiptLabels {
  title: string;
  orderNumber: string;
  date: string;
  type: string;
  table: string;
  dineIn: string;
  takeaway: string;
  items: string;
  customer: string;
  phone: string;
  email: string;
  each: string;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  packagingFee: string;
  deliveryFee: string;
  discount: string;
  total: string;
  paymentMethod: string;
  amountPaid: string;
  change: string;
  cashier: string;
  thankYou: string;
  poweredBy: string;
  scanToTrack: string;
}

const labelsEN: ReceiptLabels = {
  title: 'ORDER RECEIPT',
  orderNumber: 'Order #',
  date: 'Date',
  type: 'Type',
  table: 'Table',
  dineIn: 'Dine In',
  takeaway: 'Takeaway',
  items: 'Items',
  customer: 'Customer',
  phone: 'Phone',
  email: 'Email',
  each: 'each',
  subtotal: 'Subtotal',
  tax: 'Tax',
  serviceCharge: 'Service Charge',
  packagingFee: 'Packaging Fee',
  deliveryFee: 'Delivery Fee',
  discount: 'Discount',
  total: 'TOTAL',
  paymentMethod: 'Payment',
  amountPaid: 'Amount Paid',
  change: 'Change',
  cashier: 'Cashier',
  thankYou: 'Thank you for your order!',
  poweredBy: 'Powered by',
  scanToTrack: 'Scan to track your order',
};

const labelsID: ReceiptLabels = {
  title: 'STRUK PESANAN',
  orderNumber: 'Pesanan #',
  date: 'Waktu',
  type: 'Tipe',
  table: 'Meja',
  dineIn: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  items: 'Item Pesanan',
  customer: 'Pelanggan',
  phone: 'Telepon',
  email: 'Email',
  each: 'per item',
  subtotal: 'Subtotal',
  tax: 'Pajak',
  serviceCharge: 'Biaya Layanan',
  packagingFee: 'Biaya Kemasan',
  deliveryFee: 'Biaya Pengantaran',
  discount: 'Diskon',
  total: 'TOTAL',
  paymentMethod: 'Pembayaran',
  amountPaid: 'Jumlah Dibayar',
  change: 'Kembalian',
  cashier: 'Kasir',
  thankYou: 'Terima kasih atas pesanan Anda!',
  poweredBy: 'Diberdayakan oleh',
  scanToTrack: 'Scan untuk lacak pesanan',
};

export function inferReceiptLanguageFromCurrency(currency: string): ReceiptLanguage {
  return currency === 'IDR' ? 'id' : 'en';
}

export function getReceiptLabels(language: ReceiptLanguage): ReceiptLabels {
  return language === 'id' ? labelsID : labelsEN;
}

export function mergeReceiptSettingsWithDefaults(params: {
  rawSettings?: Partial<ReceiptSettings> | null;
  currency: string;
  preferredLanguage?: ReceiptLanguage;
}): { settings: ReceiptSettings; receiptLanguage: ReceiptLanguage } {
  const raw = (params.rawSettings || {}) as Partial<ReceiptSettings>;
  const inferredLanguage = inferReceiptLanguageFromCurrency(params.currency);

  const receiptLanguage: ReceiptLanguage =
    params.preferredLanguage ||
    (raw.receiptLanguage === 'id' || raw.receiptLanguage === 'en' ? raw.receiptLanguage : inferredLanguage);

  const paperSize: '58mm' | '80mm' = raw.paperSize === '58mm' ? '58mm' : '80mm';

  const settings: ReceiptSettings = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...raw,
    receiptLanguage,
    paperSize,
  };

  return { settings, receiptLanguage };
}
