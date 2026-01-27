import type { MerchantFormData, OpeningHour } from '@/components/merchants/merchant-edit/types';

export function hasMerchantUnsavedChanges({
  formData,
  originalFormData,
  openingHours,
  originalOpeningHours,
  discountVoucherSettings,
  originalDiscountVoucherSettings,
  paymentSettings,
  originalPaymentSettings,
  paymentAccounts,
  originalPaymentAccounts,
}: {
  formData: MerchantFormData;
  originalFormData: MerchantFormData | null;
  openingHours: OpeningHour[];
  originalOpeningHours: OpeningHour[];
  discountVoucherSettings?: { posDiscountsEnabled: boolean; customerVouchersEnabled: boolean };
  originalDiscountVoucherSettings?: { posDiscountsEnabled: boolean; customerVouchersEnabled: boolean } | null;
  paymentSettings?: unknown;
  originalPaymentSettings?: unknown;
  paymentAccounts?: unknown;
  originalPaymentAccounts?: unknown;
}): boolean {
  if (!originalFormData) return false;

  const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const hoursChanged = JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours);

  const discountVoucherChanged =
    discountVoucherSettings && originalDiscountVoucherSettings
      ? JSON.stringify(discountVoucherSettings) !== JSON.stringify(originalDiscountVoucherSettings)
      : false;

  const paymentSettingsChanged =
    paymentSettings && originalPaymentSettings
      ? JSON.stringify(paymentSettings) !== JSON.stringify(originalPaymentSettings)
      : false;

  const paymentAccountsChanged =
    paymentAccounts && originalPaymentAccounts
      ? JSON.stringify(paymentAccounts) !== JSON.stringify(originalPaymentAccounts)
      : false;

  return formChanged || hoursChanged || discountVoucherChanged || paymentSettingsChanged || paymentAccountsChanged;
}
