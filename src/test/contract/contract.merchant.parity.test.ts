import { describe, expect, it } from 'vitest';
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
  hasRequired,
  postJsonWithAuth,
  putJsonWithAuth,
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

async function fetchMerchant(baseUrl: string, code: string) {
  const res = await getJson(`${baseUrl}/api/public/merchants/${code}`);
  if (!res.json?.success) return null;
  return res.json?.data as MerchantRecord;
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
  expect(res.json?.success).toBe(true);
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

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const today = formatDateInTimezone(new Date(), tz);
    const reservationDate = CONTRACT_RESERVATION_DATE || addDaysISO(today, 2, tz);
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
  }, 20000);

  testFn('GET /api/merchant/reservations/active parity (Next vs Go)', async () => {
    const token = await getMerchantAccessToken(CONTRACT_NEXT_BASE);
    expect(token).toBeTruthy();
    if (!token) return;

    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');
    const today = formatDateInTimezone(new Date(), tz);
    const reservationDate = CONTRACT_RESERVATION_DATE || addDaysISO(today, 2, tz);
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
});
