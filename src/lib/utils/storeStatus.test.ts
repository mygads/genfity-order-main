import { describe, expect, it } from 'vitest';
import {
  getDayOfWeekFromISODate,
  isStoreOpenWithSpecialHoursForDateTime,
  isModeAvailableWithSchedulesForDateTime,
  type ExtendedMerchantStatus,
  type SpecialHour,
} from '@/lib/utils/storeStatus';

describe('storeStatus date-aware helpers', () => {
  it('getDayOfWeekFromISODate is deterministic (UTC-based)', () => {
    // 2026-01-13 is Tuesday
    expect(getDayOfWeekFromISODate('2026-01-13')).toBe(2);
    // 2026-01-11 is Sunday
    expect(getDayOfWeekFromISODate('2026-01-11')).toBe(0);
  });

  it('manual override closed blocks store for any date/time', () => {
    const merchant: ExtendedMerchantStatus = {
      isOpen: false,
      isManualOverride: true,
      openingHours: Array.from({ length: 7 }, (_, d) => ({
        dayOfWeek: d,
        openTime: '09:00',
        closeTime: '22:00',
        isClosed: false,
      })),
    };

    const res = isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '12:00', null);
    expect(res.isOpen).toBe(false);
    expect(res.reason).toContain('Manually');
  });

  it('opening hours gate store by day/time (no special hours)', () => {
    const merchant: ExtendedMerchantStatus = {
      isOpen: true,
      isManualOverride: false,
      openingHours: Array.from({ length: 7 }, (_, d) => ({
        dayOfWeek: d,
        openTime: '09:00',
        closeTime: '17:00',
        isClosed: false,
      })),
    };

    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '08:59', null).isOpen).toBe(false);
    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '09:00', null).isOpen).toBe(true);
    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '17:01', null).isOpen).toBe(false);
  });

  it('special hours override regular opening hours', () => {
    const merchant: ExtendedMerchantStatus = {
      isOpen: true,
      isManualOverride: false,
      openingHours: Array.from({ length: 7 }, (_, d) => ({
        dayOfWeek: d,
        openTime: '09:00',
        closeTime: '22:00',
        isClosed: false,
      })),
    };

    const special: SpecialHour = {
      date: '2026-01-13',
      name: 'Private Event',
      isClosed: false,
      openTime: '12:00',
      closeTime: '14:00',
    };

    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '11:59', special).isOpen).toBe(false);
    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '12:30', special).isOpen).toBe(true);
    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '14:01', special).isOpen).toBe(false);
  });

  it('mode schedules: per-day schedule and global enable flags', () => {
    const merchant: ExtendedMerchantStatus = {
      isOpen: true,
      isManualOverride: false,
      isDineInEnabled: true,
      isTakeawayEnabled: true,
      isDeliveryEnabled: false,
      // set per-day schedules for all days so tests don’t depend on current weekday
      modeSchedules: Array.from({ length: 7 }, (_, d) => ({
        mode: 'DINE_IN',
        dayOfWeek: d,
        startTime: '10:00',
        endTime: '12:00',
      })),
    };

    expect(isModeAvailableWithSchedulesForDateTime('DINE_IN', merchant, '2026-01-13', '09:59', null).available).toBe(false);
    expect(isModeAvailableWithSchedulesForDateTime('DINE_IN', merchant, '2026-01-13', '10:00', null).available).toBe(true);
    expect(isModeAvailableWithSchedulesForDateTime('DINE_IN', merchant, '2026-01-13', '12:01', null).available).toBe(false);

    // Delivery is disabled globally
    expect(isModeAvailableWithSchedulesForDateTime('DELIVERY', merchant, '2026-01-13', '10:30', null).available).toBe(false);
  });

  it('manual override open does not bypass mode disabled', () => {
    const merchant: ExtendedMerchantStatus = {
      isOpen: true,
      isManualOverride: true,
      isDineInEnabled: false,
    };

    expect(isStoreOpenWithSpecialHoursForDateTime(merchant, '2026-01-13', '12:00', null).isOpen).toBe(true);
    expect(isModeAvailableWithSchedulesForDateTime('DINE_IN', merchant, '2026-01-13', '12:00', null).available).toBe(false);
  });
});
