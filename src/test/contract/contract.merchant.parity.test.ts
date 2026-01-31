import { describe, expect, it } from 'vitest';
import type { $Enums } from '@prisma/client';
import prisma from '@/lib/db/client';
import {
  CONTRACT_CUSTOMER_EMAIL,
  CONTRACT_CUSTOMER_NAME,
  CONTRACT_CUSTOMER_PHONE,
  CONTRACT_GO_BASE,
  CONTRACT_MENU_ID,
  CONTRACT_MERCHANT_ACCESS_TOKEN,
  CONTRACT_MERCHANT_CODE,
  CONTRACT_MERCHANT_EMAIL,
  CONTRACT_MERCHANT_PASSWORD,
  CONTRACT_NEXT_BASE,
  CONTRACT_ORDER_TYPE,
  CONTRACT_PARTY_SIZE,
  CONTRACT_PAYMENT_METHOD,
  CONTRACT_QUANTITY,
  CONTRACT_RESERVATION_DATE,
  CONTRACT_RESERVATION_TIME,
  getJson,
  getJsonWithAuth,
  getMerchantAccessToken,
  getTextWithAuth,
  postTextWithAuth,
  hasRequired,
  postJsonWithAuth,
  putJsonWithAuth,
  patchJsonWithAuth,
  deleteJsonWithAuth,
  postJson,
  toNumber,
} from '@/test/contract/helpers';

type CreatedOrder = {
  orderNumber: string;
  trackingToken: string;
};

type MerchantRecord = Record<string, unknown>;

type ReservationRow = {
  reservationDate?: string | null;
  reservationTime?: string | null;
  customer?: { email?: string | null } | null;
};

type OrderDetailRow = Record<string, unknown>;

type ReservationCountPayload = {
  pending?: number | null;
  active?: number | null;
};

type MerchantSnapshot = {
  merchantId: bigint;
  isOpen: boolean;
  balanceId?: bigint | null;
  balanceValue?: number | null;
  subscription?: {
    id: bigint;
    type: $Enums.SubscriptionType;
    status: $Enums.SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    suspendedAt: Date | null;
    suspendReason: string | null;
  } | null;
};

type VoucherFixture = {
  id: bigint;
  code: string;
  merchantId: bigint;
};

type ReservationSettingsSnapshot = {
  merchantId: bigint;
  isReservationEnabled: boolean;
  reservationMenuRequired: boolean;
  reservationMinItemCount: number;
};

function formatDateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
}

function addDaysISO(dateISO: string, days: number, timeZone: string): string {
  const [y, m, d] = dateISO.split('-').map((n) => Number(n));
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return formatDateInTimezone(next, timeZone);
}

function resolveFutureReservationDate(timeZone: string): string {
  const today = formatDateInTimezone(new Date(), timeZone);
  const envDate = typeof CONTRACT_RESERVATION_DATE === 'string'
    ? CONTRACT_RESERVATION_DATE.trim()
    : '';
  const minSafe = formatDateInTimezone(new Date(Date.now() + 48 * 60 * 60 * 1000), timeZone);
  if (envDate && envDate >= minSafe) return envDate;
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return formatDateInTimezone(future, timeZone);
}

async function fetchMerchant(baseUrl: string, code: string) {
  const res = await getJson(`${baseUrl}/api/public/merchants/${code}`);
  if (!res.json?.success) return null;
  return res.json?.data as MerchantRecord;
}

async function fetchVoucherTemplateId(baseUrl: string, token: string): Promise<string | null> {
  const res = await getJsonWithAuth(`${baseUrl}/api/merchant/order-vouchers/templates`, token);
  if (!res.json?.success) return null;
  const templates = Array.isArray(res.json?.data) ? res.json?.data : [];
  if (templates.length === 0) return null;
  return String((templates[0] as Record<string, unknown>).id ?? '') || null;
}

async function snapshotMerchantState(merchantCode: string): Promise<MerchantSnapshot> {
  const merchant = await prisma.merchant.findUnique({
    where: { code: merchantCode },
    include: { merchantBalance: true, subscription: true },
  });

  if (!merchant) {
    throw new Error('Merchant not found for voucher fixture');
  }

  return {
    merchantId: merchant.id,
    isOpen: merchant.isOpen,
    balanceId: merchant.merchantBalance?.id ?? null,
    balanceValue: merchant.merchantBalance ? Number(merchant.merchantBalance.balance) : null,
    subscription: merchant.subscription
      ? {
          id: merchant.subscription.id,
          type: merchant.subscription.type,
          status: merchant.subscription.status,
          currentPeriodStart: merchant.subscription.currentPeriodStart,
          currentPeriodEnd: merchant.subscription.currentPeriodEnd,
          suspendedAt: merchant.subscription.suspendedAt,
          suspendReason: merchant.subscription.suspendReason,
        }
      : null,
  };
}

async function restoreMerchantState(snapshot: MerchantSnapshot) {
  if (snapshot.balanceId) {
    await prisma.merchantBalance.update({
      where: { id: snapshot.balanceId },
      data: { balance: snapshot.balanceValue ?? 0 },
    });
  } else {
    await prisma.merchantBalance.deleteMany({ where: { merchantId: snapshot.merchantId } });
  }

  if (snapshot.subscription) {
    await prisma.merchantSubscription.update({
      where: { id: snapshot.subscription.id },
      data: {
        type: snapshot.subscription.type,
        status: snapshot.subscription.status,
        currentPeriodStart: snapshot.subscription.currentPeriodStart,
        currentPeriodEnd: snapshot.subscription.currentPeriodEnd,
        suspendedAt: snapshot.subscription.suspendedAt,
        suspendReason: snapshot.subscription.suspendReason,
      },
    });
  } else {
    await prisma.merchantSubscription.deleteMany({ where: { merchantId: snapshot.merchantId } });
  }

  await prisma.merchant.update({
    where: { id: snapshot.merchantId },
    data: { isOpen: snapshot.isOpen },
  });
}

async function snapshotReservationSettings(
  merchantCode: string,
): Promise<ReservationSettingsSnapshot> {
  const merchant = await prisma.merchant.findUnique({
    where: { code: merchantCode },
    select: {
      id: true,
      isReservationEnabled: true,
      reservationMenuRequired: true,
      reservationMinItemCount: true,
    },
  });

  if (!merchant) {
    throw new Error('Merchant not found for reservation setup');
  }

  return {
    merchantId: merchant.id,
    isReservationEnabled: merchant.isReservationEnabled === true,
    reservationMenuRequired: merchant.reservationMenuRequired === true,
    reservationMinItemCount: Number(merchant.reservationMinItemCount ?? 0),
  };
}

async function restoreReservationSettings(snapshot: ReservationSettingsSnapshot) {
  await prisma.merchant.update({
    where: { id: snapshot.merchantId },
    data: {
      isReservationEnabled: snapshot.isReservationEnabled,
      reservationMenuRequired: snapshot.reservationMenuRequired,
      reservationMinItemCount: snapshot.reservationMinItemCount,
    },
  });
}

async function ensureReservationEnabled(merchantCode: string): Promise<ReservationSettingsSnapshot> {
  const snapshot = await snapshotReservationSettings(merchantCode);

  await prisma.merchant.update({
    where: { id: snapshot.merchantId },
    data: {
      isReservationEnabled: true,
      reservationMenuRequired: false,
      reservationMinItemCount: 0,
    },
  });

  return snapshot;
}

async function getMerchantOwnerUserId(merchantId: bigint): Promise<bigint | null> {
  const owner = await prisma.merchantUser.findFirst({
    where: { merchantId, role: 'OWNER', isActive: true },
    select: { userId: true },
  });
  return owner?.userId ?? null;
}

async function createVoucherFixture(merchantCode: string, codePrefix: string): Promise<VoucherFixture> {
  const merchant = await prisma.merchant.findUnique({
    where: { code: merchantCode },
    select: { id: true, currency: true },
  });

  if (!merchant) {
    throw new Error('Merchant not found for voucher fixture');
  }

  const ownerUserId = await getMerchantOwnerUserId(merchant.id);
  if (!ownerUserId) {
    throw new Error('Merchant owner not found for voucher fixture');
  }

  const code = `${codePrefix}${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();

  const voucher = await prisma.voucher.create({
    data: {
      code,
      type: 'BALANCE',
      value: 0,
      currency: merchant.currency,
      maxUsage: 1,
      currentUsage: 0,
      isActive: true,
      createdByUserId: ownerUserId,
    },
  });

  return { id: voucher.id, code: voucher.code, merchantId: merchant.id };
}

async function cleanupVoucherFixture(fixture: VoucherFixture) {
  await prisma.voucherRedemption.deleteMany({ where: { voucherId: fixture.id } });
  await prisma.balanceTransaction.deleteMany({
    where: {
      balance: { merchantId: fixture.merchantId },
      description: { contains: `Voucher redemption: ${fixture.code}` },
    },
  });
  await prisma.subscriptionHistory.deleteMany({
    where: {
      merchantId: fixture.merchantId,
      metadata: { path: ['flowId'], equals: `voucher-${fixture.code}` },
    },
  });
  await prisma.voucher.delete({ where: { id: fixture.id } });
}

async function createVoucherCode(
  baseUrl: string,
  token: string,
  templateId: string,
  manualCode: string,
) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/order-vouchers/templates/${templateId}/codes`,
    { manualCode },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const codes = Array.isArray(res.json?.data) ? res.json?.data : [];
  const matched = codes.find((row) => String((row as Record<string, unknown>).code ?? '') === manualCode);
  const target = (matched ?? codes[0] ?? {}) as Record<string, unknown>;
  return {
    id: String(target.id ?? ''),
    code: String(target.code ?? manualCode),
    isActive: Boolean(target.isActive ?? true),
  };
}

function buildOrderPayload() {
  return {
    merchantCode: CONTRACT_MERCHANT_CODE,
    customerName: CONTRACT_CUSTOMER_NAME,
    customerEmail: CONTRACT_CUSTOMER_EMAIL,
    customerPhone: CONTRACT_CUSTOMER_PHONE,
    orderType: CONTRACT_ORDER_TYPE,
    paymentMethod: CONTRACT_PAYMENT_METHOD,
    items: [
      {
        menuId: CONTRACT_MENU_ID,
        quantity: Number.isFinite(CONTRACT_QUANTITY) && CONTRACT_QUANTITY > 0 ? CONTRACT_QUANTITY : 1,
      },
    ],
  };
}

async function createPublicOrder(baseUrl: string): Promise<CreatedOrder> {
  const res = await postJson(`${baseUrl}/api/public/orders`, buildOrderPayload());
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    orderNumber: String(data.orderNumber ?? ''),
    trackingToken: String(data.trackingToken ?? ''),
  };
}

async function createPublicReservation(
  baseUrl: string,
  reservationDate: string,
  reservationTime: string,
) {
  const payload = {
    merchantCode: CONTRACT_MERCHANT_CODE,
    customerName: CONTRACT_CUSTOMER_NAME,
    customerEmail: CONTRACT_CUSTOMER_EMAIL,
    customerPhone: CONTRACT_CUSTOMER_PHONE,
    partySize: CONTRACT_PARTY_SIZE,
    reservationDate,
    reservationTime,
    notes: 'Contract reservation',
    items: [
      {
        menuId: CONTRACT_MENU_ID,
        quantity: 1,
      },
    ],
  };

  const res = await postJson(`${baseUrl}/api/public/reservations`, payload);
  expect(res.status).toBeGreaterThanOrEqual(200);
  if (!res.json?.success) {
    throw new Error(
      `Public reservation failed (${res.status}): ${JSON.stringify(res.json)}`,
    );
  }
}

async function createMerchantCategory(baseUrl: string, token: string, name: string) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/categories`,
    { name },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
  };
}

async function deleteMerchantCategory(baseUrl: string, token: string, id: string) {
  const res = await deleteJsonWithAuth(
    `${baseUrl}/api/merchant/categories/${id}`,
    {},
    token,
  );
  expect(res.status).toBeGreaterThanOrEqual(200);
  return res;
}

async function createMerchantMenu(
  baseUrl: string,
  token: string,
  payload?: {
    name?: string;
    price?: number;
    trackStock?: boolean;
    stockQty?: number;
    dailyStockTemplate?: number;
    autoResetStock?: boolean;
  },
) {
  const body = {
    name: payload?.name ?? `Contract Menu ${Date.now()}`,
    price: payload?.price ?? 12.5,
    ...(payload?.trackStock !== undefined ? { trackStock: payload.trackStock } : {}),
    ...(payload?.stockQty !== undefined ? { stockQty: payload.stockQty } : {}),
    ...(payload?.dailyStockTemplate !== undefined
      ? { dailyStockTemplate: payload.dailyStockTemplate }
      : {}),
    ...(payload?.autoResetStock !== undefined
      ? { autoResetStock: payload.autoResetStock }
      : {}),
  };

  const res = await postJsonWithAuth(`${baseUrl}/api/merchant/menu`, body, token);

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? body.name),
    price: toNumber(data.price ?? body.price),
  };
}

async function deleteMerchantMenu(baseUrl: string, token: string, id: string) {
  const res = await deleteJsonWithAuth(`${baseUrl}/api/merchant/menu/${id}`, {}, token);
  expect(res.status).toBeGreaterThanOrEqual(200);
  return res;
}

async function createMenuBook(baseUrl: string, token: string, name: string, menuIds?: string[]) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/menu-books`,
    { name, menuIds: menuIds ?? [] },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? name),
  };
}

async function deleteMenuBook(baseUrl: string, token: string, id: string) {
  const res = await deleteJsonWithAuth(`${baseUrl}/api/merchant/menu-books/${id}`, {}, token);
  expect(res.status).toBeGreaterThanOrEqual(200);
  return res;
}

async function createAddonCategory(baseUrl: string, token: string, name: string) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/addon-categories`,
    { name },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
  };
}

async function deleteAddonCategory(baseUrl: string, token: string, id: string) {
  const res = await deleteJsonWithAuth(
    `${baseUrl}/api/merchant/addon-categories/${id}`,
    {},
    token,
  );
  expect(res.status).toBeGreaterThanOrEqual(200);
  return res;
}

async function createAddonItem(
  baseUrl: string,
  token: string,
  addonCategoryId: string,
  name: string,
) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/addon-items`,
    { addonCategoryId, name, price: 1.25 },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
  };
}

async function deleteAddonItem(baseUrl: string, token: string, id: string) {
  const res = await deleteJsonWithAuth(
    `${baseUrl}/api/merchant/addon-items/${id}`,
    {},
    token,
  );
  expect(res.status).toBeGreaterThanOrEqual(200);
  return res;
}

function assertAddonCategoryShape(data: Record<string, unknown>) {
  expect(typeof data.name).toBe('string');
  expect(typeof data.isActive).toBe('boolean');

  const minSelection = toNumber(data.minSelection);
  if (minSelection !== null) {
    expect(minSelection).toBeGreaterThanOrEqual(0);
  }

  const count = data._count as Record<string, unknown> | undefined;
  if (count) {
    const addonItems = toNumber(count.addonItems);
    const menuAddonCategories = toNumber(count.menuAddonCategories);
    if (addonItems !== null) {
      expect(addonItems).toBeGreaterThanOrEqual(0);
    }
    if (menuAddonCategories !== null) {
      expect(menuAddonCategories).toBeGreaterThanOrEqual(0);
    }
  }

  const addonItems = Array.isArray(data.addonItems) ? data.addonItems : [];
  if (addonItems.length > 0) {
    const first = addonItems[0] as Record<string, unknown>;
    assertAddonItemShape(first);
  }
}

function assertAddonItemShape(data: Record<string, unknown>) {
  expect(typeof data.name).toBe('string');
  expect(typeof data.isActive).toBe('boolean');
  expect(typeof data.trackStock).toBe('boolean');
  expect(typeof data.inputType).toBe('string');

  const price = toNumber(data.price);
  expect(price).not.toBeNull();

  const displayOrder = toNumber(data.displayOrder);
  if (displayOrder !== null) {
    expect(displayOrder).toBeGreaterThanOrEqual(0);
  }

  const addonCategory = data.addonCategory as Record<string, unknown> | undefined;
  if (addonCategory) {
    expect(typeof addonCategory.name).toBe('string');
  }
}

async function getBulkAddonCategoryToken(baseUrl: string, token: string, ids: string[]) {
  const res = await getJsonWithAuth(
    `${baseUrl}/api/merchant/addon-categories/bulk-soft-delete?ids=${ids.join(',')}`,
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return String(data.confirmationToken ?? '');
}

async function getBulkAddonItemToken(baseUrl: string, token: string, ids: string[]) {
  const res = await getJsonWithAuth(
    `${baseUrl}/api/merchant/addon-items/bulk-soft-delete?ids=${ids.join(',')}`,
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return String(data.confirmationToken ?? '');
}

async function getBulkMenuToken(baseUrl: string, token: string, ids: string[]) {
  const res = await getJsonWithAuth(
    `${baseUrl}/api/merchant/menu/bulk-soft-delete?ids=${ids.join(',')}`,
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return String(data.confirmationToken ?? '');
}

async function bulkUploadAddonItems(
  baseUrl: string,
  token: string,
  items: Array<{ addonCategoryId: string; name: string; price: number }>,
) {
  const res = await postJsonWithAuth(
    `${baseUrl}/api/merchant/addon-items/bulk-upload`,
    { items, upsertByName: true },
    token,
  );

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  return res.json ?? {};
}

async function fetchOpeningHoursFromProfile(baseUrl: string, token: string) {
  const res = await getJsonWithAuth(`${baseUrl}/api/merchant/profile`, token);
  if (!res.json?.success) return [];
  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  return Array.isArray(data.openingHours) ? data.openingHours : [];
}

async function restoreOpeningHours(baseUrl: string, token: string, openingHours: unknown[]) {
  if (!openingHours || openingHours.length === 0) return;
  await putJsonWithAuth(
    `${baseUrl}/api/merchant/opening-hours`,
    { openingHours },
    token,
  );
}

async function cleanupSpecialHoursByDate(
  baseUrl: string,
  token: string,
  dateISO: string,
) {
  const list = await getJsonWithAuth(
    `${baseUrl}/api/merchant/special-hours?from=${dateISO}&to=${dateISO}`,
    token,
  );
  if (!list.json?.success) return;

  const items = Array.isArray(list.json?.data) ? list.json?.data : [];
  await Promise.all(
    items.map((item) => {
      const id = String((item as Record<string, unknown>).id ?? '');
      if (!id) return Promise.resolve();
      return deleteJsonWithAuth(`${baseUrl}/api/merchant/special-hours/${id}`, {}, token);
    }),
  );
}

async function cleanupModeSchedules(
  baseUrl: string,
  token: string,
  mode: string,
  dayOfWeek: number,
) {
  await deleteJsonWithAuth(
    `${baseUrl}/api/merchant/mode-schedules?mode=${mode}&dayOfWeek=${dayOfWeek}&disableIfEmpty=true`,
    {},
    token,
  );
}

function expectNumbersClose(nextValue: number | null, goValue: number | null, tolerance = 0.01) {
  if (nextValue === null || goValue === null) return;
  expect(Math.abs(nextValue - goValue)).toBeLessThanOrEqual(tolerance);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  fields.push(current);
  return fields;
}

function parseCsvRows(csv: string): string[][] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.map((line) => parseCsvLine(line));
}

function isValidCsvDate(value: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim());
}

function isValidCsvTime(value: string): boolean {
  return /^\d{1,2}:\d{2}/.test(value.trim());
}

function isValidCsvNumber(value: string): boolean {
  const cleaned = value.replace(/[^0-9\-]/g, '');
  if (!cleaned) return false;
  return Number.isFinite(Number(cleaned));
}

function snapshotType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function normalizeNumberRange(value: unknown, min: number, max: number): string {
  const num = toNumber(value);
  if (num === null) return 'non-number';
  if (num < min || num > max) return 'out-of-range';
  return `number:${min}-${max}`;
}

function normalizeNonNegativeNumber(value: unknown): string {
  const num = toNumber(value);
  if (num === null) return 'non-number';
  if (num < 0) return 'out-of-range';
  return 'number:>=0';
}

function normalizeOptionalRange(value: unknown, min: number, max: number): string {
  const num = toNumber(value);
  if (num === null) return `number:${min}-${max}|null`;
  expect(num).toBeGreaterThanOrEqual(min);
  expect(num).toBeLessThanOrEqual(max);
  return `number:${min}-${max}|null`;
}

function normalizeOptionalNonNegative(value: unknown): string {
  const num = toNumber(value);
  if (num === null) return 'number:>=0|null';
  expect(num).toBeGreaterThanOrEqual(0);
  return 'number:>=0|null';
}

function normalizeFeedbackListSnapshot(payload: Record<string, unknown>) {
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  return {
    success: payload.success === true,
    dataType: Array.isArray(payload.data) ? 'array' : typeof payload.data,
    meta: {
      page: snapshotType(meta.page),
      limit: snapshotType(meta.limit),
      totalCount: snapshotType(meta.totalCount),
      totalPages: snapshotType(meta.totalPages),
    },
  };
}

function normalizeFeedbackAnalyticsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const meta = (payload.meta ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      summary: {
        totalFeedback: normalizeNonNegativeNumber(summary.totalFeedback),
        averageOverallRating: normalizeNumberRange(summary.averageOverallRating, 0, 5),
        averageServiceRating: normalizeOptionalRange(summary.averageServiceRating, 0, 5),
        averageFoodRating: normalizeOptionalRange(summary.averageFoodRating, 0, 5),
        averageCompletionTime: normalizeOptionalNonNegative(summary.averageCompletionTime),
      },
      sentimentDistribution: Array.isArray(data.sentimentDistribution)
        ? 'array'
        : snapshotType(data.sentimentDistribution),
      topTags: Array.isArray(data.topTags) ? 'array' : snapshotType(data.topTags),
      ratingDistribution: Array.isArray(data.ratingDistribution)
        ? 'array'
        : snapshotType(data.ratingDistribution),
      recentTrends: Array.isArray(data.recentTrends) ? 'array' : snapshotType(data.recentTrends),
    },
    meta: {
      period: snapshotType(meta.period),
      startDate: snapshotType(meta.startDate),
      endDate: snapshotType(meta.endDate),
      timezone: snapshotType(meta.timezone),
    },
  };
}

function normalizeCustomerAnalyticsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const segmentation = (data.segmentation ?? {}) as Record<string, unknown>;
  const meta = (payload.meta ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      summary: {
        totalCustomers: normalizeNonNegativeNumber(summary.totalCustomers),
        newCustomers: normalizeNonNegativeNumber(summary.newCustomers),
        returningCustomers: normalizeNonNegativeNumber(summary.returningCustomers),
        averageOrdersPerCustomer: normalizeNonNegativeNumber(summary.averageOrdersPerCustomer),
        averageLifetimeValue: normalizeNonNegativeNumber(summary.averageLifetimeValue),
        retentionRate: normalizeNumberRange(summary.retentionRate, 0, 100),
      },
      segmentation: {
        new: normalizeNonNegativeNumber(segmentation.new),
        casual: normalizeNonNegativeNumber(segmentation.casual),
        regular: normalizeNonNegativeNumber(segmentation.regular),
        vip: normalizeNonNegativeNumber(segmentation.vip),
      },
      customerGrowth: Array.isArray(data.customerGrowth) ? 'array' : snapshotType(data.customerGrowth),
      orderFrequency: Array.isArray(data.orderFrequency) ? 'array' : snapshotType(data.orderFrequency),
      topCustomers: Array.isArray(data.topCustomers) ? 'array' : snapshotType(data.topCustomers),
      customerRetention: Array.isArray(data.customerRetention)
        ? 'array'
        : snapshotType(data.customerRetention),
    },
    meta: {
      period: snapshotType(meta.period),
      startDate: snapshotType(meta.startDate),
      endDate: snapshotType(meta.endDate),
    },
  };
}

function normalizeMenuPerformanceAnalyticsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const meta = (payload.meta ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      summary: {
        totalMenuItems: normalizeNonNegativeNumber(summary.totalMenuItems),
        activeItems: normalizeNonNegativeNumber(summary.activeItems),
        totalItemsSold: normalizeNonNegativeNumber(summary.totalItemsSold),
        totalRevenue: normalizeNonNegativeNumber(summary.totalRevenue),
        averageItemRevenue: normalizeNonNegativeNumber(summary.averageItemRevenue),
      },
      topPerformers: Array.isArray(data.topPerformers) ? 'array' : snapshotType(data.topPerformers),
      lowPerformers: Array.isArray(data.lowPerformers) ? 'array' : snapshotType(data.lowPerformers),
      categoryPerformance: Array.isArray(data.categoryPerformance)
        ? 'array'
        : snapshotType(data.categoryPerformance),
      addonPerformance: Array.isArray(data.addonPerformance) ? 'array' : snapshotType(data.addonPerformance),
      salesTrendByItem: Array.isArray(data.salesTrendByItem) ? 'array' : snapshotType(data.salesTrendByItem),
      neverOrdered: Array.isArray(data.neverOrdered) ? 'array' : snapshotType(data.neverOrdered),
    },
    meta: {
      period: snapshotType(meta.period),
      startDate: snapshotType(meta.startDate),
      endDate: snapshotType(meta.endDate),
      daysInPeriod: snapshotType(meta.daysInPeriod),
    },
  };
}

function normalizeSalesAnalyticsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const customerMetrics = (data.customerMetrics ?? {}) as Record<string, unknown>;
  const meta = (payload.meta ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      summary: {
        totalRevenue: normalizeNonNegativeNumber(summary.totalRevenue),
        totalOrders: normalizeNonNegativeNumber(summary.totalOrders),
        averageOrderValue: normalizeNonNegativeNumber(summary.averageOrderValue),
        completedOrders: normalizeNonNegativeNumber(summary.completedOrders),
        cancelledOrders: normalizeNonNegativeNumber(summary.cancelledOrders),
        completionRate: normalizeNumberRange(summary.completionRate, 0, 100),
      },
      customerMetrics: {
        totalCustomers: normalizeNonNegativeNumber(customerMetrics.totalCustomers),
        newCustomers: normalizeNonNegativeNumber(customerMetrics.newCustomers),
        returningCustomers: normalizeNonNegativeNumber(customerMetrics.returningCustomers),
        repeatPurchaseRate: normalizeNumberRange(customerMetrics.repeatPurchaseRate, 0, 100),
        averageOrdersPerCustomer: normalizeNonNegativeNumber(customerMetrics.averageOrdersPerCustomer),
      },
      cohortRetention: Array.isArray(data.cohortRetention) ? 'array' : snapshotType(data.cohortRetention),
      revenueTrend: Array.isArray(data.revenueTrend) ? 'array' : snapshotType(data.revenueTrend),
      topSellingItems: Array.isArray(data.topSellingItems) ? 'array' : snapshotType(data.topSellingItems),
      peakHours: Array.isArray(data.peakHours) ? 'array' : snapshotType(data.peakHours),
      ordersByStatus: Array.isArray(data.ordersByStatus) ? 'array' : snapshotType(data.ordersByStatus),
      paymentMethods: Array.isArray(data.paymentMethods) ? 'array' : snapshotType(data.paymentMethods),
      orderTypes: Array.isArray(data.orderTypes) ? 'array' : snapshotType(data.orderTypes),
      categoryMix: Array.isArray(data.categoryMix) ? 'array' : snapshotType(data.categoryMix),
    },
    meta: {
      period: snapshotType(meta.period),
      startDate: snapshotType(meta.startDate),
      endDate: snapshotType(meta.endDate),
      timezone: snapshotType(meta.timezone),
      scope: snapshotType(meta.scope),
    },
  };
}

function normalizeRevenueSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const dateRange = (data.dateRange ?? {}) as Record<string, unknown>;
  const merchant = (data.merchant ?? {}) as Record<string, unknown>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      dateRange: {
        startDate: snapshotType(dateRange.startDate),
        endDate: snapshotType(dateRange.endDate),
      },
      merchant: {
        currency: snapshotType(merchant.currency),
      },
      summary: {
        totalOrders: normalizeNonNegativeNumber(summary.totalOrders),
        totalRevenue: normalizeNonNegativeNumber(summary.totalRevenue),
        totalTax: normalizeNonNegativeNumber(summary.totalTax),
        totalServiceCharge: normalizeNonNegativeNumber(summary.totalServiceCharge),
        totalPackagingFee: normalizeNonNegativeNumber(summary.totalPackagingFee),
        grandTotal: normalizeNonNegativeNumber(summary.grandTotal),
        averageOrderValue: normalizeNonNegativeNumber(summary.averageOrderValue),
      },
      dailyRevenue: Array.isArray(data.dailyRevenue) ? 'array' : snapshotType(data.dailyRevenue),
      orderStatusBreakdown: Array.isArray(data.orderStatusBreakdown)
        ? 'array'
        : snapshotType(data.orderStatusBreakdown),
      orderTypeBreakdown: Array.isArray(data.orderTypeBreakdown)
        ? 'array'
        : snapshotType(data.orderTypeBreakdown),
      topMenuItems: Array.isArray(data.topMenuItems) ? 'array' : snapshotType(data.topMenuItems),
      hourlyDistribution: Array.isArray(data.hourlyDistribution)
        ? 'array'
        : snapshotType(data.hourlyDistribution),
    },
  };
}

function normalizeMenuAddonCategorySnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  return {
    success: payload.success === true,
    data: {
      menuId: snapshotType(data.menuId),
      addonCategoryId: snapshotType(data.addonCategoryId),
      displayOrder: normalizeNonNegativeNumber(data.displayOrder),
      isRequired: snapshotType(data.isRequired),
    },
  };
}

function normalizeMenuCategoriesUpdateSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  return {
    success: payload.success === true,
    dataType: snapshotType(data),
    menuId: snapshotType(data.id),
    categoriesType: Array.isArray((data as Record<string, unknown>).categories) ? 'array' : 'unknown',
  };
}

function normalizeMenuDuplicateSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  return {
    success: payload.success === true,
    dataType: snapshotType(data),
    menuId: snapshotType(data.id),
    nameType: snapshotType(data.name),
  };
}

function normalizePosSettingsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const customItems = (data.customItems ?? {}) as Record<string, unknown>;
  const editOrder = (data.editOrder ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      customItems: {
        enabled: snapshotType(customItems.enabled),
        maxNameLength: normalizeOptionalRange(customItems.maxNameLength, 10, 200),
        maxPrice: normalizeOptionalNonNegative(customItems.maxPrice),
      },
      editOrder: {
        enabled: snapshotType(editOrder.enabled),
      },
    },
  };
}

function normalizePaymentSettingsSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const settings = (data.settings ?? {}) as Record<string, unknown>;
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const sample = (accounts[0] ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    data: {
      settings: {
        payAtCashierEnabled: snapshotType(settings.payAtCashierEnabled),
        manualTransferEnabled: snapshotType(settings.manualTransferEnabled),
        qrisEnabled: snapshotType(settings.qrisEnabled),
        requirePaymentProof: snapshotType(settings.requirePaymentProof),
        qrisImageUrl: snapshotType(settings.qrisImageUrl),
        qrisImageMeta: snapshotType(settings.qrisImageMeta),
        qrisImageUploadedAt: snapshotType(settings.qrisImageUploadedAt),
      },
      accountsType: Array.isArray(data.accounts) ? 'array' : snapshotType(data.accounts),
      accountSample: accounts.length
        ? {
            type: snapshotType(sample.type),
            providerName: snapshotType(sample.providerName),
            accountName: snapshotType(sample.accountName),
            accountNumber: snapshotType(sample.accountNumber),
            currency: snapshotType(sample.currency),
          }
        : 'empty',
    },
  };
}

function extractPosPayload(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const customItems = (data.customItems ?? {}) as Record<string, unknown>;
  const editOrder = (data.editOrder ?? {}) as Record<string, unknown>;

  const maxNameLength = toNumber(customItems.maxNameLength) ?? 80;
  const maxPrice = toNumber(customItems.maxPrice) ?? 1;

  return {
    customItems: {
      enabled: Boolean(customItems.enabled),
      maxNameLength,
      maxPrice,
    },
    editOrder: {
      enabled: Boolean(editOrder.enabled),
    },
  };
}

function extractPaymentPayload(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const settings = (data.settings ?? {}) as Record<string, unknown>;
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];

  return {
    settings: {
      payAtCashierEnabled: Boolean(settings.payAtCashierEnabled),
      manualTransferEnabled: Boolean(settings.manualTransferEnabled),
      qrisEnabled: Boolean(settings.qrisEnabled),
      requirePaymentProof: Boolean(settings.requirePaymentProof),
      qrisImageUrl: (settings.qrisImageUrl as string | null | undefined) ?? null,
      qrisImageMeta: settings.qrisImageMeta ?? null,
      qrisImageUploadedAt: (settings.qrisImageUploadedAt as string | null | undefined) ?? null,
    },
    accounts: accounts.map((account) => {
      const row = account as Record<string, unknown>;
      return {
        id: row.id ? String(row.id) : undefined,
        type: row.type === 'EWALLET' ? 'EWALLET' : 'BANK',
        providerName: String(row.providerName ?? ''),
        accountName: String(row.accountName ?? ''),
        accountNumber: String(row.accountNumber ?? ''),
        bsb: (row.bsb as string | null | undefined) ?? null,
        country: (row.country as string | null | undefined) ?? null,
        currency: (row.currency as string | null | undefined) ?? null,
        isActive: row.isActive !== false,
        sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
      };
    }),
  };
}

function normalizeVoucherRedeemSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const normalizeOptionalString = (value: unknown) => {
    if (value === null || value === undefined) return 'string|null';
    if (typeof value === 'string') return 'string|null';
    return 'non-string';
  };
  const normalizeOptionalObject = (value: unknown) => {
    if (value === null || value === undefined) return 'object|null';
    if (typeof value === 'object') return 'object|null';
    return 'non-object';
  };
  return {
    success: payload.success === true,
    messageType: snapshotType(payload.message),
    data: {
      voucherType: snapshotType(data.voucherType),
      valueApplied: normalizeNonNegativeNumber(data.valueApplied),
      autoSwitchTriggered: snapshotType(data.autoSwitchTriggered),
      previousSubType: normalizeOptionalString(data.previousSubType),
      newSubType: normalizeOptionalString(data.newSubType),
      subscriptionType: normalizeOptionalObject(data.subscription),
      balance: normalizeNonNegativeNumber(data.balance),
    },
  };
}

function normalizeSuccessMessageSnapshot(payload: Record<string, unknown>) {
  return {
    success: payload.success === true,
    messageType: snapshotType(payload.message),
    statusCode: snapshotType(payload.statusCode),
  };
}

function normalizeLegacyBulkSnapshot(
  payload: Record<string, unknown>,
  idField: 'menuIds' | 'addonItemIds',
) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const ids = data[idField];

  return {
    success: payload.success === true,
    messageType: snapshotType(payload.message),
    data: {
      operation: snapshotType(data.operation),
      affected: normalizeNonNegativeNumber(data.affected),
      idsType: Array.isArray(ids) ? 'array' : snapshotType(ids),
      idsLength: Array.isArray(ids) ? ids.length : 'non-array',
    },
  };
}

function normalizeSetupProgressSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const steps = (data.steps ?? {}) as Record<string, unknown>;
  const templateMarkers = (data.templateMarkers ?? {}) as Record<string, unknown>;
  const templateAUD = (templateMarkers.AUD ?? {}) as Record<string, unknown>;
  const templateIDR = (templateMarkers.IDR ?? {}) as Record<string, unknown>;

  const normalizeTemplate = (value: Record<string, unknown>) => ({
    CATEGORY_FOOD_NAME: snapshotType(value.CATEGORY_FOOD_NAME),
    CATEGORY_FOOD_DESC: snapshotType(value.CATEGORY_FOOD_DESC),
    CATEGORY_DRINK_NAME: snapshotType(value.CATEGORY_DRINK_NAME),
    CATEGORY_DRINK_DESC: snapshotType(value.CATEGORY_DRINK_DESC),
    MENU_FOOD_NAME: snapshotType(value.MENU_FOOD_NAME),
    MENU_FOOD_DESC: snapshotType(value.MENU_FOOD_DESC),
    MENU_DRINK_NAME: snapshotType(value.MENU_DRINK_NAME),
    MENU_DRINK_DESC: snapshotType(value.MENU_DRINK_DESC),
    ADDON_CATEGORY_NAME: snapshotType(value.ADDON_CATEGORY_NAME),
    ADDON_CATEGORY_DESC: snapshotType(value.ADDON_CATEGORY_DESC),
    ADDON_ITEM_1_NAME: snapshotType(value.ADDON_ITEM_1_NAME),
    ADDON_ITEM_2_NAME: snapshotType(value.ADDON_ITEM_2_NAME),
  });

  return {
    success: payload.success === true,
    data: {
      steps: {
        merchant_info: snapshotType(steps.merchant_info),
        categories: snapshotType(steps.categories),
        menu_items: snapshotType(steps.menu_items),
        addons: snapshotType(steps.addons),
        opening_hours: snapshotType(steps.opening_hours),
      },
      completedRequired: normalizeNumberRange(data.completedRequired, 0, 4),
      totalRequired: normalizeNumberRange(data.totalRequired, 0, 4),
      progressPercent: normalizeNumberRange(data.progressPercent, 0, 100),
      isComplete: snapshotType(data.isComplete),
      templateMarkers: {
        AUD: normalizeTemplate(templateAUD),
        IDR: normalizeTemplate(templateIDR),
      },
    },
  };
}

function normalizeSpecialPriceDetailSnapshot(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const menuBook = (data.menuBook ?? {}) as Record<string, unknown>;
  const priceItems = Array.isArray(data.priceItems) ? data.priceItems : [];

  return {
    success: payload.success === true,
    data: {
      id: snapshotType(data.id),
      merchantId: snapshotType(data.merchantId),
      menuBookId: snapshotType(data.menuBookId),
      name: snapshotType(data.name),
      startDate: snapshotType(data.startDate),
      endDate: snapshotType(data.endDate),
      applicableDays: Array.isArray(data.applicableDays) ? 'array' : snapshotType(data.applicableDays),
      isAllDay: snapshotType(data.isAllDay),
      startTime: snapshotType(data.startTime),
      endTime: snapshotType(data.endTime),
      isActive: snapshotType(data.isActive),
      createdAt: snapshotType(data.createdAt),
      updatedAt: snapshotType(data.updatedAt),
      menuBook: {
        id: snapshotType(menuBook.id),
        name: snapshotType(menuBook.name),
      },
      priceItemsType: Array.isArray(priceItems) ? 'array' : snapshotType(priceItems),
    },
  };
}

function normalizeSpecialPriceListSnapshot(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const sample = (data[0] ?? {}) as Record<string, unknown>;
  const menuBook = (sample.menuBook ?? {}) as Record<string, unknown>;
  const count = (sample._count ?? {}) as Record<string, unknown>;

  return {
    success: payload.success === true,
    dataType: Array.isArray(data) ? 'array' : snapshotType(payload.data),
    sample: data.length
      ? {
          id: snapshotType(sample.id),
          merchantId: snapshotType(sample.merchantId),
          menuBookId: snapshotType(sample.menuBookId),
          name: snapshotType(sample.name),
          startDate: snapshotType(sample.startDate),
          endDate: snapshotType(sample.endDate),
          applicableDays: Array.isArray(sample.applicableDays) ? 'array' : snapshotType(sample.applicableDays),
          isAllDay: snapshotType(sample.isAllDay),
          startTime: snapshotType(sample.startTime),
          endTime: snapshotType(sample.endTime),
          isActive: snapshotType(sample.isActive),
          createdAt: snapshotType(sample.createdAt),
          updatedAt: snapshotType(sample.updatedAt),
          menuBook: {
            id: snapshotType(menuBook.id),
            name: snapshotType(menuBook.name),
          },
          count: {
            priceItems: snapshotType(count.priceItems),
          },
        }
      : 'empty',
  };
}

function findReservation(
  rows: ReservationRow[],
  reservationDate: string,
  reservationTime: string,
  customerEmail: string,
): ReservationRow | undefined {
  return rows.find((row) => {
    const rowDate = row.reservationDate ?? null;
    const rowTime = row.reservationTime ?? null;
    const rowEmail = row.customer?.email ?? null;
    return (
      String(rowDate) === reservationDate &&
      String(rowTime) === reservationTime &&
      String(rowEmail) === customerEmail
    );
  });
}

describe('Contract parity: merchant orders + reservations', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE, CONTRACT_MENU_ID) && hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/orders parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const since = Date.now() - 1000;
    const createdOrder = await createPublicOrder(CONTRACT_NEXT_BASE);

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/orders?limit=200&includeItems=false&since=${since}`,
        token,
      ),
      getJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/orders?limit=200&includeItems=false&since=${since}`,
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    const nextTotal = toNumber(nextRes.json?.total);
    const goTotal = toNumber(goRes.json?.total);
    if (nextTotal !== null && goTotal !== null) {
      expect(Math.abs(nextTotal - goTotal)).toBeLessThanOrEqual(1);
    }

    const nextHasOrder = nextData.some(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === createdOrder.orderNumber,
    );
    const goHasOrder = goData.some(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === createdOrder.orderNumber,
    );

    expect(nextHasOrder).toBe(true);
    expect(goHasOrder).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/orders/{orderId} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const createdOrder = await createPublicOrder(CONTRACT_NEXT_BASE);

    const nextList = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders?limit=20&includeItems=false`,
      token,
    );
    expect(nextList.json?.success).toBe(true);

    const nextData = Array.isArray(nextList.json?.data) ? nextList.json?.data : [];
    const target = nextData.find(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === createdOrder.orderNumber,
    ) as Record<string, unknown> | undefined;

    expect(target).toBeTruthy();
    if (!target) return;

    const orderId = String(target.id ?? '');
    expect(orderId).toBeTruthy();

    const nextDetail = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders/${orderId}`,
      token,
    );
    const goDetail = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/orders/${orderId}`,
      token,
    );

    expect(nextDetail.status).toBeGreaterThanOrEqual(200);
    expect(goDetail.status).toBeGreaterThanOrEqual(200);

    expect(nextDetail.json?.success).toBe(true);
    expect(goDetail.json?.success).toBe(true);

    const nextOrder = (nextDetail.json?.data ?? {}) as OrderDetailRow;
    const goOrder = (goDetail.json?.data ?? {}) as OrderDetailRow;

    expect(nextOrder.orderNumber).toBe(goOrder.orderNumber);
    expect(nextOrder.orderType).toBe(goOrder.orderType);
  }, 20000);

  testFn('GET /api/merchant/orders/active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const createdOrder = await createPublicOrder(CONTRACT_NEXT_BASE);

    const nextRes = await getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/orders/active`, token);
    const goRes = await getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/orders/active`, token);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    const nextHasOrder = nextData.some(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === createdOrder.orderNumber,
    );
    const goHasOrder = goData.some(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === createdOrder.orderNumber,
    );

    expect(nextHasOrder).toBe(true);
    expect(goHasOrder).toBe(true);
  }, 20000);

  testFn('PUT /api/merchant/orders/{orderId}/status parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextOrder = await createPublicOrder(CONTRACT_NEXT_BASE);
    const goOrder = await createPublicOrder(CONTRACT_NEXT_BASE);

    const nextList = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders?limit=50&includeItems=false`,
      token,
    );
    const listData = Array.isArray(nextList.json?.data) ? nextList.json?.data : [];

    const nextTarget = listData.find(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === nextOrder.orderNumber,
    ) as Record<string, unknown> | undefined;
    const goTarget = listData.find(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === goOrder.orderNumber,
    ) as Record<string, unknown> | undefined;

    expect(nextTarget).toBeTruthy();
    expect(goTarget).toBeTruthy();
    if (!nextTarget || !goTarget) return;

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders/${nextTarget.id}/status`,
      { status: 'ACCEPTED' },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/orders/${goTarget.id}/status`,
      { status: 'ACCEPTED' },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);

    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);

    const nextData = (nextUpdate.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goUpdate.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.status ?? '')).toBe('ACCEPTED');
    expect(String(goData.status ?? '')).toBe('ACCEPTED');
  }, 20000);

  testFn('POST /api/merchant/orders/{orderId}/cancel parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextOrder = await createPublicOrder(CONTRACT_NEXT_BASE);
    const goOrder = await createPublicOrder(CONTRACT_NEXT_BASE);

    const nextList = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders?limit=50&includeItems=false`,
      token,
    );
    const listData = Array.isArray(nextList.json?.data) ? nextList.json?.data : [];

    const nextTarget = listData.find(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === nextOrder.orderNumber,
    ) as Record<string, unknown> | undefined;
    const goTarget = listData.find(
      (row) => String((row as Record<string, unknown>).orderNumber ?? '') === goOrder.orderNumber,
    ) as Record<string, unknown> | undefined;

    expect(nextTarget).toBeTruthy();
    expect(goTarget).toBeTruthy();
    if (!nextTarget || !goTarget) return;

    const nextCancel = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/orders/${nextTarget.id}/cancel`,
      { reason: 'Contract test cancel' },
      token,
    );
    const goCancel = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/orders/${goTarget.id}/cancel`,
      { reason: 'Contract test cancel' },
      token,
    );

    expect(nextCancel.status).toBeGreaterThanOrEqual(200);
    expect(goCancel.status).toBeGreaterThanOrEqual(200);

    expect(nextCancel.json?.success).toBe(true);
    expect(goCancel.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/orders/stats parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/orders/stats`, token);
    const goRes = await getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/orders/stats`, token);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextOrders = (nextRes.json?.data as Record<string, unknown>)?.orders;
    const goOrders = (goRes.json?.data as Record<string, unknown>)?.orders;
    const nextPayments = (nextRes.json?.data as Record<string, unknown>)?.payments;
    const goPayments = (goRes.json?.data as Record<string, unknown>)?.payments;

    expect(Boolean(nextOrders)).toBe(true);
    expect(Boolean(goOrders)).toBe(true);
    expect(Boolean(nextPayments)).toBe(true);
    expect(Boolean(goPayments)).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/orders/analytics parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/orders/analytics`, token);
    const goRes = await getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/orders/analytics`, token);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(Boolean(nextData)).toBe(true);
    expect(Boolean(goData)).toBe(true);
    expect(Boolean(nextData.statistics)).toBe(true);
    expect(Boolean(goData.statistics)).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/reservations parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchantCode = CONTRACT_MERCHANT_CODE || '';
    const reservationSnapshot = await ensureReservationEnabled(merchantCode);

    try {
      const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, merchantCode);
      const tz = String(merchant?.timezone ?? 'Australia/Sydney');
      const reservationDate = resolveFutureReservationDate(tz);
      const reservationTime = CONTRACT_RESERVATION_TIME || '19:00';

      await createPublicReservation(CONTRACT_NEXT_BASE, reservationDate, reservationTime);

      const nextRes = await getJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/reservations?limit=25`,
        token,
      );
      const goRes = await getJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/reservations?limit=25`,
        token,
      );

      expect(nextRes.status).toBeGreaterThanOrEqual(200);
      expect(goRes.status).toBeGreaterThanOrEqual(200);

      expect(nextRes.json?.success).toBe(true);
      expect(goRes.json?.success).toBe(true);

      const nextCount = toNumber(nextRes.json?.count);
      const goCount = toNumber(goRes.json?.count);
      if (nextCount !== null && goCount !== null) {
        expect(nextCount).toBe(goCount);
      }

      const nextData = Array.isArray(nextRes.json?.data) ? (nextRes.json?.data as ReservationRow[]) : [];
      const goData = Array.isArray(goRes.json?.data) ? (goRes.json?.data as ReservationRow[]) : [];

      const nextMatch = findReservation(nextData, reservationDate, reservationTime, CONTRACT_CUSTOMER_EMAIL);
      const goMatch = findReservation(goData, reservationDate, reservationTime, CONTRACT_CUSTOMER_EMAIL);

      expect(Boolean(nextMatch)).toBe(true);
      expect(Boolean(goMatch)).toBe(true);
    } finally {
      await restoreReservationSettings(reservationSnapshot);
    }
  }, 20000);

  testFn('GET /api/merchant/reservations/active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchantCode = CONTRACT_MERCHANT_CODE || '';
    const reservationSnapshot = await ensureReservationEnabled(merchantCode);

    try {
      const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, merchantCode);
      const tz = String(merchant?.timezone ?? 'Australia/Sydney');
      const reservationDate = resolveFutureReservationDate(tz);
      const reservationTime = CONTRACT_RESERVATION_TIME || '19:00';

      await createPublicReservation(CONTRACT_NEXT_BASE, reservationDate, reservationTime);

      const nextRes = await getJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/reservations/active`,
        token,
      );
      const goRes = await getJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/reservations/active`,
        token,
      );

      expect(nextRes.status).toBeGreaterThanOrEqual(200);
      expect(goRes.status).toBeGreaterThanOrEqual(200);

      expect(nextRes.json?.success).toBe(true);
      expect(goRes.json?.success).toBe(true);

      const nextData = Array.isArray(nextRes.json?.data) ? (nextRes.json?.data as ReservationRow[]) : [];
      const goData = Array.isArray(goRes.json?.data) ? (goRes.json?.data as ReservationRow[]) : [];

      const nextMatch = findReservation(nextData, reservationDate, reservationTime, CONTRACT_CUSTOMER_EMAIL);
      const goMatch = findReservation(goData, reservationDate, reservationTime, CONTRACT_CUSTOMER_EMAIL);

      expect(Boolean(nextMatch)).toBe(true);
      expect(Boolean(goMatch)).toBe(true);
    } finally {
      await restoreReservationSettings(reservationSnapshot);
    }
  }, 20000);

  testFn('GET /api/merchant/reservations/count parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/reservations/count`,
      token,
    );
    const goRes = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/reservations/count`,
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as ReservationCountPayload;
    const goData = (goRes.json?.data ?? {}) as ReservationCountPayload;

    const nextPending = toNumber(nextData.pending);
    const goPending = toNumber(goData.pending);
    const nextActive = toNumber(nextData.active);
    const goActive = toNumber(goData.active);

    if (nextPending !== null && goPending !== null) {
      expect(nextPending).toBe(goPending);
    }
    if (nextActive !== null && goActive !== null) {
      expect(nextActive).toBe(goActive);
    }
  }, 20000);

  testFn('GET /api/merchant/customers/search parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    await createPublicOrder(CONTRACT_NEXT_BASE);

    const nextRes = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/customers/search?q=contract&take=5`,
      token,
    );
    const goRes = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/customers/search?q=contract&take=5`,
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextPagination = (nextRes.json?.pagination ?? {}) as Record<string, unknown>;
    const goPagination = (goRes.json?.pagination ?? {}) as Record<string, unknown>;

    expect(typeof nextPagination.take).toBe('number');
    expect(typeof goPagination.take).toBe('number');
  }, 20000);

  testFn('PUT/GET /api/merchant/customer-display/state parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const payload = {
      mode: 'IDLE',
      payload: null,
      isLocked: false,
      source: 'manual',
    };

    const nextPut = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/customer-display/state`,
      payload,
      token,
    );
    const goPut = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/customer-display/state`,
      payload,
      token,
    );

    expect(nextPut.status).toBeGreaterThanOrEqual(200);
    expect(goPut.status).toBeGreaterThanOrEqual(200);

    expect(nextPut.json?.success).toBe(true);
    expect(goPut.json?.success).toBe(true);

    const nextGet = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/customer-display/state`,
      token,
    );
    const goGet = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/customer-display/state`,
      token,
    );

    expect(nextGet.json?.success).toBe(true);
    expect(goGet.json?.success).toBe(true);

    const nextState = (nextGet.json?.data ?? {}) as Record<string, unknown>;
    const goState = (goGet.json?.data ?? {}) as Record<string, unknown>;

    expect(nextState.mode).toBe('IDLE');
    expect(goState.mode).toBe('IDLE');
  }, 20000);

  testFn('GET /api/merchant/customer-display/sessions parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/customer-display/sessions`,
      token,
    );
    const goRes = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/customer-display/sessions`,
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSessions = (nextRes.json?.data as Record<string, unknown>)?.sessions;
    const goSessions = (goRes.json?.data as Record<string, unknown>)?.sessions;

    expect(Array.isArray(nextSessions)).toBe(true);
    expect(Array.isArray(goSessions)).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/menu parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/menu`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/menu`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    expect(Array.isArray(nextData)).toBe(true);
    expect(Array.isArray(goData)).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu ${Date.now()}`,
    });

    expect(nextCreated.id).toBeTruthy();
    expect(goCreated.id).toBeTruthy();
  }, 20000);

  testFn('GET /api/merchant/menu/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const created = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Detail Menu ${Date.now()}`,
    });

    const nextDetail = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${created.id}`,
      token,
    );
    const goDetail = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${created.id}`,
      token,
    );

    expect(nextDetail.status).toBeGreaterThanOrEqual(200);
    expect(goDetail.status).toBeGreaterThanOrEqual(200);

    expect(nextDetail.json?.success).toBe(true);
    expect(goDetail.json?.success).toBe(true);

    const nextData = (nextDetail.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goDetail.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.id ?? '')).toBe(String(goData.id ?? ''));
    expect(String(nextData.name ?? '')).toBe(String(goData.name ?? ''));

    const nextPrice = toNumber(nextData.price);
    const goPrice = toNumber(goData.price);
    if (nextPrice !== null && goPrice !== null) {
      expect(nextPrice).toBe(goPrice);
    }
  }, 20000);

  testFn('PUT /api/merchant/menu/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Update ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Update ${Date.now()}`,
    });

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextCreated.id}`,
      { name: `Contract Next Menu Updated ${Date.now()}` },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${goCreated.id}`,
      { name: `Contract Go Menu Updated ${Date.now()}` },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);

    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/{id}/addon-categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Addon ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Addon ${Date.now()}`,
    });
    const nextAddon = await createAddonCategory(CONTRACT_NEXT_BASE, token, `Addon Next ${Date.now()}`);
    const goAddon = await createAddonCategory(CONTRACT_GO_BASE, token, `Addon Go ${Date.now()}`);

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextMenu.id}/addon-categories`,
        { addonCategoryId: nextAddon.id, displayOrder: 1, isRequired: true },
        token,
      ),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/menu/${goMenu.id}/addon-categories`,
        { addonCategoryId: goAddon.id, displayOrder: 1, isRequired: true },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    if (!nextRes.json?.success || !goRes.json?.success) {
      throw new Error(
        `Opening hours update failed: next=${JSON.stringify(nextRes.json)} go=${JSON.stringify(goRes.json)}`,
      );
    }

    const nextSnapshot = normalizeMenuAddonCategorySnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeMenuAddonCategorySnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant menu addon category add next');
    expect(goSnapshot).toMatchSnapshot('merchant menu addon category add go');

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id);
    await deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextAddon.id);
    await deleteAddonCategory(CONTRACT_GO_BASE, token, goAddon.id);
  }, 20000);

  testFn('DELETE /api/merchant/menu/{id}/addon-categories/{categoryId} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Addon Delete ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Addon Delete ${Date.now()}`,
    });
    const nextAddon = await createAddonCategory(CONTRACT_NEXT_BASE, token, `Addon Next Del ${Date.now()}`);
    const goAddon = await createAddonCategory(CONTRACT_GO_BASE, token, `Addon Go Del ${Date.now()}`);

    await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextMenu.id}/addon-categories`,
      { addonCategoryId: nextAddon.id, displayOrder: 0, isRequired: false },
      token,
    );
    await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${goMenu.id}/addon-categories`,
      { addonCategoryId: goAddon.id, displayOrder: 0, isRequired: false },
      token,
    );

    const [nextRes, goRes] = await Promise.all([
      deleteJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextMenu.id}/addon-categories/${nextAddon.id}`,
        {},
        token,
      ),
      deleteJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/menu/${goMenu.id}/addon-categories/${goAddon.id}`,
        {},
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeSuccessMessageSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeSuccessMessageSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant menu addon category delete next');
    expect(goSnapshot).toMatchSnapshot('merchant menu addon category delete go');

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id);
    await deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextAddon.id);
    await deleteAddonCategory(CONTRACT_GO_BASE, token, goAddon.id);
  }, 20000);

  testFn('PUT /api/merchant/menu/{id}/categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Categories ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Categories ${Date.now()}`,
    });
    const nextCategory = await createMerchantCategory(CONTRACT_NEXT_BASE, token, `Category Next ${Date.now()}`);
    const goCategory = await createMerchantCategory(CONTRACT_GO_BASE, token, `Category Go ${Date.now()}`);

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextMenu.id}/categories`,
        { categoryIds: [nextCategory.id] },
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/menu/${goMenu.id}/categories`,
        { categoryIds: [goCategory.id] },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeMenuCategoriesUpdateSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeMenuCategoriesUpdateSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant menu categories update next');
    expect(goSnapshot).toMatchSnapshot('merchant menu categories update go');

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id);
    await deleteMerchantCategory(CONTRACT_NEXT_BASE, token, nextCategory.id);
    await deleteMerchantCategory(CONTRACT_GO_BASE, token, goCategory.id);
  }, 20000);

  testFn('POST /api/merchant/menu/{id}/duplicate parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Duplicate ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Duplicate ${Date.now()}`,
    });

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextMenu.id}/duplicate`,
        {},
        token,
      ),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/menu/${goMenu.id}/duplicate`, {}, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeMenuDuplicateSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeMenuDuplicateSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant menu duplicate next');
    expect(goSnapshot).toMatchSnapshot('merchant menu duplicate go');

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id);
  }, 20000);

  testFn('DELETE /api/merchant/menu/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Delete ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Delete ${Date.now()}`,
    });

    const nextDelete = await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextCreated.id);
    const goDelete = await deleteMerchantMenu(CONTRACT_GO_BASE, token, goCreated.id);

    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('PATCH /api/merchant/menu/{id}/toggle-active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Toggle ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Toggle ${Date.now()}`,
    });

    const nextToggle = await patchJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextCreated.id}/toggle-active`,
      {},
      token,
    );
    const goToggle = await patchJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${goCreated.id}/toggle-active`,
      {},
      token,
    );

    expect(nextToggle.status).toBeGreaterThanOrEqual(200);
    expect(goToggle.status).toBeGreaterThanOrEqual(200);

    expect(nextToggle.json?.success).toBe(true);
    expect(goToggle.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/{id}/restore parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Restore ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Restore ${Date.now()}`,
    });

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goCreated.id);

    const nextRestore = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextCreated.id}/restore`,
      {},
      token,
    );
    const goRestore = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${goCreated.id}/restore`,
      {},
      token,
    );

    expect(nextRestore.status).toBeGreaterThanOrEqual(200);
    expect(goRestore.status).toBeGreaterThanOrEqual(200);

    expect(nextRestore.json?.success).toBe(true);
    expect(goRestore.json?.success).toBe(true);
  }, 20000);

  testFn('DELETE /api/merchant/menu/{id}/permanent-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Menu Permanent ${Date.now()}`,
    });
    const goCreated = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Menu Permanent ${Date.now()}`,
    });

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goCreated.id);

    const nextDelete = await deleteJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/${nextCreated.id}/permanent-delete`,
      {},
      token,
    );
    const goDelete = await deleteJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/${goCreated.id}/permanent-delete`,
      {},
      token,
    );

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);

    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/bulk parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Menu ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Menu ${Date.now()}`,
    });

    const payload = {
      operation: 'UPDATE_PRICE',
      menuIds: [nextMenu.id],
      priceChange: {
        type: 'FIXED',
        value: 1,
        direction: 'INCREASE',
      },
    };

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk`,
      payload,
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk`,
      { ...payload, menuIds: [goMenu.id] },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(toNumber(nextData.affectedCount)).toBe(1);
    expect(toNumber(goData.affectedCount)).toBe(1);
  }, 20000);

  testFn('POST /api/merchant/menu/bulk-update-status parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Status ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Status ${Date.now()}`,
    });

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk-update-status`,
      { ids: [nextMenu.id], isActive: false },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk-update-status`,
      { ids: [goMenu.id], isActive: false },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);
  }, 20000);

  testFn('GET/POST /api/merchant/menu/bulk-soft-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenuA = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Soft A ${Date.now()}`,
    });
    const nextMenuB = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Soft B ${Date.now()}`,
    });
    const goMenuA = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Soft A ${Date.now()}`,
    });
    const goMenuB = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Soft B ${Date.now()}`,
    });

    const nextToken = await getBulkMenuToken(CONTRACT_NEXT_BASE, token, [nextMenuA.id, nextMenuB.id]);
    const goToken = await getBulkMenuToken(CONTRACT_GO_BASE, token, [goMenuA.id, goMenuB.id]);

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk-soft-delete`,
      { ids: [nextMenuA.id, nextMenuB.id], confirmationToken: nextToken },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk-soft-delete`,
      { ids: [goMenuA.id, goMenuB.id], confirmationToken: goToken },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/bulk-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Delete ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Delete ${Date.now()}`,
    });

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk-delete`,
      { ids: [nextMenu.id] },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk-delete`,
      { ids: [goMenu.id] },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/bulk-restore parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Bulk Restore ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Bulk Restore ${Date.now()}`,
    });

    await deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id);
    await deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id);

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk-restore`,
      { ids: [nextMenu.id] },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk-restore`,
      { ids: [goMenu.id] },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/bulk-upload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Bulk Upload Cat ${Date.now()}`,
    );
    const goCategory = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Bulk Upload Cat ${Date.now()}`,
    );

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/bulk-upload`,
      {
        items: [
          {
            name: `Contract Next Bulk Upload ${Date.now()}`,
            price: 10.5,
            categoryIds: [nextCategory.id],
          },
        ],
        upsertByName: true,
      },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/bulk-upload`,
      {
        items: [
          {
            name: `Contract Go Bulk Upload ${Date.now()}`,
            price: 10.5,
            categoryIds: [goCategory.id],
          },
        ],
        upsertByName: true,
      },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    expect(toNumber(nextRes.json?.totalCount)).toBe(1);
    expect(toNumber(goRes.json?.totalCount)).toBe(1);
  }, 20000);

  testFn('POST /api/merchant/menu/reset-stock parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/reset-stock`,
      {},
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/reset-stock`,
      {},
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/menu/stock/overview parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextRes = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/stock/overview`,
      token,
    );
    const goRes = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/stock/overview`,
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(Array.isArray(nextData.items)).toBe(true);
    expect(Array.isArray(goData.items)).toBe(true);
    expect(Boolean(nextData.stats)).toBe(true);
    expect(Boolean(goData.stats)).toBe(true);
    expect(Boolean(nextData.merchant)).toBe(true);
    expect(Boolean(goData.merchant)).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/menu/stock/bulk-update parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Next Stock Bulk ${Date.now()}`,
      trackStock: true,
      stockQty: 5,
      dailyStockTemplate: 5,
      autoResetStock: true,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Go Stock Bulk ${Date.now()}`,
      trackStock: true,
      stockQty: 5,
      dailyStockTemplate: 5,
      autoResetStock: true,
    });

    const nextRes = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/menu/stock/bulk-update`,
      {
        updates: [{ type: 'menu', id: Number(nextMenu.id), stockQty: 3 }],
      },
      token,
    );
    const goRes = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/menu/stock/bulk-update`,
      {
        updates: [{ type: 'menu', id: Number(goMenu.id), stockQty: 3 }],
      },
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSummary = (nextRes.json?.data as Record<string, unknown>)?.summary as
      | Record<string, unknown>
      | undefined;
    const goSummary = (goRes.json?.data as Record<string, unknown>)?.summary as
      | Record<string, unknown>
      | undefined;

    expect(toNumber(nextSummary?.success)).toBe(1);
    expect(toNumber(goSummary?.success)).toBe(1);
  }, 20000);

  testFn('GET /api/merchant/categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/categories`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/categories`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    expect(Array.isArray(nextData)).toBe(true);
    expect(Array.isArray(goData)).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Category ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Category ${Date.now()}`,
    );

    expect(nextCreated.id).toBeTruthy();
    expect(goCreated.id).toBeTruthy();
  }, 20000);

  testFn('PUT /api/merchant/categories/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Update ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Update ${Date.now()}`,
    );

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/categories/${nextCreated.id}`,
      { name: `Contract Next Updated ${Date.now()}` },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/categories/${goCreated.id}`,
      { name: `Contract Go Updated ${Date.now()}` },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);

    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);
  }, 20000);

  testFn('PATCH /api/merchant/categories/{id}/toggle-active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Toggle ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Toggle ${Date.now()}`,
    );

    const nextToggle = await patchJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/categories/${nextCreated.id}/toggle-active`,
      {},
      token,
    );
    const goToggle = await patchJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/categories/${goCreated.id}/toggle-active`,
      {},
      token,
    );

    expect(nextToggle.status).toBeGreaterThanOrEqual(200);
    expect(goToggle.status).toBeGreaterThanOrEqual(200);

    expect(nextToggle.json?.success).toBe(true);
    expect(goToggle.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/categories/{id}/delete-preview parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Preview ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Preview ${Date.now()}`,
    );

    const nextPreview = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/categories/${nextCreated.id}/delete-preview`,
      token,
    );
    const goPreview = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/categories/${goCreated.id}/delete-preview`,
      token,
    );

    expect(nextPreview.status).toBeGreaterThanOrEqual(200);
    expect(goPreview.status).toBeGreaterThanOrEqual(200);

    expect(nextPreview.json?.success).toBe(true);
    expect(goPreview.json?.success).toBe(true);

    const nextData = (nextPreview.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goPreview.json?.data ?? {}) as Record<string, unknown>;

    const nextCategory = nextData.addonCategory as Record<string, unknown> | undefined;
    const goCategory = goData.addonCategory as Record<string, unknown> | undefined;

    expect(typeof nextCategory?.name).toBe('string');
    expect(typeof goCategory?.name).toBe('string');

    expect(typeof nextData.affectedMenusCount).toBe('number');
    expect(typeof goData.affectedMenusCount).toBe('number');
    expect(typeof nextData.addonItemsCount).toBe('number');
    expect(typeof goData.addonItemsCount).toBe('number');
    expect(typeof nextData.hasMoreMenus).toBe('boolean');
    expect(typeof goData.hasMoreMenus).toBe('boolean');
    expect(typeof nextData.hasMoreItems).toBe('boolean');
    expect(typeof goData.hasMoreItems).toBe('boolean');
    expect(typeof nextData.message).toBe('string');
    expect(typeof goData.message).toBe('string');
    expect(typeof nextData.canDelete).toBe('boolean');
    expect(typeof goData.canDelete).toBe('boolean');
  }, 20000);

  testFn('DELETE /api/merchant/categories/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Delete ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Delete ${Date.now()}`,
    );

    const nextDelete = await deleteMerchantCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    const goDelete = await deleteMerchantCategory(CONTRACT_GO_BASE, token, goCreated.id);

    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/categories/{id}/restore parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Restore ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Restore ${Date.now()}`,
    );

    await deleteMerchantCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteMerchantCategory(CONTRACT_GO_BASE, token, goCreated.id);

    const nextRestore = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/categories/${nextCreated.id}/restore`,
      {},
      token,
    );
    const goRestore = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/categories/${goCreated.id}/restore`,
      {},
      token,
    );

    expect(nextRestore.status).toBeGreaterThanOrEqual(200);
    expect(goRestore.status).toBeGreaterThanOrEqual(200);
    expect(nextRestore.json?.success).toBe(true);
    expect(goRestore.json?.success).toBe(true);
  }, 20000);

  testFn('DELETE /api/merchant/categories/{id}/permanent-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createMerchantCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Permanent ${Date.now()}`,
    );
    const goCreated = await createMerchantCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Permanent ${Date.now()}`,
    );

    await deleteMerchantCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteMerchantCategory(CONTRACT_GO_BASE, token, goCreated.id);

    const nextDelete = await deleteJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/categories/${nextCreated.id}/permanent-delete`,
      {},
      token,
    );
    const goDelete = await deleteJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/categories/${goCreated.id}/permanent-delete`,
      {},
      token,
    );

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/addon-categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/addon-categories`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/addon-categories`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    if (nextData.length > 0) {
      assertAddonCategoryShape(nextData[0] as Record<string, unknown>);
    }
    if (goData.length > 0) {
      assertAddonCategoryShape(goData[0] as Record<string, unknown>);
    }
  }, 20000);

  testFn('POST /api/merchant/addon-categories parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Category ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Category ${Date.now()}`,
    );

    expect(nextCreated.id).toBeTruthy();
    expect(goCreated.id).toBeTruthy();
  }, 20000);

  testFn('GET /api/merchant/addon-categories/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const created = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Addon Category Detail ${Date.now()}`,
    );

    const nextDetail = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${created.id}`,
      token,
    );
    const goDetail = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${created.id}`,
      token,
    );

    expect(nextDetail.status).toBeGreaterThanOrEqual(200);
    expect(goDetail.status).toBeGreaterThanOrEqual(200);

    expect(nextDetail.json?.success).toBe(true);
    expect(goDetail.json?.success).toBe(true);

    const nextData = (nextDetail.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goDetail.json?.data ?? {}) as Record<string, unknown>;

    assertAddonCategoryShape(nextData);
    assertAddonCategoryShape(goData);
  }, 20000);

  testFn('PUT /api/merchant/addon-categories/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Update ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Update ${Date.now()}`,
    );

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCreated.id}`,
      { name: `Contract Next Addon Cat Updated ${Date.now()}` },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCreated.id}`,
      { name: `Contract Go Addon Cat Updated ${Date.now()}` },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);

    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);
  }, 20000);

  testFn('PATCH /api/merchant/addon-categories/{id}/toggle-active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Toggle ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Toggle ${Date.now()}`,
    );

    const nextToggle = await patchJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCreated.id}/toggle-active`,
      {},
      token,
    );
    const goToggle = await patchJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCreated.id}/toggle-active`,
      {},
      token,
    );

    expect(nextToggle.status).toBeGreaterThanOrEqual(200);
    expect(goToggle.status).toBeGreaterThanOrEqual(200);

    expect(nextToggle.json?.success).toBe(true);
    expect(goToggle.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/addon-categories/{id}/delete-preview parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Preview ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Preview ${Date.now()}`,
    );

    const nextPreview = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCreated.id}/delete-preview`,
      token,
    );
    const goPreview = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCreated.id}/delete-preview`,
      token,
    );

    expect(nextPreview.status).toBeGreaterThanOrEqual(200);
    expect(goPreview.status).toBeGreaterThanOrEqual(200);

    expect(nextPreview.json?.success).toBe(true);
    expect(goPreview.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/addon-categories/{id}/items parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Items ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Items ${Date.now()}`,
    );

    await createAddonItem(CONTRACT_NEXT_BASE, token, nextCategory.id, `Contract Next Addon Item ${Date.now()}`);
    await createAddonItem(CONTRACT_GO_BASE, token, goCategory.id, `Contract Go Addon Item ${Date.now()}`);

    const nextItems = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCategory.id}/items`,
      token,
    );
    const goItems = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCategory.id}/items`,
      token,
    );

    expect(nextItems.status).toBeGreaterThanOrEqual(200);
    expect(goItems.status).toBeGreaterThanOrEqual(200);

    expect(nextItems.json?.success).toBe(true);
    expect(goItems.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/addon-categories/{id}/reorder-items parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Reorder ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Reorder ${Date.now()}`,
    );

    const nextItemA = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item A ${Date.now()}`,
    );
    const nextItemB = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item B ${Date.now()}`,
    );
    const goItemA = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item A ${Date.now()}`,
    );
    const goItemB = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item B ${Date.now()}`,
    );

    const nextReorder = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCategory.id}/reorder-items`,
      {
        itemOrders: [
          { id: nextItemB.id, displayOrder: 0 },
          { id: nextItemA.id, displayOrder: 1 },
        ],
      },
      token,
    );
    const goReorder = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCategory.id}/reorder-items`,
      {
        itemOrders: [
          { id: goItemB.id, displayOrder: 0 },
          { id: goItemA.id, displayOrder: 1 },
        ],
      },
      token,
    );

    expect(nextReorder.status).toBeGreaterThanOrEqual(200);
    expect(goReorder.status).toBeGreaterThanOrEqual(200);

    expect(nextReorder.json?.success).toBe(true);
    expect(goReorder.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/addon-categories/{id}/relationships parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Relations ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Relations ${Date.now()}`,
    );

    const nextRes = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCategory.id}/relationships`,
      token,
    );
    const goRes = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCategory.id}/relationships`,
      token,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    if (nextData.length > 0) {
      const rel = nextData[0] as Record<string, unknown>;
      expect(typeof rel.name).toBe('string');
      expect(typeof rel.isRequired).toBe('boolean');
      const displayOrder = toNumber(rel.displayOrder);
      if (displayOrder !== null) {
        expect(displayOrder).toBeGreaterThanOrEqual(0);
      }
    }
    if (goData.length > 0) {
      const rel = goData[0] as Record<string, unknown>;
      expect(typeof rel.name).toBe('string');
      expect(typeof rel.isRequired).toBe('boolean');
      const displayOrder = toNumber(rel.displayOrder);
      if (displayOrder !== null) {
        expect(displayOrder).toBeGreaterThanOrEqual(0);
      }
    }
  }, 20000);

  testFn('DELETE /api/merchant/addon-categories/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Delete ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Delete ${Date.now()}`,
    );

    const nextDelete = await deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    const goDelete = await deleteAddonCategory(CONTRACT_GO_BASE, token, goCreated.id);

    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/addon-categories/{id}/restore parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Restore ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Restore ${Date.now()}`,
    );

    await deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteAddonCategory(CONTRACT_GO_BASE, token, goCreated.id);

    const nextRestore = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCreated.id}/restore`,
      {},
      token,
    );
    const goRestore = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCreated.id}/restore`,
      {},
      token,
    );

    expect(nextRestore.status).toBeGreaterThanOrEqual(200);
    expect(goRestore.status).toBeGreaterThanOrEqual(200);
    expect(nextRestore.json?.success).toBe(true);
    expect(goRestore.json?.success).toBe(true);
  }, 20000);

  testFn('DELETE /api/merchant/addon-categories/{id}/permanent-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCreated = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Permanent ${Date.now()}`,
    );
    const goCreated = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Permanent ${Date.now()}`,
    );

    await deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextCreated.id);
    await deleteAddonCategory(CONTRACT_GO_BASE, token, goCreated.id);

    const nextDelete = await deleteJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/${nextCreated.id}/permanent-delete`,
      {},
      token,
    );
    const goDelete = await deleteJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/${goCreated.id}/permanent-delete`,
      {},
      token,
    );

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('GET/POST /api/merchant/addon-categories/bulk-soft-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategoryA = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Bulk A ${Date.now()}`,
    );
    const nextCategoryB = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Cat Bulk B ${Date.now()}`,
    );
    const goCategoryA = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Bulk A ${Date.now()}`,
    );
    const goCategoryB = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Cat Bulk B ${Date.now()}`,
    );

    const nextToken = await getBulkAddonCategoryToken(
      CONTRACT_NEXT_BASE,
      token,
      [nextCategoryA.id, nextCategoryB.id],
    );
    const goToken = await getBulkAddonCategoryToken(
      CONTRACT_GO_BASE,
      token,
      [goCategoryA.id, goCategoryB.id],
    );

    const nextBulk = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-categories/bulk-soft-delete`,
      { ids: [nextCategoryA.id, nextCategoryB.id], confirmationToken: nextToken },
      token,
    );
    const goBulk = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-categories/bulk-soft-delete`,
      { ids: [goCategoryA.id, goCategoryB.id], confirmationToken: goToken },
      token,
    );

    expect(nextBulk.status).toBeGreaterThanOrEqual(200);
    expect(goBulk.status).toBeGreaterThanOrEqual(200);

    expect(nextBulk.json?.success).toBe(true);
    expect(goBulk.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/addon-items parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/addon-items`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/addon-items`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    if (nextData.length > 0) {
      assertAddonItemShape(nextData[0] as Record<string, unknown>);
    }
    if (goData.length > 0) {
      assertAddonItemShape(goData[0] as Record<string, unknown>);
    }
  }, 20000);

  testFn('POST /api/merchant/addon-items parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item ${Date.now()}`,
    );

    expect(nextItem.id).toBeTruthy();
    expect(goItem.id).toBeTruthy();
  }, 20000);

  testFn('GET /api/merchant/addon-items/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const category = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Addon Item Detail Cat ${Date.now()}`,
    );
    const item = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      category.id,
      `Contract Addon Item Detail ${Date.now()}`,
    );

    const nextDetail = await getJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/${item.id}`,
      token,
    );
    const goDetail = await getJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/${item.id}`,
      token,
    );

    expect(nextDetail.status).toBeGreaterThanOrEqual(200);
    expect(goDetail.status).toBeGreaterThanOrEqual(200);

    expect(nextDetail.json?.success).toBe(true);
    expect(goDetail.json?.success).toBe(true);

    const nextData = (nextDetail.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goDetail.json?.data ?? {}) as Record<string, unknown>;

    assertAddonItemShape(nextData);
    assertAddonItemShape(goData);
  }, 20000);

  testFn('PUT /api/merchant/addon-items/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Update Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Update Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Update ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Update ${Date.now()}`,
    );

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/${nextItem.id}`,
      { name: `Contract Next Addon Item Updated ${Date.now()}` },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/${goItem.id}`,
      { name: `Contract Go Addon Item Updated ${Date.now()}` },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);

    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);
  }, 20000);

  testFn('PATCH /api/merchant/addon-items/{id}/toggle-active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Toggle Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Toggle Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Toggle ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Toggle ${Date.now()}`,
    );

    const nextToggle = await patchJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/${nextItem.id}/toggle-active`,
      {},
      token,
    );
    const goToggle = await patchJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/${goItem.id}/toggle-active`,
      {},
      token,
    );

    expect(nextToggle.status).toBeGreaterThanOrEqual(200);
    expect(goToggle.status).toBeGreaterThanOrEqual(200);

    expect(nextToggle.json?.success).toBe(true);
    expect(goToggle.json?.success).toBe(true);
  }, 20000);

  testFn('DELETE /api/merchant/addon-items/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Delete Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Delete Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Delete ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Delete ${Date.now()}`,
    );

    const nextDelete = await deleteAddonItem(CONTRACT_NEXT_BASE, token, nextItem.id);
    const goDelete = await deleteAddonItem(CONTRACT_GO_BASE, token, goItem.id);

    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/addon-items/{id}/restore parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Restore Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Restore Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Restore ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Restore ${Date.now()}`,
    );

    await deleteAddonItem(CONTRACT_NEXT_BASE, token, nextItem.id);
    await deleteAddonItem(CONTRACT_GO_BASE, token, goItem.id);

    const nextRestore = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/${nextItem.id}/restore`,
      {},
      token,
    );
    const goRestore = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/${goItem.id}/restore`,
      {},
      token,
    );

    expect(nextRestore.status).toBeGreaterThanOrEqual(200);
    expect(goRestore.status).toBeGreaterThanOrEqual(200);
    expect(nextRestore.json?.success).toBe(true);
    expect(goRestore.json?.success).toBe(true);
  }, 20000);

  testFn('DELETE /api/merchant/addon-items/{id}/permanent-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Permanent Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Permanent Cat ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Permanent ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Permanent ${Date.now()}`,
    );

    await deleteAddonItem(CONTRACT_NEXT_BASE, token, nextItem.id);
    await deleteAddonItem(CONTRACT_GO_BASE, token, goItem.id);

    const nextDelete = await deleteJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/${nextItem.id}/permanent-delete`,
      {},
      token,
    );
    const goDelete = await deleteJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/${goItem.id}/permanent-delete`,
      {},
      token,
    );

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('GET/POST /api/merchant/addon-items/bulk-soft-delete parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Item Bulk Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Item Bulk Cat ${Date.now()}`,
    );

    const nextItemA = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Bulk A ${Date.now()}`,
    );
    const nextItemB = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Next Addon Item Bulk B ${Date.now()}`,
    );
    const goItemA = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Bulk A ${Date.now()}`,
    );
    const goItemB = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Go Addon Item Bulk B ${Date.now()}`,
    );

    const nextToken = await getBulkAddonItemToken(
      CONTRACT_NEXT_BASE,
      token,
      [nextItemA.id, nextItemB.id],
    );
    const goToken = await getBulkAddonItemToken(
      CONTRACT_GO_BASE,
      token,
      [goItemA.id, goItemB.id],
    );

    const nextBulk = await postJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/addon-items/bulk-soft-delete`,
      { ids: [nextItemA.id, nextItemB.id], confirmationToken: nextToken },
      token,
    );
    const goBulk = await postJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/addon-items/bulk-soft-delete`,
      { ids: [goItemA.id, goItemB.id], confirmationToken: goToken },
      token,
    );

    expect(nextBulk.status).toBeGreaterThanOrEqual(200);
    expect(goBulk.status).toBeGreaterThanOrEqual(200);

    expect(nextBulk.json?.success).toBe(true);
    expect(goBulk.json?.success).toBe(true);
  }, 20000);

  testFn('POST /api/merchant/addon-items/bulk-upload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Addon Bulk Upload Cat ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Addon Bulk Upload Cat ${Date.now()}`,
    );

    const nextPayload = [
      { addonCategoryId: nextCategory.id, name: `Contract Next Bulk A ${Date.now()}`, price: 1.75 },
      { addonCategoryId: nextCategory.id, name: `Contract Next Bulk B ${Date.now()}`, price: 2.5 },
    ];
    const goPayload = [
      { addonCategoryId: goCategory.id, name: `Contract Go Bulk A ${Date.now()}`, price: 1.75 },
      { addonCategoryId: goCategory.id, name: `Contract Go Bulk B ${Date.now()}`, price: 2.5 },
    ];

    const nextRes = await bulkUploadAddonItems(CONTRACT_NEXT_BASE, token, nextPayload);
    const goRes = await bulkUploadAddonItems(CONTRACT_GO_BASE, token, goPayload);

    expect(toNumber(nextRes.createdCount)).not.toBeNull();
    expect(toNumber(goRes.createdCount)).not.toBeNull();

    const nextData = Array.isArray(nextRes.data) ? nextRes.data : [];
    const goData = Array.isArray(goRes.data) ? goRes.data : [];

    if (nextData.length > 0) {
      assertAddonItemShape(nextData[0] as Record<string, unknown>);
    }
    if (goData.length > 0) {
      assertAddonItemShape(goData[0] as Record<string, unknown>);
    }
  }, 20000);
});

describe('Contract parity: merchant legacy bulk', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('POST /api/merchant/bulk/menu parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextMenu = await createMerchantMenu(CONTRACT_NEXT_BASE, token, {
      name: `Contract Legacy Bulk Menu Next ${Date.now()}`,
    });
    const goMenu = await createMerchantMenu(CONTRACT_GO_BASE, token, {
      name: `Contract Legacy Bulk Menu Go ${Date.now()}`,
    });

    const payload = {
      operation: 'UPDATE_PRICE',
      menuIds: [nextMenu.id],
      value: 15.75,
    };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/bulk/menu`, payload, token),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/bulk/menu`,
        { ...payload, menuIds: [goMenu.id] },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeLegacyBulkSnapshot((nextRes.json ?? {}) as Record<string, unknown>, 'menuIds');
    const goSnapshot = normalizeLegacyBulkSnapshot((goRes.json ?? {}) as Record<string, unknown>, 'menuIds');

    expect(nextSnapshot).toMatchSnapshot('merchant legacy bulk menu next');
    expect(goSnapshot).toMatchSnapshot('merchant legacy bulk menu go');

    await Promise.all([
      deleteMerchantMenu(CONTRACT_NEXT_BASE, token, nextMenu.id),
      deleteMerchantMenu(CONTRACT_GO_BASE, token, goMenu.id),
    ]);
  }, 20000);

  testFn('POST /api/merchant/bulk/menu invalid payload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = { operation: 'UPDATE_PRICE' };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/bulk/menu`, invalidPayload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/bulk/menu`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('POST /api/merchant/bulk/addon-items parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const nextCategory = await createAddonCategory(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Legacy Bulk Addon Cat Next ${Date.now()}`,
    );
    const goCategory = await createAddonCategory(
      CONTRACT_GO_BASE,
      token,
      `Contract Legacy Bulk Addon Cat Go ${Date.now()}`,
    );

    const nextItem = await createAddonItem(
      CONTRACT_NEXT_BASE,
      token,
      nextCategory.id,
      `Contract Legacy Bulk Addon Item Next ${Date.now()}`,
    );
    const goItem = await createAddonItem(
      CONTRACT_GO_BASE,
      token,
      goCategory.id,
      `Contract Legacy Bulk Addon Item Go ${Date.now()}`,
    );

    const payload = {
      operation: 'UPDATE_PRICE',
      addonItemIds: [nextItem.id],
      value: 2.25,
    };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/bulk/addon-items`, payload, token),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/bulk/addon-items`,
        { ...payload, addonItemIds: [goItem.id] },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeLegacyBulkSnapshot((nextRes.json ?? {}) as Record<string, unknown>, 'addonItemIds');
    const goSnapshot = normalizeLegacyBulkSnapshot((goRes.json ?? {}) as Record<string, unknown>, 'addonItemIds');

    expect(nextSnapshot).toMatchSnapshot('merchant legacy bulk addon items next');
    expect(goSnapshot).toMatchSnapshot('merchant legacy bulk addon items go');

    await Promise.all([
      deleteAddonItem(CONTRACT_NEXT_BASE, token, nextItem.id),
      deleteAddonItem(CONTRACT_GO_BASE, token, goItem.id),
      deleteAddonCategory(CONTRACT_NEXT_BASE, token, nextCategory.id),
      deleteAddonCategory(CONTRACT_GO_BASE, token, goCategory.id),
    ]);
  }, 20000);

  testFn('POST /api/merchant/bulk/addon-items invalid payload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = { operation: 'UPDATE_PRICE' };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/bulk/addon-items`, invalidPayload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/bulk/addon-items`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);
});

describe('Contract parity: merchant billing', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/subscription parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/subscription`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/subscription`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextSub = (nextData.subscription ?? {}) as Record<string, unknown>;
    const goSub = (goData.subscription ?? {}) as Record<string, unknown>;

    expect(String(nextSub.type ?? '')).toBe(String(goSub.type ?? ''));
    expect(String(nextSub.status ?? '')).toBe(String(goSub.status ?? ''));

    const nextDays = toNumber(nextSub.daysRemaining);
    const goDays = toNumber(goSub.daysRemaining);
    if (nextDays !== null && goDays !== null) {
      expect(Math.abs(nextDays - goDays)).toBeLessThanOrEqual(1);
    }

    const nextPricing = (nextData.pricing ?? {}) as Record<string, unknown>;
    const goPricing = (goData.pricing ?? {}) as Record<string, unknown>;
    expect(String(nextPricing.currency ?? '')).toBe(String(goPricing.currency ?? ''));
    expectNumbersClose(toNumber(nextPricing.orderFee), toNumber(goPricing.orderFee));
    expectNumbersClose(toNumber(nextPricing.monthlyPrice), toNumber(goPricing.monthlyPrice));
    expectNumbersClose(toNumber(nextPricing.depositMinimum), toNumber(goPricing.depositMinimum));
  }, 20000);

  testFn('GET /api/merchant/subscription/can-switch parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/subscription/can-switch`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/subscription/can-switch`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(Boolean(nextData.canSwitchToDeposit)).toBe(Boolean(goData.canSwitchToDeposit));
    expect(Boolean(nextData.canSwitchToMonthly)).toBe(Boolean(goData.canSwitchToMonthly));
    expect(String(nextData.currentType ?? '')).toBe(String(goData.currentType ?? ''));
  }, 20000);

  testFn('GET /api/merchant/subscription/history parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/subscription/history?limit=10`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/subscription/history?limit=10`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextHistory = Array.isArray(nextData.history) ? nextData.history : [];
    const goHistory = Array.isArray(goData.history) ? goData.history : [];

    expect(Array.isArray(nextHistory)).toBe(true);
    expect(Array.isArray(goHistory)).toBe(true);

    const nextPagination = (nextData.pagination ?? {}) as Record<string, unknown>;
    const goPagination = (goData.pagination ?? {}) as Record<string, unknown>;
    const nextTotal = toNumber(nextPagination.total);
    const goTotal = toNumber(goPagination.total);
    if (nextTotal !== null && goTotal !== null) {
      expect(Math.abs(nextTotal - goTotal)).toBeLessThanOrEqual(1);
    }
  }, 20000);

  testFn('GET /api/merchant/balance parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/balance`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/balance`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.currency ?? '')).toBe(String(goData.currency ?? ''));
    expect(Boolean(nextData.isLow)).toBe(Boolean(goData.isLow));
    expectNumbersClose(toNumber(nextData.orderFee), toNumber(goData.orderFee));
    expectNumbersClose(toNumber(nextData.estimatedOrders), toNumber(goData.estimatedOrders), 1);
  }, 20000);

  testFn('GET /api/merchant/balance/usage-summary parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/balance/usage-summary`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/balance/usage-summary`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextToday = (nextData.today ?? {}) as Record<string, unknown>;
    const goToday = (goData.today ?? {}) as Record<string, unknown>;
    const nextLast30 = (nextData.last30Days ?? {}) as Record<string, unknown>;
    const goLast30 = (goData.last30Days ?? {}) as Record<string, unknown>;

    expectNumbersClose(toNumber(nextToday.total), toNumber(goToday.total));
    expectNumbersClose(toNumber(nextLast30.total), toNumber(goLast30.total));
  }, 20000);

  testFn('GET /api/merchant/balance/transactions parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/balance/transactions?limit=10&includePending=true`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/balance/transactions?limit=10&includePending=true`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextTransactions = Array.isArray(nextData.transactions) ? nextData.transactions : [];
    const goTransactions = Array.isArray(goData.transactions) ? goData.transactions : [];

    expect(Array.isArray(nextTransactions)).toBe(true);
    expect(Array.isArray(goTransactions)).toBe(true);

    const nextPending = toNumber(nextData.pendingCount);
    const goPending = toNumber(goData.pendingCount);
    if (nextPending !== null && goPending !== null) {
      expect(nextPending).toBe(goPending);
    }
  }, 20000);

  testFn('GET /api/merchant/balance/transactions/export CSV parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getTextWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/balance/transactions/export`, token),
      getTextWithAuth(`${CONTRACT_GO_BASE}/api/merchant/balance/transactions/export`, token),
    ]);

    expect(nextRes.status).toBe(goRes.status);

    if (nextRes.status === 200 && goRes.status === 200) {
      expect(nextRes.contentType?.includes('text/csv')).toBe(true);
      expect(goRes.contentType?.includes('text/csv')).toBe(true);

      const nextRows = parseCsvRows(nextRes.text);
      const goRows = parseCsvRows(goRes.text);

      const nextHeader = nextRows[0] ?? [];
      const goHeader = goRows[0] ?? [];

      expect(nextHeader).toEqual(goHeader);
      expect(nextHeader.length).toBe(7);
      expect(nextHeader[0]).toBe('Date');
      expect(nextHeader[1]).toBe('Time');
      expect(nextHeader[2]).toBe('Type');
      expect(nextHeader[3]?.startsWith('Amount (')).toBe(true);
      expect(nextHeader[4]?.startsWith('Balance Before (')).toBe(true);
      expect(nextHeader[5]?.startsWith('Balance After (')).toBe(true);
      expect(nextHeader[6]).toBe('Description');

      if (nextRows.length > 1) {
        const nextRow = nextRows[1] ?? [];
        expect(nextRow.length).toBe(7);
        expect(isValidCsvDate(nextRow[0] ?? '')).toBe(true);
        expect(isValidCsvTime(nextRow[1] ?? '')).toBe(true);
        expect(String(nextRow[2] ?? '').trim().length).toBeGreaterThan(0);
        expect(isValidCsvNumber(nextRow[3] ?? '')).toBe(true);
        expect(isValidCsvNumber(nextRow[4] ?? '')).toBe(true);
        expect(isValidCsvNumber(nextRow[5] ?? '')).toBe(true);
      }
    }
  }, 20000);

  testFn('GET /api/merchant/balance/group parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/balance/group`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/balance/group`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextGroups = Array.isArray(nextData.groups) ? nextData.groups : [];
    const goGroups = Array.isArray(goData.groups) ? goData.groups : [];

    expect(nextGroups.length).toBe(goGroups.length);
  }, 20000);

  testFn('GET /api/merchant/payment-request parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-request?limit=5`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-request?limit=5`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextRequests = Array.isArray(nextData.requests) ? nextData.requests : [];
    const goRequests = Array.isArray(goData.requests) ? goData.requests : [];

    expect(nextRequests.length).toBe(goRequests.length);
  }, 20000);

  testFn('GET /api/merchant/payment-request/active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-request/active`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-request/active`, token),
    ]);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? null) as Record<string, unknown> | null;
    const goData = (goRes.json?.data ?? null) as Record<string, unknown> | null;

    if (nextData && goData) {
      expect(String(nextData.id ?? '')).toBe(String(goData.id ?? ''));
      expect(String(nextData.status ?? '')).toBe(String(goData.status ?? ''));
    } else {
      expect(Boolean(nextData)).toBe(Boolean(goData));
    }
  }, 20000);
});

describe('Contract parity: merchant staff + drivers + delivery', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/staff parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/staff`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/staff`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;
    const nextStaff = Array.isArray(nextData.staff) ? nextData.staff : [];
    const goStaff = Array.isArray(goData.staff) ? goData.staff : [];

    expect(nextStaff.length).toBe(goStaff.length);
  }, 20000);

  testFn('GET /api/merchant/drivers parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/drivers`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/drivers`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];
    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET /api/merchant/delivery/zones parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/delivery/zones`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/delivery/zones`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];
    expect(nextData.length).toBe(goData.length);
  }, 20000);
});

describe('Contract parity: merchant reports + vouchers + utilities', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/reports parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/reports?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/reports?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.period ?? '')).toBe(String(goData.period ?? ''));
    expect(typeof nextData.summary).toBe('object');
    expect(typeof goData.summary).toBe('object');
    expect(Array.isArray(nextData.dailyRevenue)).toBe(true);
    expect(Array.isArray(goData.dailyRevenue)).toBe(true);

    const nextSummary = (nextData.summary ?? {}) as Record<string, unknown>;
    const goSummary = (goData.summary ?? {}) as Record<string, unknown>;
    expect(toNumber(nextSummary.totalRevenue)).not.toBeNull();
    expect(toNumber(goSummary.totalRevenue)).not.toBeNull();
    expect(toNumber(nextSummary.totalOrders)).not.toBeNull();
    expect(toNumber(goSummary.totalOrders)).not.toBeNull();

    const nextComparison = (nextData.periodComparison ?? {}) as Record<string, unknown>;
    const goComparison = (goData.periodComparison ?? {}) as Record<string, unknown>;
    const nextMetrics = Array.isArray(nextComparison.metrics) ? nextComparison.metrics : [];
    const goMetrics = Array.isArray(goComparison.metrics) ? goComparison.metrics : [];
    expect(nextMetrics.length).toBe(goMetrics.length);

    const nextOrderTypes = Array.isArray(nextData.orderTypeBreakdown) ? nextData.orderTypeBreakdown : [];
    const goOrderTypes = Array.isArray(goData.orderTypeBreakdown) ? goData.orderTypeBreakdown : [];
    expect(nextOrderTypes.length).toBe(goOrderTypes.length);

    const nextStatus = Array.isArray(nextData.orderStatusBreakdown) ? nextData.orderStatusBreakdown : [];
    const goStatus = Array.isArray(goData.orderStatusBreakdown) ? goData.orderStatusBreakdown : [];
    expect(nextStatus.length).toBe(goStatus.length);
  }, 20000);

  testFn('GET /api/merchant/reports/sales-dashboard parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/reports/sales-dashboard?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/reports/sales-dashboard?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(typeof nextData.summary).toBe('object');
    expect(typeof goData.summary).toBe('object');
    expect(Array.isArray(nextData.revenueTrend)).toBe(true);
    expect(Array.isArray(goData.revenueTrend)).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/settings parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/settings`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/settings`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(typeof nextData.customerVouchersEnabled).toBe('boolean');
    expect(typeof nextData.posDiscountsEnabled).toBe('boolean');
    expect(typeof goData.customerVouchersEnabled).toBe('boolean');
    expect(typeof goData.posDiscountsEnabled).toBe('boolean');
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/templates parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/templates/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates/${templateId}`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates/${templateId}`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.id ?? '')).toBe(String(goData.id ?? ''));
    expect(String(nextData.name ?? '')).toBe(String(goData.name ?? ''));
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/templates/{id}/codes parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes?take=5`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes?take=5`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];

    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/templates/{id}/usage parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates/${templateId}/usage?take=5`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates/${templateId}/usage?take=5`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextItems = Array.isArray(nextData.items) ? nextData.items : [];
    const goItems = Array.isArray(goData.items) ? goData.items : [];
    expect(nextItems.length).toBe(goItems.length);

    const nextCursor = (nextData as Record<string, unknown>).nextCursor ?? null;
    const goCursor = (goData as Record<string, unknown>).nextCursor ?? null;
    if (nextCursor === null || nextCursor === undefined) {
      expect(goCursor === null || goCursor === '' || goCursor === undefined).toBe(true);
    } else {
      expect(String(goCursor ?? '')).toBe(String(nextCursor));
    }
  }, 20000);

  testFn('POST /api/merchant/order-vouchers/templates/{id}/codes parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const nextCode = `NEXT${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();
    const goCode = `GO${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();

    const nextCreated = await createVoucherCode(CONTRACT_NEXT_BASE, token, templateId, nextCode);
    const goCreated = await createVoucherCode(CONTRACT_GO_BASE, token, templateId, goCode);

    expect(nextCreated.id).toBeTruthy();
    expect(goCreated.id).toBeTruthy();
    expect(nextCreated.isActive).toBe(true);
    expect(goCreated.isActive).toBe(true);
  }, 20000);

  testFn('PUT /api/merchant/order-vouchers/templates/{id}/codes/{codeId} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const nextCode = `NEXTU${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();
    const goCode = `GOU${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();

    const nextCreated = await createVoucherCode(CONTRACT_NEXT_BASE, token, templateId, nextCode);
    const goCreated = await createVoucherCode(CONTRACT_GO_BASE, token, templateId, goCode);

    const nextUpdate = await putJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes/${nextCreated.id}`,
      { isActive: false },
      token,
    );
    const goUpdate = await putJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes/${goCreated.id}`,
      { isActive: false },
      token,
    );

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);
    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);

    const nextData = (nextUpdate.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goUpdate.json?.data ?? {}) as Record<string, unknown>;
    expect(Boolean(nextData.isActive)).toBe(false);
    expect(Boolean(goData.isActive)).toBe(false);
  }, 20000);

  testFn('DELETE /api/merchant/order-vouchers/templates/{id}/codes/{codeId} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const templateId = await fetchVoucherTemplateId(CONTRACT_NEXT_BASE, token);
    if (!templateId) return;

    const nextCode = `NEXTD${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();
    const goCode = `GOD${Date.now()}${Math.floor(Math.random() * 1000)}`.toUpperCase();

    const nextCreated = await createVoucherCode(CONTRACT_NEXT_BASE, token, templateId, nextCode);
    const goCreated = await createVoucherCode(CONTRACT_GO_BASE, token, templateId, goCode);

    const nextDelete = await deleteJsonWithAuth(
      `${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes/${nextCreated.id}`,
      {},
      token,
    );
    const goDelete = await deleteJsonWithAuth(
      `${CONTRACT_GO_BASE}/api/merchant/order-vouchers/templates/${templateId}/codes/${goCreated.id}`,
      {},
      token,
    );

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('GET /api/merchant/order-vouchers/analytics parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/order-vouchers/analytics?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/order-vouchers/analytics?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(typeof nextData.summary).toBe('object');
    expect(typeof goData.summary).toBe('object');
    expect(Array.isArray(nextData.bySource)).toBe(true);
    expect(Array.isArray(goData.bySource)).toBe(true);

    const nextSummary = (nextData.summary ?? {}) as Record<string, unknown>;
    const goSummary = (goData.summary ?? {}) as Record<string, unknown>;
    expect(toNumber(nextSummary.uses)).not.toBeNull();
    expect(toNumber(goSummary.uses)).not.toBeNull();

    const nextBySource = Array.isArray(nextData.bySource) ? nextData.bySource : [];
    const goBySource = Array.isArray(goData.bySource) ? goData.bySource : [];
    expect(nextBySource.length).toBe(goBySource.length);

    const nextByTemplate = Array.isArray(nextData.byTemplate) ? nextData.byTemplate : [];
    const goByTemplate = Array.isArray(goData.byTemplate) ? goData.byTemplate : [];
    expect(nextByTemplate.length).toBe(goByTemplate.length);
  }, 20000);

  testFn('POST /api/merchant/vouchers/redeem parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchantCode = CONTRACT_MERCHANT_CODE || '';
    if (!merchantCode) return;

    const merchantSnapshot = await snapshotMerchantState(merchantCode);
    const [nextFixture, goFixture] = await Promise.all([
      createVoucherFixture(merchantCode, 'NEXTVOUCHER'),
      createVoucherFixture(merchantCode, 'GOVOUCHER'),
    ]);

    try {
      const [nextRes, goRes] = await Promise.all([
        postJsonWithAuth(
          `${CONTRACT_NEXT_BASE}/api/merchant/vouchers/redeem`,
          { code: nextFixture.code },
          token,
        ),
        postJsonWithAuth(
          `${CONTRACT_GO_BASE}/api/merchant/vouchers/redeem`,
          { code: goFixture.code },
          token,
        ),
      ]);

      expect(nextRes.status).toBeGreaterThanOrEqual(200);
      expect(goRes.status).toBeGreaterThanOrEqual(200);
      expect(nextRes.json?.success).toBe(true);
      expect(goRes.json?.success).toBe(true);

      const nextSnapshot = normalizeVoucherRedeemSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
      const goSnapshot = normalizeVoucherRedeemSnapshot((goRes.json ?? {}) as Record<string, unknown>);

      expect(nextSnapshot).toMatchSnapshot('merchant voucher redeem next');
      expect(goSnapshot).toMatchSnapshot('merchant voucher redeem go');
    } finally {
      await Promise.all([
        cleanupVoucherFixture(nextFixture),
        cleanupVoucherFixture(goFixture),
      ]);
      await restoreMerchantState(merchantSnapshot);
    }
  }, 20000);

  testFn('GET /api/merchant/users parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/users`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/users`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];
    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET /api/merchant/stock-photos parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/stock-photos`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/stock-photos`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];
    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET /api/merchant/menu-books parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/menu-books`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/menu-books`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = Array.isArray(nextRes.json?.data) ? nextRes.json?.data : [];
    const goData = Array.isArray(goRes.json?.data) ? goRes.json?.data : [];
    expect(nextData.length).toBe(goData.length);
  }, 20000);

  testFn('GET/POST /api/merchant/special-prices parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const startDate = formatDateInTimezone(new Date(), tz);
    const endDate = addDaysISO(startDate, 7, tz);

    const nextMenuBook = await createMenuBook(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Menu Book ${Date.now()}`,
    );
    const goMenuBook = await createMenuBook(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Menu Book ${Date.now()}`,
    );

    const payload = {
      name: `Contract Special Price ${Date.now()}`,
      startDate,
      endDate,
      applicableDays: [1, 2, 3],
      isAllDay: false,
      startTime: '09:00',
      endTime: '17:00',
      priceItems: [],
    };

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices`,
        { ...payload, menuBookId: nextMenuBook.id },
        token,
      ),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices`,
        { ...payload, menuBookId: goMenuBook.id },
        token,
      ),
    ]);

    expect(nextCreate.status).toBeGreaterThanOrEqual(200);
    expect(goCreate.status).toBeGreaterThanOrEqual(200);
    expect(nextCreate.json?.success).toBe(true);
    expect(goCreate.json?.success).toBe(true);

    const nextCreateSnapshot = normalizeSpecialPriceDetailSnapshot(
      (nextCreate.json ?? {}) as Record<string, unknown>,
    );
    const goCreateSnapshot = normalizeSpecialPriceDetailSnapshot(
      (goCreate.json ?? {}) as Record<string, unknown>,
    );

    expect(nextCreateSnapshot).toMatchSnapshot('merchant special prices create next');
    expect(goCreateSnapshot).toMatchSnapshot('merchant special prices create go');

    const [nextList, goList] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-prices`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-prices`, token),
    ]);

    expect(nextList.status).toBeGreaterThanOrEqual(200);
    expect(goList.status).toBeGreaterThanOrEqual(200);
    expect(nextList.json?.success).toBe(true);
    expect(goList.json?.success).toBe(true);

    const nextListSnapshot = normalizeSpecialPriceListSnapshot(
      (nextList.json ?? {}) as Record<string, unknown>,
    );
    const goListSnapshot = normalizeSpecialPriceListSnapshot(
      (goList.json ?? {}) as Record<string, unknown>,
    );

    expect(nextListSnapshot).toMatchSnapshot('merchant special prices list next');
    expect(goListSnapshot).toMatchSnapshot('merchant special prices list go');

    const nextCreateData = (nextCreate.json?.data ?? {}) as Record<string, unknown>;
    const goCreateData = (goCreate.json?.data ?? {}) as Record<string, unknown>;
    const nextSpecialId = String(nextCreateData.id ?? '');
    const goSpecialId = String(goCreateData.id ?? '');

    await Promise.all([
      nextSpecialId
        ? deleteJsonWithAuth(
            `${CONTRACT_NEXT_BASE}/api/merchant/special-prices/${nextSpecialId}`,
            {},
            token,
          )
        : Promise.resolve(),
      goSpecialId
        ? deleteJsonWithAuth(
            `${CONTRACT_GO_BASE}/api/merchant/special-prices/${goSpecialId}`,
            {},
            token,
          )
        : Promise.resolve(),
    ]);

    await Promise.all([
      deleteMenuBook(CONTRACT_NEXT_BASE, token, nextMenuBook.id),
      deleteMenuBook(CONTRACT_GO_BASE, token, goMenuBook.id),
    ]);
  }, 20000);

  testFn('PUT/DELETE /api/merchant/special-prices/{id} parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const startDate = formatDateInTimezone(new Date(), tz);
    const endDate = addDaysISO(startDate, 7, tz);

    const nextMenuBook = await createMenuBook(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Menu Book Update ${Date.now()}`,
    );
    const goMenuBook = await createMenuBook(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Menu Book Update ${Date.now()}`,
    );

    const createPayload = {
      name: `Contract Special Price Update ${Date.now()}`,
      startDate,
      endDate,
      applicableDays: [1, 2, 3],
      isAllDay: true,
      priceItems: [],
    };

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices`,
        { ...createPayload, menuBookId: nextMenuBook.id },
        token,
      ),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices`,
        { ...createPayload, menuBookId: goMenuBook.id },
        token,
      ),
    ]);

    expect(nextCreate.json?.success).toBe(true);
    expect(goCreate.json?.success).toBe(true);

    const nextCreateData = (nextCreate.json?.data ?? {}) as Record<string, unknown>;
    const goCreateData = (goCreate.json?.data ?? {}) as Record<string, unknown>;
    const nextId = String(nextCreateData.id ?? '');
    const goId = String(goCreateData.id ?? '');
    expect(nextId).toBeTruthy();
    expect(goId).toBeTruthy();

    const [nextUpdate, goUpdate] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices/${nextId}`,
        { name: `Contract Next Updated ${Date.now()}`, isAllDay: false, startTime: '10:00', endTime: '16:00' },
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices/${goId}`,
        { name: `Contract Go Updated ${Date.now()}`, isAllDay: false, startTime: '10:00', endTime: '16:00' },
        token,
      ),
    ]);

    expect(nextUpdate.status).toBeGreaterThanOrEqual(200);
    expect(goUpdate.status).toBeGreaterThanOrEqual(200);
    expect(nextUpdate.json?.success).toBe(true);
    expect(goUpdate.json?.success).toBe(true);

    const nextUpdateSnapshot = normalizeSpecialPriceDetailSnapshot(
      (nextUpdate.json ?? {}) as Record<string, unknown>,
    );
    const goUpdateSnapshot = normalizeSpecialPriceDetailSnapshot(
      (goUpdate.json ?? {}) as Record<string, unknown>,
    );

    expect(nextUpdateSnapshot).toMatchSnapshot('merchant special prices update next');
    expect(goUpdateSnapshot).toMatchSnapshot('merchant special prices update go');

    const [nextDelete, goDelete] = await Promise.all([
      deleteJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-prices/${nextId}`, {}, token),
      deleteJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-prices/${goId}`, {}, token),
    ]);

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);

    const nextDeleteSnapshot = normalizeSuccessMessageSnapshot(
      (nextDelete.json ?? {}) as Record<string, unknown>,
    );
    const goDeleteSnapshot = normalizeSuccessMessageSnapshot(
      (goDelete.json ?? {}) as Record<string, unknown>,
    );

    expect(nextDeleteSnapshot).toMatchSnapshot('merchant special prices delete next');
    expect(goDeleteSnapshot).toMatchSnapshot('merchant special prices delete go');

    await Promise.all([
      deleteMenuBook(CONTRACT_NEXT_BASE, token, nextMenuBook.id),
      deleteMenuBook(CONTRACT_GO_BASE, token, goMenuBook.id),
    ]);
  }, 20000);

  testFn('POST /api/merchant/special-prices invalid time payload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const startDate = formatDateInTimezone(new Date(), tz);
    const endDate = addDaysISO(startDate, 7, tz);

    const nextMenuBook = await createMenuBook(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Menu Book Invalid ${Date.now()}`,
    );
    const goMenuBook = await createMenuBook(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Menu Book Invalid ${Date.now()}`,
    );

    const payload = {
      name: `Contract Special Price Invalid ${Date.now()}`,
      startDate,
      endDate,
      isAllDay: false,
      startTime: '25:00',
      endTime: '09:00',
      priceItems: [],
    };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices`,
        { ...payload, menuBookId: nextMenuBook.id },
        token,
      ),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices`,
        { ...payload, menuBookId: goMenuBook.id },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);

    await Promise.all([
      deleteMenuBook(CONTRACT_NEXT_BASE, token, nextMenuBook.id),
      deleteMenuBook(CONTRACT_GO_BASE, token, goMenuBook.id),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/special-prices invalid time update parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const startDate = formatDateInTimezone(new Date(), tz);
    const endDate = addDaysISO(startDate, 7, tz);

    const nextMenuBook = await createMenuBook(
      CONTRACT_NEXT_BASE,
      token,
      `Contract Next Menu Book Invalid Update ${Date.now()}`,
    );
    const goMenuBook = await createMenuBook(
      CONTRACT_GO_BASE,
      token,
      `Contract Go Menu Book Invalid Update ${Date.now()}`,
    );

    const createPayload = {
      name: `Contract Special Price Invalid Update ${Date.now()}`,
      startDate,
      endDate,
      isAllDay: true,
      priceItems: [],
    };

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices`,
        { ...createPayload, menuBookId: nextMenuBook.id },
        token,
      ),
      postJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices`,
        { ...createPayload, menuBookId: goMenuBook.id },
        token,
      ),
    ]);

    const nextCreateData = (nextCreate.json?.data ?? {}) as Record<string, unknown>;
    const goCreateData = (goCreate.json?.data ?? {}) as Record<string, unknown>;
    const nextId = String(nextCreateData.id ?? '');
    const goId = String(goCreateData.id ?? '');

    const [nextUpdate, goUpdate] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-prices/${nextId}`,
        { isAllDay: false, startTime: '09:00' },
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-prices/${goId}`,
        { isAllDay: false, startTime: '09:00' },
        token,
      ),
    ]);

    expect(nextUpdate.status).toBeGreaterThanOrEqual(400);
    expect(goUpdate.status).toBeGreaterThanOrEqual(400);
    expect(nextUpdate.json?.success).toBe(false);
    expect(goUpdate.json?.success).toBe(false);

    await Promise.all([
      deleteJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-prices/${nextId}`, {}, token),
      deleteJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-prices/${goId}`, {}, token),
      deleteMenuBook(CONTRACT_NEXT_BASE, token, nextMenuBook.id),
      deleteMenuBook(CONTRACT_GO_BASE, token, goMenuBook.id),
    ]);
  }, 20000);

  testFn('GET /api/merchant/payment/verify parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const created = await createPublicOrder(CONTRACT_NEXT_BASE);
    expect(created.orderNumber).toBeTruthy();
    if (!created.orderNumber) return;

    const query = `orderNumber=${encodeURIComponent(created.orderNumber)}`;
    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment/verify?${query}`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment/verify?${query}`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.orderNumber ?? '')).toBe(String(goData.orderNumber ?? ''));
  }, 30000);

  testFn('POST /api/merchant/receipt/preview parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      postTextWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/receipt/preview`, { receiptSettings: {} }, token),
      postTextWithAuth(`${CONTRACT_GO_BASE}/api/merchant/receipt/preview`, { receiptSettings: {} }, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.contentType?.includes('application/pdf')).toBe(true);
    expect(goRes.contentType?.includes('application/pdf')).toBe(true);
    expect(nextRes.text.length).toBeGreaterThan(0);
    expect(goRes.text.length).toBeGreaterThan(0);
  }, 30000);

  testFn('POST /api/merchant/receipt/preview-html parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      postTextWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/receipt/preview-html`, { receiptSettings: {} }, token),
      postTextWithAuth(`${CONTRACT_GO_BASE}/api/merchant/receipt/preview-html`, { receiptSettings: {} }, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.contentType?.includes('text/html')).toBe(true);
    expect(goRes.contentType?.includes('text/html')).toBe(true);
    expect(nextRes.text.length).toBeGreaterThan(0);
    expect(goRes.text.length).toBeGreaterThan(0);
  }, 30000);
});

describe('Contract parity: merchant analytics', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/analytics/customers parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/analytics/customers?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/analytics/customers?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeCustomerAnalyticsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeCustomerAnalyticsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant analytics customers next');
    expect(goSnapshot).toMatchSnapshot('merchant analytics customers go');
  }, 20000);

  testFn('GET /api/merchant/analytics/menu-performance parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/analytics/menu-performance?period=month`,
        token,
      ),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/analytics/menu-performance?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeMenuPerformanceAnalyticsSnapshot(
      (nextRes.json ?? {}) as Record<string, unknown>,
    );
    const goSnapshot = normalizeMenuPerformanceAnalyticsSnapshot(
      (goRes.json ?? {}) as Record<string, unknown>,
    );

    expect(nextSnapshot).toMatchSnapshot('merchant analytics menu performance next');
    expect(goSnapshot).toMatchSnapshot('merchant analytics menu performance go');
  }, 20000);

  testFn('GET /api/merchant/analytics/sales parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/analytics/sales?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/analytics/sales?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeSalesAnalyticsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeSalesAnalyticsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant analytics sales next');
    expect(goSnapshot).toMatchSnapshot('merchant analytics sales go');
  }, 20000);

  testFn('GET /api/merchant/revenue parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/revenue`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/revenue`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeRevenueSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeRevenueSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant analytics revenue next');
    expect(goSnapshot).toMatchSnapshot('merchant analytics revenue go');
  }, 20000);
});

describe('Contract parity: merchant feedback', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/feedback parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/feedback?limit=10`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/feedback?limit=10`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeFeedbackListSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeFeedbackListSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant feedback list next');
    expect(goSnapshot).toMatchSnapshot('merchant feedback list go');
  }, 20000);

  testFn('GET /api/merchant/feedback/analytics parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/feedback/analytics?period=month`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/feedback/analytics?period=month`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeFeedbackAnalyticsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeFeedbackAnalyticsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant feedback analytics next');
    expect(goSnapshot).toMatchSnapshot('merchant feedback analytics go');
  }, 20000);
});

describe('Contract parity: merchant settings', () => {
  const hasAuthConfig = Boolean(
    CONTRACT_MERCHANT_ACCESS_TOKEN || (CONTRACT_MERCHANT_EMAIL && CONTRACT_MERCHANT_PASSWORD),
  );
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE) && hasAuthConfig;
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/merchant/setup-progress parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/setup-progress`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/setup-progress`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizeSetupProgressSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizeSetupProgressSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant setup progress next');
    expect(goSnapshot).toMatchSnapshot('merchant setup progress go');
  }, 20000);

  testFn('GET /api/merchant/lock-status parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/lock-status`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/lock-status`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(typeof nextData.isLocked).toBe('boolean');
    expect(typeof goData.isLocked).toBe('boolean');
    expect(typeof nextData.reason).toBe('string');
    expect(typeof goData.reason).toBe('string');

    const nextMerchant = (nextData.merchant ?? {}) as Record<string, unknown>;
    const goMerchant = (goData.merchant ?? {}) as Record<string, unknown>;
    expect(String(nextMerchant.code ?? '')).toBe(String(goMerchant.code ?? ''));

    const nextSub = (nextData.subscription ?? {}) as Record<string, unknown>;
    const goSub = (goData.subscription ?? {}) as Record<string, unknown>;

    expect(typeof nextSub.status).toBe('string');
    expect(typeof goSub.status).toBe('string');
    expect(typeof nextSub.type).toBe('string');
    expect(typeof goSub.type).toBe('string');
    expect(typeof nextSub.isValid).toBe('boolean');
    expect(typeof goSub.isValid).toBe('boolean');

    expect(String(nextSub.status ?? '')).toBe(String(goSub.status ?? ''));
    expect(String(nextSub.type ?? '')).toBe(String(goSub.type ?? ''));
    expect(Boolean(nextSub.isValid)).toBe(Boolean(goSub.isValid));

    const nextDays = toNumber(nextSub.daysRemaining);
    const goDays = toNumber(goSub.daysRemaining);
    if (nextDays !== null && goDays !== null) {
      expect(nextDays).toBe(goDays);
    }
  }, 20000);

  testFn('GET /api/merchant/profile parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/profile`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/profile`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(String(nextData.id ?? '')).toBe(String(goData.id ?? ''));
    expect(String(nextData.code ?? '')).toBe(String(goData.code ?? ''));
    expect(String(nextData.currency ?? '')).toBe(String(goData.currency ?? ''));

    expect(typeof nextData.isOpen).toBe('boolean');
    expect(typeof goData.isOpen).toBe('boolean');
    expect(typeof nextData.isManualOverride).toBe('boolean');
    expect(typeof goData.isManualOverride).toBe('boolean');

    const nextHours = Array.isArray(nextData.openingHours) ? nextData.openingHours : [];
    const goHours = Array.isArray(goData.openingHours) ? goData.openingHours : [];
    expect(Array.isArray(nextHours)).toBe(true);
    expect(Array.isArray(goHours)).toBe(true);

    const nextPaymentSettings = (nextData.paymentSettings ?? {}) as Record<string, unknown>;
    const goPaymentSettings = (goData.paymentSettings ?? {}) as Record<string, unknown>;
    if (Object.keys(nextPaymentSettings).length > 0 || Object.keys(goPaymentSettings).length > 0) {
      expect(typeof nextPaymentSettings.payAtCashierEnabled).toBe('boolean');
      expect(typeof goPaymentSettings.payAtCashierEnabled).toBe('boolean');
      expect(typeof nextPaymentSettings.manualTransferEnabled).toBe('boolean');
      expect(typeof goPaymentSettings.manualTransferEnabled).toBe('boolean');
    }

    const nextAccounts = Array.isArray(nextData.paymentAccounts) ? nextData.paymentAccounts : [];
    const goAccounts = Array.isArray(goData.paymentAccounts) ? goData.paymentAccounts : [];
    expect(Array.isArray(nextAccounts)).toBe(true);
    expect(Array.isArray(goAccounts)).toBe(true);
    if (nextAccounts.length > 0 && goAccounts.length > 0) {
      const nextAccount = nextAccounts[0] as Record<string, unknown>;
      const goAccount = goAccounts[0] as Record<string, unknown>;
      expect(typeof nextAccount.type).toBe('string');
      expect(typeof goAccount.type).toBe('string');
    }

    const nextBalance = (nextData.merchantBalance ?? {}) as Record<string, unknown>;
    const goBalance = (goData.merchantBalance ?? {}) as Record<string, unknown>;
    const nextBalanceValue = toNumber(nextBalance.balance);
    const goBalanceValue = toNumber(goBalance.balance);
    if (nextBalanceValue !== null && goBalanceValue !== null) {
      expect(nextBalanceValue).toBe(goBalanceValue);
    }
  }, 20000);

  testFn('GET /api/merchant/pos-settings parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/pos-settings`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/pos-settings`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizePosSettingsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizePosSettingsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant pos settings get next');
    expect(goSnapshot).toMatchSnapshot('merchant pos settings get go');
  }, 20000);

  testFn('PUT /api/merchant/pos-settings parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextBaseline, goBaseline] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/pos-settings`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/pos-settings`, token),
    ]);

    expect(nextBaseline.json?.success).toBe(true);
    expect(goBaseline.json?.success).toBe(true);

    const payload = extractPosPayload((nextBaseline.json ?? {}) as Record<string, unknown>);

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/pos-settings`, payload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/pos-settings`, payload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizePosSettingsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizePosSettingsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant pos settings put next');
    expect(goSnapshot).toMatchSnapshot('merchant pos settings put go');

    const restoreNext = extractPosPayload((nextBaseline.json ?? {}) as Record<string, unknown>);
    const restoreGo = extractPosPayload((goBaseline.json ?? {}) as Record<string, unknown>);

    await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/pos-settings`, restoreNext, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/pos-settings`, restoreGo, token),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/pos-settings invalid payload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      editOrder: { enabled: true },
    };

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/pos-settings`, invalidPayload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/pos-settings`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('GET /api/merchant/payment-settings parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-settings`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-settings`, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizePaymentSettingsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizePaymentSettingsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant payment settings get next');
    expect(goSnapshot).toMatchSnapshot('merchant payment settings get go');
  }, 20000);

  testFn('PUT /api/merchant/payment-settings parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextBaseline, goBaseline] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-settings`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-settings`, token),
    ]);

    expect(nextBaseline.json?.success).toBe(true);
    expect(goBaseline.json?.success).toBe(true);

    const payload = extractPaymentPayload((nextBaseline.json ?? {}) as Record<string, unknown>);

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-settings`, payload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-settings`, payload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextSnapshot = normalizePaymentSettingsSnapshot((nextRes.json ?? {}) as Record<string, unknown>);
    const goSnapshot = normalizePaymentSettingsSnapshot((goRes.json ?? {}) as Record<string, unknown>);

    expect(nextSnapshot).toMatchSnapshot('merchant payment settings put next');
    expect(goSnapshot).toMatchSnapshot('merchant payment settings put go');

    const restoreNext = extractPaymentPayload((nextBaseline.json ?? {}) as Record<string, unknown>);
    const restoreGo = extractPaymentPayload((goBaseline.json ?? {}) as Record<string, unknown>);

    await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-settings`, restoreNext, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-settings`, restoreGo, token),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/payment-settings invalid payload parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      settings: {
        payAtCashierEnabled: true,
        manualTransferEnabled: true,
        qrisEnabled: false,
        requirePaymentProof: false,
        qrisImageUrl: null,
        qrisImageMeta: null,
        qrisImageUploadedAt: null,
      },
      accounts: [],
    };

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/payment-settings`, invalidPayload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/payment-settings`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('PUT/DELETE /api/merchant/delete-pin parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const payload = { pin: '1234' };

    const [nextSet, goSet] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/delete-pin`, payload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/delete-pin`, payload, token),
    ]);

    expect(nextSet.status).toBeGreaterThanOrEqual(200);
    expect(goSet.status).toBeGreaterThanOrEqual(200);

    expect(nextSet.json?.success).toBe(true);
    expect(goSet.json?.success).toBe(true);

    const [nextDelete, goDelete] = await Promise.all([
      deleteJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/delete-pin`, {}, token),
      deleteJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/delete-pin`, {}, token),
    ]);

    expect(nextDelete.status).toBeGreaterThanOrEqual(200);
    expect(goDelete.status).toBeGreaterThanOrEqual(200);
    expect(nextDelete.json?.success).toBe(true);
    expect(goDelete.json?.success).toBe(true);
  }, 20000);

  testFn('PUT /api/merchant/toggle-open parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/toggle-open`, { isOpen: false }, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/toggle-open`, { isOpen: false }, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(typeof nextData.isOpen).toBe('boolean');
    expect(typeof goData.isOpen).toBe('boolean');

    await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/toggle-open`, { isManualOverride: false }, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/toggle-open`, { isManualOverride: false }, token),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/opening-hours parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextBaseline, goBaseline] = await Promise.all([
      fetchOpeningHoursFromProfile(CONTRACT_NEXT_BASE, token),
      fetchOpeningHoursFromProfile(CONTRACT_GO_BASE, token),
    ]);

    const openingHours = [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', isClosed: true },
    ];

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/opening-hours`,
        { openingHours },
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/opening-hours`,
        { openingHours },
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);
    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;
    const nextHours = Array.isArray(nextData.openingHours) ? nextData.openingHours : [];
    const goHours = Array.isArray(goData.openingHours) ? goData.openingHours : [];

    expect(nextHours.length).toBe(openingHours.length);
    expect(goHours.length).toBe(openingHours.length);

    await Promise.all([
      restoreOpeningHours(CONTRACT_NEXT_BASE, token, nextBaseline),
      restoreOpeningHours(CONTRACT_GO_BASE, token, goBaseline),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/opening-hours invalid payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      openingHours: [{ dayOfWeek: 9, openTime: '09:00', closeTime: '17:00', isClosed: false }],
    };

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/opening-hours`,
        invalidPayload,
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/opening-hours`,
        invalidPayload,
        token,
      ),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('PUT /api/merchant/opening-hours invalid time payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      openingHours: [{ dayOfWeek: 0, openTime: '25:00', closeTime: '17:00', isClosed: false }],
    };

    const [nextRes, goRes] = await Promise.all([
      putJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/opening-hours`, invalidPayload, token),
      putJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/opening-hours`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('GET/POST/DELETE /api/merchant/special-hours parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const baseDate = formatDateInTimezone(new Date(), tz);
    const dateISO = addDaysISO(baseDate, 7, tz);

    const payload = {
      date: dateISO,
      name: `Contract Special ${Date.now()}`,
      isClosed: false,
      openTime: '10:00',
      closeTime: '16:00',
      isDineInEnabled: true,
    };

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-hours`, payload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-hours`, payload, token),
    ]);

    expect(nextCreate.status).toBeGreaterThanOrEqual(200);
    expect(goCreate.status).toBeGreaterThanOrEqual(200);
    expect(nextCreate.json?.success).toBe(true);
    expect(goCreate.json?.success).toBe(true);

    const nextData = (nextCreate.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goCreate.json?.data ?? {}) as Record<string, unknown>;

    const [nextList, goList] = await Promise.all([
      getJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-hours?from=${dateISO}&to=${dateISO}`,
        token,
      ),
      getJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-hours?from=${dateISO}&to=${dateISO}`,
        token,
      ),
    ]);

    expect(nextList.status).toBeGreaterThanOrEqual(200);
    expect(goList.status).toBeGreaterThanOrEqual(200);
    expect(nextList.json?.success).toBe(true);
    expect(goList.json?.success).toBe(true);

    const nextItems = Array.isArray(nextList.json?.data) ? nextList.json?.data : [];
    const goItems = Array.isArray(goList.json?.data) ? goList.json?.data : [];

    const nextHasDate = nextItems.some(
      (item) => String((item as Record<string, unknown>).date ?? '').slice(0, 10) === dateISO,
    );
    const goHasDate = goItems.some(
      (item) => String((item as Record<string, unknown>).date ?? '').slice(0, 10) === dateISO,
    );

    expect(nextHasDate).toBe(true);
    expect(goHasDate).toBe(true);

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);
  }, 20000);

  testFn('POST /api/merchant/special-hours invalid payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-hours`, { name: 'No date' }, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-hours`, { name: 'No date' }, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('POST /api/merchant/special-hours invalid time payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const baseDate = formatDateInTimezone(new Date(), tz);
    const dateISO = addDaysISO(baseDate, 8, tz);

    const payload = {
      date: dateISO,
      isClosed: false,
      openTime: '25:00',
      closeTime: '16:00',
    };

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-hours`, payload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-hours`, payload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);
  }, 20000);

  testFn('PUT /api/merchant/special-hours/{id} invalid time payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const baseDate = formatDateInTimezone(new Date(), tz);
    const dateISO = addDaysISO(baseDate, 9, tz);

    const payload = {
      date: dateISO,
      isClosed: false,
      openTime: '10:00',
      closeTime: '16:00',
    };

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/special-hours`, payload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/special-hours`, payload, token),
    ]);

    const nextCreateData = (nextCreate.json?.data ?? {}) as Record<string, unknown>;
    const goCreateData = (goCreate.json?.data ?? {}) as Record<string, unknown>;
    const nextId = String(nextCreateData.id ?? '');
    const goId = String(goCreateData.id ?? '');

    const [nextUpdate, goUpdate] = await Promise.all([
      putJsonWithAuth(
        `${CONTRACT_NEXT_BASE}/api/merchant/special-hours/${nextId}`,
        { openTime: '25:00' },
        token,
      ),
      putJsonWithAuth(
        `${CONTRACT_GO_BASE}/api/merchant/special-hours/${goId}`,
        { openTime: '25:00' },
        token,
      ),
    ]);

    expect(nextUpdate.status).toBeGreaterThanOrEqual(400);
    expect(goUpdate.status).toBeGreaterThanOrEqual(400);
    expect(nextUpdate.json?.success).toBe(false);
    expect(goUpdate.json?.success).toBe(false);

    await Promise.all([
      cleanupSpecialHoursByDate(CONTRACT_NEXT_BASE, token, dateISO),
      cleanupSpecialHoursByDate(CONTRACT_GO_BASE, token, dateISO),
    ]);
  }, 20000);

  testFn('GET/POST/DELETE /api/merchant/mode-schedules parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const payload = {
      enabled: true,
      schedules: [
        {
          mode: 'TAKEAWAY',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      ],
    };

    const [nextCreate, goCreate] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/mode-schedules`, payload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/mode-schedules`, payload, token),
    ]);

    expect(nextCreate.status).toBeGreaterThanOrEqual(200);
    expect(goCreate.status).toBeGreaterThanOrEqual(200);
    expect(nextCreate.json?.success).toBe(true);
    expect(goCreate.json?.success).toBe(true);

    const [nextList, goList] = await Promise.all([
      getJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/mode-schedules`, token),
      getJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/mode-schedules`, token),
    ]);

    expect(nextList.status).toBeGreaterThanOrEqual(200);
    expect(goList.status).toBeGreaterThanOrEqual(200);
    expect(nextList.json?.success).toBe(true);
    expect(goList.json?.success).toBe(true);

    const nextData = (nextList.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goList.json?.data ?? {}) as Record<string, unknown>;

    const nextSchedules = Array.isArray(nextData.schedules) ? nextData.schedules : [];
    const goSchedules = Array.isArray(goData.schedules) ? goData.schedules : [];

    expect(Array.isArray(nextSchedules)).toBe(true);
    expect(Array.isArray(goSchedules)).toBe(true);

    await Promise.all([
      cleanupModeSchedules(CONTRACT_NEXT_BASE, token, 'TAKEAWAY', 1),
      cleanupModeSchedules(CONTRACT_GO_BASE, token, 'TAKEAWAY', 1),
    ]);
  }, 20000);

  testFn('POST /api/merchant/mode-schedules invalid payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      enabled: true,
      schedules: [{ mode: 'INVALID', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/mode-schedules`, invalidPayload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/mode-schedules`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('POST /api/merchant/mode-schedules invalid time payload (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const invalidPayload = {
      enabled: true,
      schedules: [{ mode: 'TAKEAWAY', dayOfWeek: 1, startTime: '25:00', endTime: '17:00' }],
    };

    const [nextRes, goRes] = await Promise.all([
      postJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/mode-schedules`, invalidPayload, token),
      postJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/mode-schedules`, invalidPayload, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);

  testFn('DELETE /api/merchant/mode-schedules missing query params (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const [nextRes, goRes] = await Promise.all([
      deleteJsonWithAuth(`${CONTRACT_NEXT_BASE}/api/merchant/mode-schedules`, {}, token),
      deleteJsonWithAuth(`${CONTRACT_GO_BASE}/api/merchant/mode-schedules`, {}, token),
    ]);

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);
    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);
});
