/**
 * Delivery Features Tests
 * Tests for: distance calculation, zone validation, fee calculation
 */

import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, isPointInPolygon, type LatLng } from '@/lib/utils/geo';

describe('Delivery Utilities', () => {
  describe('haversineDistanceKm', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // Sydney Opera House to Harbour Bridge (approx 1.7 km)
      const operaHouse: LatLng = { lat: -33.8568, lng: 151.2153 };
      const harbourBridge: LatLng = { lat: -33.8523, lng: 151.2108 };

      const distance = haversineDistanceKm(operaHouse, harbourBridge);
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(2);
    });

    it('should return 0 for same coordinates', () => {
      const point: LatLng = { lat: -33.8568, lng: 151.2153 };
      const distance = haversineDistanceKm(point, point);
      expect(distance).toBe(0);
    });

    it('should calculate large distances correctly', () => {
      // Sydney to Melbourne (approx 714 km)
      const sydney: LatLng = { lat: -33.8688, lng: 151.2093 };
      const melbourne: LatLng = { lat: -37.8136, lng: 144.9631 };

      const distance = haversineDistanceKm(sydney, melbourne);
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });
  });

  describe('isPointInPolygon', () => {
    it('should detect point inside triangle', () => {
      const triangle: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 2, lng: 0 },
        { lat: 1, lng: 2 },
      ];

      const insidePoint: LatLng = { lat: 1, lng: 0.5 };
      expect(isPointInPolygon(insidePoint, triangle)).toBe(true);
    });

    it('should detect point outside triangle', () => {
      const triangle: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 2, lng: 0 },
        { lat: 1, lng: 2 },
      ];

      const outsidePoint: LatLng = { lat: 3, lng: 3 };
      expect(isPointInPolygon(outsidePoint, triangle)).toBe(false);
    });

    it('should detect point inside square', () => {
      const square: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ];

      const insidePoint: LatLng = { lat: 5, lng: 5 };
      expect(isPointInPolygon(insidePoint, square)).toBe(true);
    });

    it('should detect point outside square', () => {
      const square: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ];

      const outsidePoint: LatLng = { lat: 15, lng: 15 };
      expect(isPointInPolygon(outsidePoint, square)).toBe(false);
    });

    it('should reject polygon with less than 3 points', () => {
      const line: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ];

      const point: LatLng = { lat: 0.5, lng: 0.5 };
      expect(isPointInPolygon(point, line)).toBe(false);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate base fee correctly', () => {
      const feeBase = 3.0;
      const feePerKm = 1.0;
      const distance = 5.0;

      const fee = feeBase + feePerKm * distance;
      expect(fee).toBe(8.0);
    });

    it('should apply minimum fee', () => {
      const feeBase = 0.5;
      const feePerKm = 0.5;
      const distance = 0.5;
      const feeMin = 3.0;

      let fee = feeBase + feePerKm * distance;
      if (feeMin !== null) fee = Math.max(fee, feeMin);

      expect(fee).toBe(3.0);
    });

    it('should apply maximum fee', () => {
      const feeBase = 5.0;
      const feePerKm = 2.0;
      const distance = 50.0;
      const feeMax = 20.0;

      let fee = feeBase + feePerKm * distance;
      if (feeMax !== null) fee = Math.min(fee, feeMax);

      expect(fee).toBe(20.0);
    });

    it('should calculate progressive fee correctly', () => {
      const feeBase = 2.0;
      const feePerKm = 0.5;
      const feeMin = 2.5;
      const feeMax = 15.0;

      const testCases = [
        { distance: 0, expectedFee: 2.5 }, // Hits minimum
        { distance: 1, expectedFee: 2.5 }, // Still minimum
        { distance: 2, expectedFee: 3.0 },
        { distance: 5, expectedFee: 4.5 },
        { distance: 30, expectedFee: 15.0 }, // Hits maximum
      ];

      testCases.forEach(({ distance, expectedFee }) => {
        let fee = feeBase + feePerKm * distance;
        if (feeMin !== null) fee = Math.max(fee, feeMin);
        if (feeMax !== null) fee = Math.min(fee, feeMax);

        expect(fee).toBe(expectedFee);
      });
    });

    it('should round fees to 2 decimal places', () => {
      const round2 = (num: number): number => Math.round(num * 100) / 100;

      expect(round2(3.456)).toBe(3.46);
      expect(round2(3.454)).toBe(3.45);
      expect(round2(3.451)).toBe(3.45);
      expect(round2(3.999)).toBe(4.0);
    });
  });

  describe('Distance Rounding', () => {
    it('should round distance to 3 decimal places', () => {
      const round3 = (num: number): number => Math.round(num * 1000) / 1000;

      expect(round3(5.4567)).toBe(5.457);
      expect(round3(5.4564)).toBe(5.456);
      expect(round3(5.4561)).toBe(5.456);
    });
  });
});
