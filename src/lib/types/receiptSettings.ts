/**
 * Receipt Template Settings Type
 * 
 * Defines the structure for merchant receipt customization options
 */

export interface ReceiptSettings {
  // Customer notifications
  // When enabled, a completed-order email is sent to the customer (subject to billing/balance rules)
  sendCompletedOrderEmailToCustomer: boolean;

  // Global Preferences
  paperSize: '58mm' | '80mm';
  receiptLanguage: 'en' | 'id';

  // Header Section
  showLogo: boolean;
  showMerchantName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;

  // Order Section
  showOrderNumber: boolean;
  showOrderType: boolean;
  showTableNumber: boolean;
  showDateTime: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;

  // Items Section
  showItemNotes: boolean;
  showAddons: boolean;
  showAddonPrices: boolean;
  showUnitPrice: boolean;

  // Payment Section
  showSubtotal: boolean;
  showTax: boolean;
  showServiceCharge: boolean;
  showPackagingFee: boolean;
  showDiscount: boolean;
  showTotal: boolean;
  showAmountPaid: boolean;
  showChange: boolean;
  showPaymentMethod: boolean;
  showCashierName: boolean;

  // Footer Section
  showThankYouMessage: boolean;
  customThankYouMessage?: string;
  showCustomFooterText: boolean;
  customFooterText?: string; // For WiFi password, promo info, etc.
  showFooterPhone: boolean;

  // QR Code Section
  showTrackingQRCode: boolean; // QR code linking to order tracking page

  // Genfity Branding (always shown, cannot be disabled)
  // showGenfityBranding: true (hardcoded, not configurable)
}

/**
 * Default receipt settings used when merchant hasn't configured
 */
export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  // Customer notifications
  sendCompletedOrderEmailToCustomer: false,

  // Global Preferences
  paperSize: '80mm',
  receiptLanguage: 'en',

  // Header Section - Default ON
  showLogo: true,
  showMerchantName: true,
  showAddress: true,
  showPhone: true,
  showEmail: false,

  // Order Section - Default ON
  showOrderNumber: true,
  showOrderType: true,
  showTableNumber: true,
  showDateTime: true,
  showCustomerName: true,
  showCustomerPhone: false,

  // Items Section - Default ON
  showItemNotes: true,
  showAddons: true,
  showAddonPrices: false,
  showUnitPrice: false,

  // Payment Section - Default ON for important fields
  showSubtotal: true,
  showTax: true,
  showServiceCharge: true,
  showPackagingFee: true,
  showDiscount: true,
  showTotal: true,
  showAmountPaid: true,
  showChange: true,
  showPaymentMethod: true,
  showCashierName: true,

  // Footer Section - Default ON
  showThankYouMessage: true,
  customThankYouMessage: undefined,
  showCustomFooterText: false,
  customFooterText: undefined,
  showFooterPhone: true,

  // QR Code Section - Default ON
  showTrackingQRCode: true,
};

/**
 * Receipt settings field groups for UI organization
 */
export const RECEIPT_SETTINGS_GROUPS = {
  header: {
    titleKey: 'admin.receipt.headerSection',
    fields: [
      { key: 'showLogo', labelKey: 'admin.receipt.showLogo' },
      { key: 'showMerchantName', labelKey: 'admin.receipt.showMerchantName' },
      { key: 'showAddress', labelKey: 'admin.receipt.showAddress' },
      { key: 'showPhone', labelKey: 'admin.receipt.showPhone' },
      { key: 'showEmail', labelKey: 'admin.receipt.showEmail' },
    ],
  },
  order: {
    titleKey: 'admin.receipt.orderSection',
    fields: [
      { key: 'showOrderNumber', labelKey: 'admin.receipt.showOrderNumber' },
      { key: 'showOrderType', labelKey: 'admin.receipt.showOrderType' },
      { key: 'showTableNumber', labelKey: 'admin.receipt.showTableNumber' },
      { key: 'showDateTime', labelKey: 'admin.receipt.showDateTime' },
      { key: 'showCustomerName', labelKey: 'admin.receipt.showCustomerName' },
      { key: 'showCustomerPhone', labelKey: 'admin.receipt.showCustomerPhone' },
    ],
  },
  items: {
    titleKey: 'admin.receipt.itemsSection',
    fields: [
      { key: 'showItemNotes', labelKey: 'admin.receipt.showItemNotes' },
      { key: 'showAddons', labelKey: 'admin.receipt.showAddons' },
      { key: 'showAddonPrices', labelKey: 'admin.receipt.showAddonPrices' },
      { key: 'showUnitPrice', labelKey: 'admin.receipt.showUnitPrice' },
    ],
  },
  payment: {
    titleKey: 'admin.receipt.paymentSection',
    fields: [
      { key: 'showSubtotal', labelKey: 'admin.receipt.showSubtotal' },
      { key: 'showTax', labelKey: 'admin.receipt.showTax' },
      { key: 'showServiceCharge', labelKey: 'admin.receipt.showServiceCharge' },
      { key: 'showPackagingFee', labelKey: 'admin.receipt.showPackagingFee' },
      { key: 'showDiscount', labelKey: 'admin.receipt.showDiscount' },
      { key: 'showTotal', labelKey: 'admin.receipt.showTotal' },
      { key: 'showAmountPaid', labelKey: 'admin.receipt.showAmountPaid' },
      { key: 'showChange', labelKey: 'admin.receipt.showChange' },
      { key: 'showPaymentMethod', labelKey: 'admin.receipt.showPaymentMethod' },
      { key: 'showCashierName', labelKey: 'admin.receipt.showCashierName' },
    ],
  },
  footer: {
    titleKey: 'admin.receipt.footerSection',
    fields: [
      { key: 'showThankYouMessage', labelKey: 'admin.receipt.showThankYouMessage' },
      { key: 'showCustomFooterText', labelKey: 'admin.receipt.showCustomFooterText' },
      { key: 'showFooterPhone', labelKey: 'admin.receipt.showFooterPhone' },
      { key: 'showTrackingQRCode', labelKey: 'admin.receipt.showTrackingQRCode' },
    ],
  },
} as const;
