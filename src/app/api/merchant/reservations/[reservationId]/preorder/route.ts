/**
 * Merchant Reservation Preorder API
 * GET /api/merchant/reservations/:reservationId/preorder
 *
 * Returns resolved preorder item details (menu + addons names/prices) for a reservation.
 * Used by admin UI to preview what customer preordered even when no Order exists yet.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, type AuthContext } from '@/lib/middleware/auth';
import { decimalToNumber, serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

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
};

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

function getPreorderItems(preorder: unknown): ReservationPreorderItem[] {
  if (!preorder || typeof preorder !== 'object') return [];
  const maybe = preorder as ReservationPreorder;
  return Array.isArray(maybe.items) ? maybe.items : [];
}

export const GET = withMerchant(async (_req, context: AuthContext, routeContext) => {
  const idResult = await requireBigIntRouteParam(routeContext, 'reservationId', 'Reservation ID is required');
  if (!idResult.ok) {
    return NextResponse.json(idResult.body, { status: idResult.status });
  }

  const reservationId = idResult.value;
  const merchantId = context.merchantId;

  if (!merchantId) {
    return NextResponse.json(
      { success: false, error: 'MERCHANT_ID_MISSING', message: 'Merchant ID not found in context' },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      merchantId,
    },
    select: {
      id: true,
      status: true,
      reservationDate: true,
      reservationTime: true,
      preorder: true,
      notes: true,
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          orderNumber: true,
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

  const preorderItems = getPreorderItems(reservation.preorder);

  const menuIds = preorderItems
    .map((it) => toBigInt(it?.menuId))
    .filter((v): v is bigint => v !== null);

  const uniqueMenuIds = Array.from(new Set(menuIds.map((v) => v.toString()))).map((v) => BigInt(v));

  const menus = uniqueMenuIds.length
    ? await prisma.menu.findMany({
        where: { id: { in: uniqueMenuIds }, merchantId },
        select: { id: true, name: true, price: true, isActive: true, deletedAt: true },
      })
    : [];

  const menuMap = new Map(menus.map((m) => [m.id.toString(), m]));

  const addonIds = preorderItems.flatMap((it) =>
    Array.isArray(it?.addons)
      ? it.addons
          .map((a) => toBigInt(a?.addonItemId))
          .filter((v): v is bigint => v !== null)
      : []
  );

  const uniqueAddonIds = Array.from(new Set(addonIds.map((v) => v.toString()))).map((v) => BigInt(v));

  const addons = uniqueAddonIds.length
    ? await prisma.addonItem.findMany({
        where: {
          id: { in: uniqueAddonIds },
          addonCategory: {
            merchantId,
          },
        },
        select: { id: true, name: true, price: true, isActive: true, deletedAt: true },
      })
    : [];

  const addonMap = new Map(addons.map((a) => [a.id.toString(), a]));

  const resolvedItems = preorderItems.map((it) => {
    const menuId = toBigInt(it?.menuId);
    const menu = menuId ? menuMap.get(menuId.toString()) : undefined;

    const resolvedAddons = Array.isArray(it?.addons)
      ? it.addons.map((a) => {
          const addonId = toBigInt(a?.addonItemId);
          const addon = addonId ? addonMap.get(addonId.toString()) : undefined;
          return {
            addonItemId: addonId,
            addonName: addon?.name ?? null,
            quantity: Math.max(1, Number(a?.quantity ?? 1) || 1),
            unitPrice: addon ? decimalToNumber(addon.price) : 0,
            isAvailable: Boolean(addon && addon.isActive && !addon.deletedAt),
          };
        })
      : [];

    return {
      menuId,
      menuName: menu?.name ?? null,
      quantity: Math.max(1, Number(it?.quantity ?? 1) || 1),
      notes: typeof it?.notes === 'string' ? it.notes : null,
      unitPrice: menu ? decimalToNumber(menu.price) : 0,
      isAvailable: Boolean(menu && menu.isActive && !menu.deletedAt),
      addons: resolvedAddons,
    };
  });

  const payload = {
    reservation: {
      id: reservation.id,
      status: reservation.status,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      notes: reservation.notes,
      customer: reservation.customer,
      order: reservation.order,
    },
    preorder: {
      items: resolvedItems,
    },
  };

  return NextResponse.json({
    success: true,
    data: serializeBigInt(payload),
  });
});
