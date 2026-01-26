import { describe, expect, it } from 'vitest';
import {
  CONTRACT_AVAILABLE_TIMES_MODE,
  CONTRACT_CUSTOMER_EMAIL,
  CONTRACT_CUSTOMER_NAME,
  CONTRACT_CUSTOMER_PHONE,
  CONTRACT_DELIVERY_ADDRESS,
  CONTRACT_DELIVERY_LAT,
  CONTRACT_DELIVERY_LNG,
  CONTRACT_GO_BASE,
  CONTRACT_GROUP_HOST_NAME,
  CONTRACT_GROUP_JOIN_NAME,
  CONTRACT_GROUP_ORDER_TYPE,
  CONTRACT_MENU_ID,
  CONTRACT_MERCHANT_CODE,
  CONTRACT_NEXT_BASE,
  CONTRACT_ORDER_TYPE,
  CONTRACT_PARTY_SIZE,
  CONTRACT_PAYMENT_METHOD,
  CONTRACT_QUANTITY,
  CONTRACT_QUOTE_LAT,
  CONTRACT_QUOTE_LNG,
  CONTRACT_RESERVATION_DATE,
  CONTRACT_RESERVATION_TIME,
  getJson,
  hasRequired,
  postJson,
  toNumber,
} from '@/test/contract/helpers';

type JsonValue = Record<string, unknown> | null;

type CreatedOrder = {
  orderNumber: string;
  trackingToken: string;
  totalAmount: number | null;
  orderType: string | null;
};

function buildOrderPayload() {
  return {
    merchantCode: CONTRACT_MERCHANT_CODE,
    customerName: CONTRACT_CUSTOMER_NAME,
    customerEmail: CONTRACT_CUSTOMER_EMAIL,
    customerPhone: CONTRACT_CUSTOMER_PHONE,
    orderType: CONTRACT_ORDER_TYPE,
    paymentMethod: CONTRACT_PAYMENT_METHOD,
    deliveryAddress: CONTRACT_DELIVERY_ADDRESS,
    deliveryLatitude: CONTRACT_DELIVERY_LAT,
    deliveryLongitude: CONTRACT_DELIVERY_LNG,
    items: [
      {
        menuId: CONTRACT_MENU_ID,
        quantity: Number.isFinite(CONTRACT_QUANTITY) && CONTRACT_QUANTITY > 0 ? CONTRACT_QUANTITY : 1,
      },
    ],
  };
}

async function createOrder(baseUrl: string): Promise<CreatedOrder> {
  const payload = buildOrderPayload();
  const res = await postJson(`${baseUrl}/api/public/orders`, payload);

  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.json?.success).toBe(true);

  const data = (res.json?.data ?? {}) as Record<string, unknown>;
  const orderNumber = String(data.orderNumber ?? '');
  const trackingToken = String(data.trackingToken ?? '');

  return {
    orderNumber,
    trackingToken,
    totalAmount: toNumber(data.totalAmount),
    orderType: (data.orderType as string) || null,
  };
}

async function fetchMerchant(baseUrl: string, code: string) {
  const res = await getJson(`${baseUrl}/api/public/merchants/${code}`);
  if (!res.json?.success) return null;
  return res.json?.data as Record<string, unknown>;
}

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

function parseNumber(value: unknown): number | null {
  const asNumber = toNumber(value);
  return asNumber === null ? null : asNumber;
}

describe('Contract parity: public order detail + tracking', () => {
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE, CONTRACT_MENU_ID);
  const testFn = shouldRun ? it : it.skip;

  testFn('GET /api/public/orders/{orderNumber} returns consistent totals (Next vs Go)', async () => {
    const created = await createOrder(CONTRACT_NEXT_BASE);

    const nextRes = await getJson(
      `${CONTRACT_NEXT_BASE}/api/public/orders/${created.orderNumber}?token=${created.trackingToken}`,
    );
    const goRes = await getJson(
      `${CONTRACT_GO_BASE}/api/public/orders/${created.orderNumber}?token=${created.trackingToken}`,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(nextData.orderNumber).toBe(goData.orderNumber);
    expect(nextData.orderType).toBe(goData.orderType);

    const nextTotal = parseNumber(nextData.totalAmount);
    const goTotal = parseNumber(goData.totalAmount);

    if (nextTotal !== null && goTotal !== null) {
      expect(Math.abs(nextTotal - goTotal)).toBeLessThanOrEqual(0.01);
    }
  }, 20000);

  testFn('GET /api/public/orders/{orderNumber}/group-details matches non-group response (Next vs Go)', async () => {
    const created = await createOrder(CONTRACT_NEXT_BASE);

    const nextRes = await getJson(
      `${CONTRACT_NEXT_BASE}/api/public/orders/${created.orderNumber}/group-details?token=${created.trackingToken}`,
    );
    const goRes = await getJson(
      `${CONTRACT_GO_BASE}/api/public/orders/${created.orderNumber}/group-details?token=${created.trackingToken}`,
    );

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(nextData.isGroupOrder).toBe(false);
    expect(goData.isGroupOrder).toBe(false);
  }, 20000);

  testFn('GET /api/public/orders/{orderNumber}/feedback returns consistent empty state (Next vs Go)', async () => {
    const created = await createOrder(CONTRACT_NEXT_BASE);

    const nextRes = await getJson(
      `${CONTRACT_NEXT_BASE}/api/public/orders/${created.orderNumber}/feedback?token=${created.trackingToken}`,
    );
    const goRes = await getJson(
      `${CONTRACT_GO_BASE}/api/public/orders/${created.orderNumber}/feedback?token=${created.trackingToken}`,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    expect(nextRes.json?.hasFeedback).toBe(false);
    expect(goRes.json?.hasFeedback).toBe(false);
  }, 20000);

  testFn('POST /api/public/orders/{orderNumber}/feedback rejects non-delivery orders (Next vs Go)', async () => {
    const created = await createOrder(CONTRACT_NEXT_BASE);

    const payload = {
      overallRating: 5,
      serviceRating: 5,
      foodRating: 5,
      comment: 'Contract test feedback',
    };

    const nextRes = await postJson(
      `${CONTRACT_NEXT_BASE}/api/public/orders/${created.orderNumber}/feedback?token=${created.trackingToken}`,
      payload,
    );
    const goRes = await postJson(
      `${CONTRACT_GO_BASE}/api/public/orders/${created.orderNumber}/feedback?token=${created.trackingToken}`,
      payload,
    );

    expect(nextRes.status).toBeGreaterThanOrEqual(400);
    expect(goRes.status).toBeGreaterThanOrEqual(400);

    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);
  }, 20000);
});

describe('Contract parity: public group-order flows', () => {
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE);
  const testFn = shouldRun ? it : it.skip;

  async function createGroupSession(baseUrl: string) {
    const payload = {
      merchantCode: CONTRACT_MERCHANT_CODE,
      orderType: CONTRACT_GROUP_ORDER_TYPE,
      hostName: CONTRACT_GROUP_HOST_NAME,
    };

    const res = await postJson(`${baseUrl}/api/public/group-order`, payload);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.json?.success).toBe(true);

    const data = (res.json?.data ?? {}) as Record<string, unknown>;
    return {
      sessionCode: String(data.sessionCode ?? ''),
      deviceId: String(data.deviceId ?? ''),
    };
  }

  async function joinGroupSession(baseUrl: string, code: string) {
    const res = await postJson(`${baseUrl}/api/public/group-order/${code}/join`, {
      name: CONTRACT_GROUP_JOIN_NAME,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.json?.success).toBe(true);

    const data = (res.json?.data ?? {}) as Record<string, unknown>;
    return {
      sessionCode: String(data.sessionCode ?? ''),
      deviceId: String(data.deviceId ?? ''),
    };
  }

  testFn('create + join + submit (expected NO_ITEMS) works in Next and Go', async () => {
    const nextSession = await createGroupSession(CONTRACT_NEXT_BASE);
    await joinGroupSession(CONTRACT_NEXT_BASE, nextSession.sessionCode);

    const nextSubmit = await postJson(
      `${CONTRACT_NEXT_BASE}/api/public/group-order/${nextSession.sessionCode}/submit`,
      {
        deviceId: nextSession.deviceId,
        customerName: CONTRACT_CUSTOMER_NAME,
        customerEmail: CONTRACT_CUSTOMER_EMAIL,
      },
    );

    expect(nextSubmit.status).toBeGreaterThanOrEqual(400);
    expect(nextSubmit.json?.success).toBe(false);

    const goSession = await createGroupSession(CONTRACT_GO_BASE);
    await joinGroupSession(CONTRACT_GO_BASE, goSession.sessionCode);

    const goSubmit = await postJson(
      `${CONTRACT_GO_BASE}/api/public/group-order/${goSession.sessionCode}/submit`,
      {
        deviceId: goSession.deviceId,
        customerName: CONTRACT_CUSTOMER_NAME,
        customerEmail: CONTRACT_CUSTOMER_EMAIL,
      },
    );

    expect(goSubmit.status).toBeGreaterThanOrEqual(400);
    expect(goSubmit.json?.success).toBe(false);
  }, 20000);
});

describe('Contract parity: reservations + availability + delivery quote', () => {
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE, CONTRACT_MENU_ID);
  const testFn = shouldRun ? it : it.skip;

  testFn('POST /api/public/reservations parity (Next vs Go)', async () => {
    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const tz = String(merchant?.timezone ?? 'Australia/Sydney');

    const today = formatDateInTimezone(new Date(), tz);
    const reservationTime = CONTRACT_RESERVATION_TIME || '19:00';
    const candidateDates = CONTRACT_RESERVATION_DATE
      ? [CONTRACT_RESERVATION_DATE]
      : [
          addDaysISO(today, 2, tz),
          addDaysISO(today, 3, tz),
          addDaysISO(today, 4, tz),
          addDaysISO(today, 5, tz),
          addDaysISO(today, 6, tz),
        ];

    let lastNext: { status: number; json: JsonValue } | null = null;
    let lastGo: { status: number; json: JsonValue } | null = null;

    for (const reservationDate of candidateDates) {
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

      const nextRes = await postJson(`${CONTRACT_NEXT_BASE}/api/public/reservations`, payload);
      const goRes = await postJson(`${CONTRACT_GO_BASE}/api/public/reservations`, payload);

      lastNext = nextRes;
      lastGo = goRes;

      expect(nextRes.status).toBeGreaterThanOrEqual(200);
      expect(goRes.status).toBeGreaterThanOrEqual(200);

      const nextSuccess = nextRes.json?.success === true;
      const goSuccess = goRes.json?.success === true;

      if (nextSuccess && goSuccess) {
        const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
        const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

        expect(nextData.reservationDate).toBe(goData.reservationDate);
        expect(nextData.reservationTime).toBe(goData.reservationTime);
        return;
      }

      if (nextSuccess !== goSuccess) {
        throw new Error(
          `Reservation parity mismatch for ${reservationDate}: Next=${JSON.stringify(
            nextRes.json,
          )} Go=${JSON.stringify(goRes.json)}`,
        );
      }
    }

    throw new Error(
      `Reservation parity failed for all dates. Last Next=${JSON.stringify(
        lastNext?.json,
      )} Last Go=${JSON.stringify(lastGo?.json)}`,
    );
  }, 20000);

  testFn('GET /api/public/merchants/{code}/available-times parity (Next vs Go)', async () => {
    const nextRes = await getJson(
      `${CONTRACT_NEXT_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}/available-times?mode=${CONTRACT_AVAILABLE_TIMES_MODE}&intervalMinutes=15`,
    );
    const goRes = await getJson(
      `${CONTRACT_GO_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}/available-times?mode=${CONTRACT_AVAILABLE_TIMES_MODE}&intervalMinutes=15`,
    );

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(nextData.mode).toBe(goData.mode);
    expect(nextData.intervalMinutes).toBe(goData.intervalMinutes);

    const nextSlots = Array.isArray(nextData.slots) ? nextData.slots : [];
    const goSlots = Array.isArray(goData.slots) ? goData.slots : [];

    expect(nextSlots.length).toBe(goSlots.length);
    if (nextSlots.length > 0 && goSlots.length > 0) {
      expect(nextSlots[0]).toBe(goSlots[0]);
    }
  });

  testFn('POST /api/public/merchants/{code}/delivery/quote parity (Next vs Go)', async () => {
    const merchant = await fetchMerchant(CONTRACT_NEXT_BASE, CONTRACT_MERCHANT_CODE || '');
    const fallbackLat = parseNumber(merchant?.latitude);
    const fallbackLng = parseNumber(merchant?.longitude);

    const latitude = CONTRACT_QUOTE_LAT ?? fallbackLat;
    const longitude = CONTRACT_QUOTE_LNG ?? fallbackLng;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const payload = { latitude, longitude };

    const nextRes = await postJson(
      `${CONTRACT_NEXT_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}/delivery/quote`,
      payload,
    );
    const goRes = await postJson(
      `${CONTRACT_GO_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}/delivery/quote`,
      payload,
    );

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    const nextFee = parseNumber(nextData.feeAmount);
    const goFee = parseNumber(goData.feeAmount);
    if (nextFee !== null && goFee !== null) {
      expect(Math.abs(nextFee - goFee)).toBeLessThanOrEqual(0.01);
    }

    const nextDistance = parseNumber(nextData.distanceKm);
    const goDistance = parseNumber(goData.distanceKm);
    if (nextDistance !== null && goDistance !== null) {
      expect(Math.abs(nextDistance - goDistance)).toBeLessThanOrEqual(0.01);
    }
  });
});
