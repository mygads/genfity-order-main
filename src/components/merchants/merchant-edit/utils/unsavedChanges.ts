import type { MerchantFormData, OpeningHour } from '@/components/merchants/merchant-edit/types';

export function hasMerchantUnsavedChanges({
  formData,
  originalFormData,
  openingHours,
  originalOpeningHours,
}: {
  formData: MerchantFormData;
  originalFormData: MerchantFormData | null;
  openingHours: OpeningHour[];
  originalOpeningHours: OpeningHour[];
}): boolean {
  if (!originalFormData) return false;

  const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const hoursChanged = JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours);

  return formChanged || hoursChanged;
}
