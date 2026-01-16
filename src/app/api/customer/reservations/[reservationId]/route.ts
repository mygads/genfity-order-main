/**
 * Customer Reservation Detail API
 * GET /api/customer/reservations/:reservationId
 *
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only see their own reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { decimalToNumber, serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';
import { DeliveryFeeService } from '@/lib/services/DeliveryFeeService';

type ReservationPreorderAddon = {
  addonItemId: number | string;
  quantity?: number | null;
};

type ReservationPreorderItem = {
  menuId: number | string;
  quantity?: number | null;
  notes?: string | null;
  addons?: ReservationPreorderAddon[] | null;
};

type ReservationPreorder = {
  items?: ReservationPreorderItem[] | null;
  deliveryUnit?: string | null;
  deliveryAddress?: string | null;
  deliveryLatitude?: number | string | null;
  deliveryLongitude?: number | string | null;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseOrderTypeFromMode(mode: string | null): 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' {
  const normalized = String(mode || '').toLowerCase();
  if (normalized === 'takeaway') return 'TAKEAWAY';
  if (normalized === 'delivery') return 'DELIVERY';
  return 'DINE_IN';
}

function getPreorderItems(preorder: unknown): ReservationPreorderItem[] {
  if (!preorder || typeof preorder !== 'object') return [];
  const maybe = preorder as ReservationPreorder;
  return Array.isArray(maybe.items) ? maybe.items : [];
}

function getPreorderMeta(preorder: unknown): {
  deliveryUnit: string | null;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
} {
  if (!preorder || typeof preorder !== 'object') {
    return {
      deliveryUnit: null,
      deliveryAddress: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
    };
  }

  const maybe = preorder as ReservationPreorder;
  const lat = typeof maybe.deliveryLatitude === 'number'
    ? maybe.deliveryLatitude
    : typeof maybe.deliveryLatitude === 'string'
      ? Number(maybe.deliveryLatitude)
      : null;
  const lng = typeof maybe.deliveryLongitude === 'number'
    ? maybe.deliveryLongitude
    : typeof maybe.deliveryLongitude === 'string'
      ? Number(maybe.deliveryLongitude)
      : null;

  return {
    deliveryUnit: typeof maybe.deliveryUnit === 'string' ? maybe.deliveryUnit : null,
    deliveryAddress: typeof maybe.deliveryAddress === 'string' ? maybe.deliveryAddress : null,
    deliveryLatitude: Number.isFinite(lat) ? lat : null,
    deliveryLongitude: Number.isFinite(lng) ? lng : null,
  };
}

function toBigInt(value: unknown): bigint | null {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return BigInt(value);
    if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
    return null;
  } catch {
    return null;
  }
}

export const GET = withCustomer(async (
  request: NextRequest,
  context: CustomerAuthContext,
  routeContext
) => {
  try {
    const idResult = await requireBigIntRouteParam(routeContext, 'reservationId', 'Reservation ID is required');
    if (!idResult.ok) {
      return NextResponse.json(idResult.body, { status: idResult.status });
    }

    const id = idResult.value;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        customerId: context.customerId,
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            timezone: true,
            currency: true,
            enableTax: true,
            taxPercentage: true,
            enableServiceCharge: true,
            serviceChargePercent: true,
            enablePackagingFee: true,
            packagingFeeAmount: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            orderType: true,
            status: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    const order = reservation.order
      ? {
          orderNumber: reservation.order.orderNumber,
          mode:
            reservation.order.orderType === 'DINE_IN'
              ? 'dinein'
              : reservation.order.orderType === 'TAKEAWAY'
                ? 'takeaway'
                : 'delivery',
          status: reservation.order.status,
          trackingToken: createOrderTrackingToken({
            merchantCode: reservation.merchant.code,
            orderNumber: reservation.order.orderNumber,
          }),
        }
      : null;

    const orderType = parseOrderTypeFromMode(new URL(request.url).searchParams.get('mode'));
    const preorderItems = getPreorderItems(reservation.preorder);

    let preorderDetails: null | {
      orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
      isEstimated: boolean;
      items: Array<{
        menuId: bigint;
        menuName: string | null;
        quantity: number;
        unitPrice: number;
        notes: string | null;
        addons: Array<{
          addonItemId: bigint;
          addonName: string | null;
          unitPrice: number;
          quantity: number;
          subtotal: number;
        }>;
        subtotal: number;
      }>;
      delivery: null | {
        unit: string | null;
        address: string | null;
        latitude: number;
        longitude: number;
        distanceKm: number;
        feeAmount: number;
      };
      totals: {
        subtotal: number;
        taxAmount: number;
        serviceChargeAmount: number;
        packagingFeeAmount: number;
        deliveryFeeAmount: number;
        discountAmount: number;
        totalAmount: number;
      };
    } = null;

    if (preorderItems.length > 0) {
      const preorderMeta = getPreorderMeta(reservation.preorder);
      const menuIds = preorderItems
        .map((it) => toBigInt(it?.menuId))
        .filter((v): v is bigint => v !== null);

      const uniqueMenuIds = Array.from(new Set(menuIds.map((v) => v.toString()))).map((v) => BigInt(v));

      const menus = await prisma.menu.findMany({
        where: {
          id: { in: uniqueMenuIds },
          merchantId: reservation.merchantId,
        },
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          deletedAt: true,
        },
      });

      const menuMap = new Map(menus.map((m) => [m.id.toString(), m]));

      const allAddonIds = preorderItems.flatMap((it) =>
        Array.isArray(it?.addons)
          ? it.addons
              .map((a) => toBigInt(a?.addonItemId))
              .filter((v): v is bigint => v !== null)
          : []
      );

      const uniqueAddonIds = Array.from(new Set(allAddonIds.map((v) => v.toString()))).map((v) => BigInt(v));

      const addons = uniqueAddonIds.length > 0
        ? await prisma.addonItem.findMany({
            where: {
              id: { in: uniqueAddonIds },
              addonCategory: {
                merchantId: reservation.merchantId,
              },
            },
            select: {
              id: true,
              name: true,
              price: true,
              isActive: true,
              deletedAt: true,
            },
          })
        : [];

      const addonMap = new Map(addons.map((a) => [a.id.toString(), a]));

      const activePromoPrices = await SpecialPriceService.getActivePromoPrices(uniqueMenuIds);

      const displayItems: Array<{
        menuId: bigint;
        menuName: string | null;
        quantity: number;
        unitPrice: number;
        notes: string | null;
        addons: Array<{
          addonItemId: bigint;
          addonName: string | null;
          unitPrice: number;
          quantity: number;
          subtotal: number;
        }>;
        subtotal: number;
      }> = [];

      let subtotal = 0;

      for (const item of preorderItems) {
        const qty = Math.max(1, Number(item?.quantity ?? 1) || 1);
        const menuId = toBigInt(item.menuId);
        if (!menuId) {
          continue;
        }
        const menu = menuMap.get(menuId.toString());

        const menuName = menu?.name ?? null;
        const originalPrice = menu ? decimalToNumber(menu.price) : 0;
        const promoPrice = activePromoPrices.get(menuId.toString());
        const unitPrice = round2(promoPrice ?? originalPrice);

        const addonDetails: Array<{
          addonItemId: bigint;
          addonName: string | null;
          unitPrice: number;
          quantity: number;
          subtotal: number;
        }> = [];

        let lineTotal = round2(unitPrice * qty);

        const addonsForItem = Array.isArray(item?.addons) ? item.addons : [];
        for (const addon of addonsForItem) {
          const addonQty = Math.max(1, Number(addon?.quantity ?? 1) || 1);
          const addonItemId = toBigInt(addon?.addonItemId);
          if (!addonItemId) {
            continue;
          }
          const addonRow = addonMap.get(addonItemId.toString());

          const addonName = addonRow?.name ?? null;
          const addonUnitPrice = round2(addonRow ? decimalToNumber(addonRow.price) : 0);

          const addonSubtotal = round2(addonUnitPrice * addonQty * qty);
          lineTotal = round2(lineTotal + addonSubtotal);

          addonDetails.push({
            addonItemId,
            addonName,
            unitPrice: addonUnitPrice,
            quantity: addonQty,
            subtotal: addonSubtotal,
          });
        }

        subtotal = round2(subtotal + lineTotal);

        displayItems.push({
          menuId,
          menuName,
          quantity: qty,
          unitPrice,
          notes: item?.notes ?? null,
          addons: addonDetails,
          subtotal: lineTotal,
        });
      }

      const taxPercentage = reservation.merchant.enableTax && reservation.merchant.taxPercentage
        ? Number(reservation.merchant.taxPercentage)
        : 0;
      const taxAmount = round2(subtotal * (taxPercentage / 100));

      const serviceChargePercent = reservation.merchant.enableServiceCharge && reservation.merchant.serviceChargePercent
        ? Number(reservation.merchant.serviceChargePercent)
        : 0;
      const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));

      const packagingFeeAmount = ((orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && reservation.merchant.enablePackagingFee && reservation.merchant.packagingFeeAmount)
        ? round2(Number(reservation.merchant.packagingFeeAmount))
        : 0;

      let deliveryFeeAmount = 0;
      let delivery: null | {
        unit: string | null;
        address: string | null;
        latitude: number;
        longitude: number;
        distanceKm: number;
        feeAmount: number;
      } = null;

      if (orderType === 'DELIVERY' && preorderMeta.deliveryLatitude !== null && preorderMeta.deliveryLongitude !== null) {
        const feeRes = await DeliveryFeeService.validateAndCalculateFee(
          reservation.merchantId,
          preorderMeta.deliveryLatitude,
          preorderMeta.deliveryLongitude
        );

        if (feeRes.success && feeRes.data) {
          deliveryFeeAmount = round2(feeRes.data.feeAmount);
          delivery = {
            unit: preorderMeta.deliveryUnit,
            address: preorderMeta.deliveryAddress,
            latitude: preorderMeta.deliveryLatitude,
            longitude: preorderMeta.deliveryLongitude,
            distanceKm: feeRes.data.distanceKm,
            feeAmount: deliveryFeeAmount,
          };
        }
      }

      const discountAmount = 0;
      const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount + deliveryFeeAmount);

      preorderDetails = {
        orderType,
        isEstimated: reservation.status === 'PENDING',
        items: displayItems,
        delivery,
        totals: {
          subtotal,
          taxAmount,
          serviceChargeAmount,
          packagingFeeAmount,
          deliveryFeeAmount,
          discountAmount,
          totalAmount,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...reservation,
        order,
        preorderDetails,
      }),
      message: 'Reservation retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Get customer reservation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to load reservation',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
