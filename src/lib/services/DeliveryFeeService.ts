/**
 * Delivery Fee Service
 * Shared business logic for delivery fee calculation, zone validation, and distance computation
 * Used by both order creation API and public quote endpoint to ensure consistency
 */

import prisma from '@/lib/db/client';
import { haversineDistanceKm, isPointInPolygon, type LatLng } from '@/lib/utils/geo';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Delivery validation and fee calculation result
 */
export interface DeliveryFeeResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  data?: {
    distanceKm: number;
    feeAmount: number;
  };
}

/**
 * Helper: Convert Decimal to number
 */
function decimalToNumber(val: Decimal | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  return Number(val);
}

/**
 * Helper: Round to 2 decimal places
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Helper: Round to 3 decimal places (for distance)
 */
function round3(num: number): number {
  return Math.round(num * 1000) / 1000;
}

export class DeliveryFeeService {
  /**
   * Validate delivery request and calculate fee
   * 
   * @param merchantId - Merchant ID
   * @param deliveryLatitude - Customer delivery latitude
   * @param deliveryLongitude - Customer delivery longitude
   * @returns DeliveryFeeResult with either error or fee data
   */
  static async validateAndCalculateFee(
    merchantId: bigint,
    deliveryLatitude: number,
    deliveryLongitude: number
  ): Promise<DeliveryFeeResult> {
    // Fetch merchant with delivery settings
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        latitude: true,
        longitude: true,
        isDeliveryEnabled: true,
        enforceDeliveryZones: true,
        deliveryMaxDistanceKm: true,
        deliveryFeeBase: true,
        deliveryFeePerKm: true,
        deliveryFeeMin: true,
        deliveryFeeMax: true,
      },
    });

    // Check merchant exists and delivery enabled
    if (!merchant) {
      return {
        success: false,
        error: {
          code: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
        },
      };
    }

    if (!merchant.isDeliveryEnabled) {
      return {
        success: false,
        error: {
          code: 'DELIVERY_NOT_ENABLED',
          message: 'Delivery is not available for this merchant',
        },
      };
    }

    // Validate merchant has coordinates
    const merchantLat = decimalToNumber(merchant.latitude);
    const merchantLng = decimalToNumber(merchant.longitude);
    if (merchantLat === null || merchantLng === null) {
      return {
        success: false,
        error: {
          code: 'MERCHANT_LOCATION_NOT_SET',
          message: 'Merchant location is not configured for delivery',
        },
      };
    }

    // Validate customer coordinates
    if (!Number.isFinite(deliveryLatitude) || !Number.isFinite(deliveryLongitude)) {
      return {
        success: false,
        error: {
          code: 'INVALID_DELIVERY_COORDS',
          message: 'Invalid delivery coordinates',
        },
      };
    }

    // Calculate distance
    const merchantPoint: LatLng = { lat: merchantLat, lng: merchantLng };
    const deliveryPoint: LatLng = { lat: deliveryLatitude, lng: deliveryLongitude };
    const rawDistanceKm = haversineDistanceKm(merchantPoint, deliveryPoint);
    const distanceKm = round3(rawDistanceKm);

    // Check max distance
    const maxDistanceKm = decimalToNumber(merchant.deliveryMaxDistanceKm);
    if (maxDistanceKm !== null && distanceKm > maxDistanceKm) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_RANGE',
          message: `Delivery is only available within ${maxDistanceKm} km`,
        },
      };
    }

    // Validate zones if enforced
    if (merchant.enforceDeliveryZones !== false) {
      const zonesValidationResult = await this.validateDeliveryZones(
        merchantId,
        merchantPoint,
        deliveryPoint
      );

      if (!zonesValidationResult.success) {
        return zonesValidationResult;
      }
    }

    // Calculate fee
    const feeBase = decimalToNumber(merchant.deliveryFeeBase) ?? 0;
    const feePerKm = decimalToNumber(merchant.deliveryFeePerKm) ?? 0;
    const feeMin = decimalToNumber(merchant.deliveryFeeMin);
    const feeMax = decimalToNumber(merchant.deliveryFeeMax);

    const unboundedFee = feeBase + feePerKm * distanceKm;
    let feeAmount = round2(unboundedFee);
    if (feeMin !== null) feeAmount = Math.max(feeAmount, feeMin);
    if (feeMax !== null) feeAmount = Math.min(feeAmount, feeMax);

    return {
      success: true,
      data: {
        distanceKm,
        feeAmount: round2(feeAmount),
      },
    };
  }

  /**
   * Validate delivery location against merchant zones
   * 
   * @param merchantId - Merchant ID
   * @param deliveryPoint - Delivery location as LatLng
   * @returns DeliveryFeeResult with error if validation fails, success if valid
   */
  private static async validateDeliveryZones(
    merchantId: bigint,
    merchantPoint: LatLng,
    deliveryPoint: LatLng
  ): Promise<DeliveryFeeResult> {
    // Fetch all active zones for merchant
    const zones = await prisma.merchantDeliveryZone.findMany({
      where: {
        merchantId,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        radiusKm: true,
        polygon: true,
      },
    }) as Array<{
      id: bigint;
      type: 'RADIUS' | 'POLYGON';
      radiusKm: Decimal | null;
      polygon: unknown | null;
    }>;

    // No zones configured
    if (zones.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_ZONES_CONFIGURED',
          message: 'Delivery zones are not configured for this merchant',
        },
      };
    }

    // Check if delivery point is in any active zone
    const inAnyZone = zones.some((zone) => {
      if (zone.type === 'RADIUS') {
        const radiusKm = decimalToNumber(zone.radiusKm as unknown as Decimal | null);
        if (radiusKm === null) return false;
        const distanceFromMerchant = haversineDistanceKm(merchantPoint, deliveryPoint);
        return distanceFromMerchant <= radiusKm;
      }

      if (zone.type === 'POLYGON') {
        const polygon = zone.polygon as unknown as LatLng[] | null;
        if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return false;
        return isPointInPolygon(deliveryPoint, polygon);
      }

      return false;
    });

    if (!inAnyZone) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_ZONE',
          message: 'Delivery is not available for this location',
        },
      };
    }

    return { success: true };
  }

  /**
   * Get formatted error message for delivery validation
   * 
   * @param errorCode - Error code from validation result
   * @param details - Optional details to include in message (e.g., max distance)
   * @returns User-friendly error message
   */
  static getErrorMessage(errorCode: string, details?: { [key: string]: string | number }): string {
    const messages: { [key: string]: string } = {
      MERCHANT_NOT_FOUND: 'Merchant not found',
      DELIVERY_NOT_ENABLED: 'Delivery is currently not available',
      MERCHANT_LOCATION_NOT_SET: 'Delivery is not available (merchant location not configured)',
      INVALID_DELIVERY_COORDS: 'Invalid delivery address coordinates',
      OUT_OF_RANGE: details?.maxDistance ? `Delivery only available within ${details.maxDistance} km` : 'Delivery location is too far',
      OUT_OF_ZONE: 'This address is outside our delivery area',
      NO_ZONES_CONFIGURED: 'Delivery zones are not properly configured',
    };

    return messages[errorCode] || 'Delivery validation failed';
  }
}

export default DeliveryFeeService;
