import type { MerchantFormData, OpeningHour } from '@/components/merchants/merchant-edit/types';

export function hasMerchantUnsavedChanges({
  formData,
  originalFormData,
  openingHours,
  originalOpeningHours,
  discountVoucherSettings,
  originalDiscountVoucherSettings,
}: {
  formData: MerchantFormData;
  originalFormData: MerchantFormData | null;
  openingHours: OpeningHour[];
  originalOpeningHours: OpeningHour[];
  discountVoucherSettings?: { posDiscountsEnabled: boolean; customerVouchersEnabled: boolean };
  originalDiscountVoucherSettings?: { posDiscountsEnabled: boolean; customerVouchersEnabled: boolean } | null;
}): boolean {
  if (!originalFormData) return false;

  const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const hoursChanged = JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours);

  const discountVoucherChanged =
    discountVoucherSettings && originalDiscountVoucherSettings
      ? JSON.stringify(discountVoucherSettings) !== JSON.stringify(originalDiscountVoucherSettings)
      : false;

  return formChanged || hoursChanged || discountVoucherChanged;
}
