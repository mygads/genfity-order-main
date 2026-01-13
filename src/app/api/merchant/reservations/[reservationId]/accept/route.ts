/**
 * Merchant Reservation Accept API
 * PUT /api/merchant/reservations/[reservationId]/accept
 *
 * Accepts a PENDING reservation. Table number requirement is merchant-configurable.
 * If reservation contains preorder items, creates an Order (ACCEPTED) with items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { ValidationError } from '@/lib/constants/errors';
import {
  isStoreOpenWithSpecialHoursForDateTime,
  isModeAvailableWithSchedulesForDateTime,
  type ExtendedMerchantStatus,
} from '@/lib/utils/storeStatus';

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

function safeString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) {
    throw new ValidationError(`Value is too long (max ${maxLen} chars)`);
  }
  return trimmed;
}

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getCurrentDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
}

function getCurrentTimeInTimezoneString(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function handlePut(req: NextRequest, context: AuthContext, routeContext: RouteContext) {
  try {
    const reservationIdResult = await requireBigIntRouteParam(routeContext, 'reservationId', 'Reservation ID is required');
    if (!reservationIdResult.ok) {
      return NextResponse.json(reservationIdResult.body, { status: reservationIdResult.status });
    }

    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID not found in context' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const tableNumber = safeString(body.tableNumber, 50);

    const reservationId = reservationIdResult.value;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          id: reservationId,
          merchantId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          merchant: {
            select: {
              id: true,
              code: true,
              timezone: true,
              enableTax: true,
              taxPercentage: true,
              enableServiceCharge: true,
              serviceChargePercent: true,
              enablePackagingFee: true,
              packagingFeeAmount: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new ValidationError('Reservation not found');
      }

      if (reservation.status !== 'PENDING') {
        throw new ValidationError('Reservation is not pending');
      }

      const tz = reservation.merchant?.timezone || 'Australia/Sydney';
      const today = getCurrentDateInTimezone(tz);
      const nowTime = getCurrentTimeInTimezoneString(tz);

      if (reservation.reservationDate < today || (reservation.reservationDate === today && reservation.reservationTime < nowTime)) {
        throw new ValidationError('Reservation time is in the past');
      }

      // Validate store + mode availability for the reservation time.
      const merchantForValidation = await tx.merchant.findUnique({
        where: { id: reservation.merchantId },
        include: {
          openingHours: true,
          modeSchedules: {
            where: { isActive: true },
          },
        },
      });

      if (!merchantForValidation) {
        throw new ValidationError('Merchant not found');
      }

      const requireTableNumberForDineIn = merchantForValidation.requireTableNumberForDineIn === true;
      if (requireTableNumberForDineIn && !tableNumber) {
        throw new ValidationError('tableNumber is required');
      }

      const specialHour = await tx.merchantSpecialHour.findUnique({
        where: {
          merchantId_date: {
            merchantId: reservation.merchantId,
            date: new Date(reservation.reservationDate),
          },
        },
      });

      const merchantStatus: ExtendedMerchantStatus = {
        isOpen: merchantForValidation.isOpen,
        isManualOverride: merchantForValidation.isManualOverride,
        timezone: tz,
        openingHours: (merchantForValidation.openingHours || []).map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
          is24Hours: (h as any).is24Hours,
        })),
        modeSchedules: (merchantForValidation.modeSchedules || []).map((s) => ({
          mode: s.mode as any,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        todaySpecialHour: null,
        isDineInEnabled: merchantForValidation.isDineInEnabled,
        isTakeawayEnabled: merchantForValidation.isTakeawayEnabled,
        isDeliveryEnabled: merchantForValidation.isDeliveryEnabled,
        dineInScheduleStart: merchantForValidation.dineInScheduleStart,
        dineInScheduleEnd: merchantForValidation.dineInScheduleEnd,
        takeawayScheduleStart: merchantForValidation.takeawayScheduleStart,
        takeawayScheduleEnd: merchantForValidation.takeawayScheduleEnd,
        deliveryScheduleStart: merchantForValidation.deliveryScheduleStart,
        deliveryScheduleEnd: merchantForValidation.deliveryScheduleEnd,
      };

      const storeRes = isStoreOpenWithSpecialHoursForDateTime(
        merchantStatus,
        reservation.reservationDate,
        reservation.reservationTime,
        specialHour
      );
      if (!storeRes.isOpen) {
        throw new ValidationError(storeRes.reason || 'Store is closed at the reservation time');
      }

      const modeRes = isModeAvailableWithSchedulesForDateTime(
        'DINE_IN',
        merchantStatus,
        reservation.reservationDate,
        reservation.reservationTime,
        specialHour
      );
      if (!modeRes.available) {
        throw new ValidationError(modeRes.reason || 'Dine-in is not available at the reservation time');
      }

      const preorder = reservation.preorder as any;
      const preorderItems: any[] = preorder?.items && Array.isArray(preorder.items) ? preorder.items : [];

      // Generate unique order number (merchant scoped)
      const maxRetries = 10;
      let attempt = 0;
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const merchantCode = (reservation.merchant?.code || 'ORD').toUpperCase();

      const generateCandidate = () => {
        let randomCode = '';
        for (let i = 0; i < 4; i++) {
          randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return `${merchantCode}-${randomCode}`;
      };

      let orderNumber = generateCandidate();
      while (attempt < maxRetries) {
        const exists = await tx.order.findFirst({
          where: { merchantId, orderNumber },
          select: { id: true },
        });
        if (!exists) break;
        attempt += 1;
        orderNumber = generateCandidate();
      }

      if (attempt >= maxRetries) {
        orderNumber = `${merchantCode}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      }

      const now = new Date();

      // If no preorder items, create an order stub (0 totals) without payment.
      if (!preorderItems.length) {
        const createdOrder = await tx.order.create({
          data: {
            merchantId,
            customerId: reservation.customerId,
            orderNumber,
            orderType: 'DINE_IN',
            tableNumber,
            status: 'ACCEPTED',
            subtotal: 0,
            taxAmount: 0,
            serviceChargeAmount: 0,
            packagingFeeAmount: 0,
            totalAmount: 0,
            notes: reservation.notes || null,
            isScheduled: false,
            scheduledDate: null,
            scheduledTime: null,
            stockDeductedAt: null,
          },
        });

        const updatedReservation = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: now,
            tableNumber,
            orderId: createdOrder.id,
          },
        });

        return {
          reservation: updatedReservation,
          order: createdOrder,
        };
      }

      // Validate + enrich preorder items at accept-time
      const normalizedItems = preorderItems
        .map((item) => ({
          menuId: BigInt(String(item.menuId)),
          quantity: Math.max(1, Number(item.quantity) || 1),
          notes: typeof item.notes === 'string' ? item.notes : null,
          addons: Array.isArray(item.addons)
            ? item.addons.map((a: any) => ({
                addonItemId: BigInt(String(a.addonItemId)),
                quantity: Math.max(1, Number(a.quantity) || 1),
              }))
            : [],
        }))
        .filter((i) => i.quantity > 0);

      const menuIds = Array.from(new Set(normalizedItems.map((i) => i.menuId.toString()))).map((s) => BigInt(s));
      const addonIds = Array.from(
        new Set(
          normalizedItems
            .flatMap((i) => i.addons)
            .map((a) => a.addonItemId.toString())
        )
      ).map((s) => BigInt(s));

      const [menus, addons] = await Promise.all([
        tx.menu.findMany({
          where: {
            id: { in: menuIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            trackStock: true,
            stockQty: true,
          },
        }),
        addonIds.length
          ? tx.addonItem.findMany({
              where: {
                id: { in: addonIds },
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                price: true,
                isActive: true,
                trackStock: true,
                stockQty: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const menuMap = new Map(menus.map((m) => [m.id.toString(), m]));
      const addonMap = new Map(addons.map((a) => [a.id.toString(), a]));

      // Stock requirements aggregated
      const menuRequired = new Map<string, { id: bigint; name: string; qty: number }>();
      const addonRequired = new Map<string, { id: bigint; name: string; qty: number }>();

      type AddonCreate = { addonItemId: bigint; addonName: string; addonPrice: any; quantity: number; subtotal: number };
      type ItemCreate = { menuId: bigint; menuName: string; menuPrice: number; quantity: number; subtotal: number; notes: string | null; addons: AddonCreate[] };

      const orderItemsData: ItemCreate[] = [];
      let subtotal = 0;

      for (const item of normalizedItems) {
        const menu = menuMap.get(item.menuId.toString());
        if (!menu || !menu.isActive) {
          throw new ValidationError('Some menu items are not available');
        }

        if (menu.trackStock && menu.stockQty !== null) {
          const key = menu.id.toString();
          const existing = menuRequired.get(key);
          menuRequired.set(key, { id: menu.id, name: menu.name, qty: (existing?.qty ?? 0) + item.quantity });
        }

        const menuPrice = round2(decimalToNumber(menu.price));
        let itemTotal = round2(menuPrice * item.quantity);

        const addonData: AddonCreate[] = [];
        for (const addon of item.addons) {
          const addonItem = addonMap.get(addon.addonItemId.toString());
          if (!addonItem || !addonItem.isActive) {
            throw new ValidationError('Some add-ons are not available');
          }

          if (addonItem.trackStock && addonItem.stockQty !== null) {
            const key = addonItem.id.toString();
            const existing = addonRequired.get(key);
            addonRequired.set(key, { id: addonItem.id, name: addonItem.name, qty: (existing?.qty ?? 0) + addon.quantity });
          }

          const addonPrice = round2(decimalToNumber(addonItem.price));
          const addonSubtotal = round2(addonPrice * addon.quantity);
          itemTotal = round2(itemTotal + addonSubtotal);

          addonData.push({
            addonItemId: addonItem.id,
            addonName: addonItem.name,
            addonPrice: addonItem.price,
            quantity: addon.quantity,
            subtotal: addonSubtotal,
          });
        }

        subtotal = round2(subtotal + itemTotal);

        orderItemsData.push({
          menuId: menu.id,
          menuName: menu.name,
          menuPrice,
          quantity: item.quantity,
          subtotal: itemTotal,
          notes: item.notes,
          addons: addonData,
        });
      }

      // Validate schedule formatting for data integrity
      if (!isValidHHMM(reservation.reservationTime)) {
        throw new ValidationError('Invalid reservation time');
      }

      // Stock checks and deductions (blocking)
      for (const required of menuRequired.values()) {
        const menu = menuMap.get(required.id.toString());
        if (!menu) {
          throw new ValidationError(`Menu item not found: ${required.name}`);
        }
        if (menu.stockQty !== null && menu.stockQty < required.qty) {
          throw new ValidationError(`Insufficient stock for ${required.name}`);
        }
        const res = await tx.menu.updateMany({
          where: {
            id: required.id,
            trackStock: true,
            stockQty: { gte: required.qty },
          },
          data: {
            stockQty: { decrement: required.qty },
          },
        });
        if (res.count !== 1) {
          throw new ValidationError(`Insufficient stock for ${required.name}`);
        }
      }

      for (const required of addonRequired.values()) {
        const addonItem = addonMap.get(required.id.toString());
        if (!addonItem) {
          throw new ValidationError(`Add-on item not found: ${required.name}`);
        }
        if (addonItem.stockQty !== null && addonItem.stockQty < required.qty) {
          throw new ValidationError(`Insufficient stock for ${required.name}`);
        }
        const res = await tx.addonItem.updateMany({
          where: {
            id: required.id,
            trackStock: true,
            stockQty: { gte: required.qty },
          },
          data: {
            stockQty: { decrement: required.qty },
          },
        });
        if (res.count !== 1) {
          throw new ValidationError(`Insufficient stock for ${required.name}`);
        }
      }

      // Keep isActive flags in sync for stock-tracked items
      for (const required of menuRequired.values()) {
        const updated = await tx.menu.findUnique({ where: { id: required.id }, select: { stockQty: true } });
        if (updated && updated.stockQty !== null) {
          await tx.menu.update({ where: { id: required.id }, data: { isActive: updated.stockQty > 0 } });
        }
      }

      for (const required of addonRequired.values()) {
        const updated = await tx.addonItem.findUnique({ where: { id: required.id }, select: { stockQty: true } });
        if (updated && updated.stockQty !== null) {
          await tx.addonItem.update({ where: { id: required.id }, data: { isActive: updated.stockQty > 0 } });
        }
      }

      // Fees and totals (same rules as public orders, but for DINE_IN)
      const taxPercentage = reservation.merchant?.enableTax && reservation.merchant.taxPercentage
        ? Number(reservation.merchant.taxPercentage)
        : 0;
      const taxAmount = round2(subtotal * (taxPercentage / 100));

      const serviceChargePercent = reservation.merchant?.enableServiceCharge && reservation.merchant.serviceChargePercent
        ? Number(reservation.merchant.serviceChargePercent)
        : 0;
      const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));

      const packagingFeeAmount = 0;
      const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount);

      const createdOrder = await tx.order.create({
        data: {
          merchantId,
          customerId: reservation.customerId,
          orderNumber,
          orderType: 'DINE_IN',
          tableNumber,
          status: 'ACCEPTED',
          subtotal,
          taxAmount,
          serviceChargeAmount,
          packagingFeeAmount,
          totalAmount,
          notes: reservation.notes || null,
          isScheduled: false,
          scheduledDate: null,
          scheduledTime: null,
          stockDeductedAt: now,
        },
      });

      // Create order items + addons
      for (const itemData of orderItemsData) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            menuId: itemData.menuId,
            menuName: itemData.menuName,
            menuPrice: itemData.menuPrice,
            quantity: itemData.quantity,
            subtotal: itemData.subtotal,
            notes: itemData.notes,
          },
        });

        if (itemData.addons.length > 0) {
          await tx.orderItemAddon.createMany({
            data: itemData.addons.map((a) => ({
              orderItemId: orderItem.id,
              addonItemId: a.addonItemId,
              addonName: a.addonName,
              addonPrice: a.addonPrice,
              quantity: a.quantity,
              subtotal: a.subtotal,
            })),
          });
        }
      }

      // Create a payment record (pending)
      if (totalAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: totalAmount,
            paymentMethod: 'CASH_ON_COUNTER',
            status: 'PENDING',
          },
        });
      }

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: now,
          tableNumber,
          orderId: createdOrder.id,
        },
      });

      return {
        reservation: updatedReservation,
        order: createdOrder,
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(result),
      message: 'Reservation accepted',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: error.message },
        { status: 400 }
      );
    }

    console.error('[PUT /api/merchant/reservations/[reservationId]/accept] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept reservation' },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
