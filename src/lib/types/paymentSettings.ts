export type MerchantPaymentMethodKey = 'PAY_AT_CASHIER' | 'MANUAL_TRANSFER' | 'QRIS';

export type PaymentAccountType = 'BANK' | 'EWALLET';

export interface MerchantPaymentSettings {
  payAtCashierEnabled: boolean;
  manualTransferEnabled: boolean;
  qrisEnabled: boolean;
  requirePaymentProof: boolean;
  qrisImageUrl?: string | null;
  qrisImageMeta?: unknown | null;
  qrisImageUploadedAt?: string | null;
}

export interface MerchantPaymentAccount {
  id?: string;
  type: PaymentAccountType;
  providerName: string;
  accountName: string;
  accountNumber: string;
  bsb?: string | null;
  country?: string | null;
  currency?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface MerchantPaymentSettingsPayload {
  settings: MerchantPaymentSettings;
  accounts: MerchantPaymentAccount[];
}
