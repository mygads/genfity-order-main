import { ReceiptSettings } from '@/lib/types/receiptSettings';

export interface MerchantFormData {
  name: string;
  code: string;
  description: string;
  address: string;
  email: string;
  phoneNumber: string;
  logoUrl?: string;
  bannerUrl?: string;
  country: string;
  currency: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  // Delivery settings
  isDeliveryEnabled: boolean;
  enforceDeliveryZones: boolean;
  deliveryMaxDistanceKm: number | null;
  deliveryFeeBase: number;
  deliveryFeePerKm: number;
  deliveryFeeMin: number | null;
  deliveryFeeMax: number | null;
  // Sale mode settings
  isDineInEnabled: boolean;
  isTakeawayEnabled: boolean;
  requireTableNumberForDineIn: boolean;
  dineInLabel: string;
  takeawayLabel: string;
  deliveryLabel: string;
  dineInScheduleStart: string;
  dineInScheduleEnd: string;
  takeawayScheduleStart: string;
  takeawayScheduleEnd: string;
  deliveryScheduleStart: string;
  deliveryScheduleEnd: string;
  totalTables: number | null;
  // POS settings
  posPayImmediately: boolean;
  // Reservation settings
  isReservationEnabled: boolean;
  reservationMenuRequired: boolean;
  reservationMinItemCount: number;
  // Scheduled orders
  isScheduledOrderEnabled: boolean;
  // Fee settings
  enableTax: boolean;
  taxPercentage: number;
  enableServiceCharge: boolean;
  serviceChargePercent: number;
  enablePackagingFee: boolean;
  packagingFeeAmount: number;
  // Receipt settings
  receiptSettings: ReceiptSettings;
}

export interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}
