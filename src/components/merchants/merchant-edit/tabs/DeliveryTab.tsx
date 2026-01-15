import React from 'react';

import DeliverySettingsTab from '@/components/merchants/DeliverySettingsTab';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';

type MerchantDeliveryFormFields = {
  code: string;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  isDeliveryEnabled: boolean;
  enforceDeliveryZones: boolean;
  deliveryMaxDistanceKm: number | null;
  deliveryFeeBase: number;
  deliveryFeePerKm: number;
  deliveryFeeMin: number | null;
  deliveryFeeMax: number | null;
};

type DeliveryFormData = Record<string, unknown> & MerchantDeliveryFormFields;

type ToastFn = (title: string, message: string, duration?: number) => void;

export interface DeliveryTabProps {
  authToken: string;
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
  showSuccess: ToastFn;
  showError: ToastFn;
}

export default function DeliveryTab({ authToken, formData, setFormData, showSuccess, showError }: DeliveryTabProps) {
  const deliveryFormData = formData as unknown as DeliveryFormData;

  const setDeliveryFormData = (updater: (prev: DeliveryFormData) => DeliveryFormData) => {
    setFormData((prev) => updater(prev as unknown as DeliveryFormData) as unknown as MerchantFormData);
  };

  return (
    <DeliverySettingsTab
      authToken={authToken}
      formData={deliveryFormData}
      setFormData={setDeliveryFormData}
      showSuccess={showSuccess}
      showError={showError}
    />
  );
}
