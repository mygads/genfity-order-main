import { describe, expect, it } from 'vitest';
import {
  CONTRACT_CUSTOMER_EMAIL,
  CONTRACT_CUSTOMER_NAME,
  CONTRACT_CUSTOMER_PHONE,
  CONTRACT_DELIVERY_ADDRESS,
  CONTRACT_DELIVERY_LAT,
  CONTRACT_DELIVERY_LNG,
  CONTRACT_GO_BASE,
  CONTRACT_MENU_ID,
  CONTRACT_MERCHANT_CODE,
  CONTRACT_NEXT_BASE,
  CONTRACT_ORDER_TYPE,
  CONTRACT_PAYMENT_METHOD,
  CONTRACT_QUANTITY,
  CONTRACT_VOUCHER_CODE,
  CONTRACT_VOUCHER_ITEM_SUBTOTAL,
  getJson,
  hasRequired,
  postJson,
  toNumber,
} from '@/test/contract/helpers';

type JsonValue = Record<string, unknown> | null;

type PricingSnapshot = {
  orderType?: string | null;
  currency?: string | null;
  itemCount: number;
  itemSubtotalSum: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  serviceChargeAmount: number | null;
  packagingFeeAmount: number | null;
  deliveryFeeAmount: number | null;
  discountAmount: number | null;
  totalAmount: number | null;
  trackingToken?: string | null;
};

function extractPricing(json: JsonValue): PricingSnapshot {
  const data = (json?.data ?? {}) as Record<string, unknown>;
  const orderItemsRaw = (data.orderItems ?? data.items ?? []) as Array<Record<string, unknown>>;
  const itemSubtotalSum = orderItemsRaw.length
    ? orderItemsRaw.reduce((acc, item) => {
        const subtotal = toNumber(item.subtotal ?? item.total ?? item.price ?? item.menuPrice);
        const quantity = toNumber(item.quantity) ?? 0;
        if (subtotal !== null) return acc + subtotal;
        if (item.price !== undefined && quantity) return acc + (toNumber(item.price) ?? 0) * quantity;
        return acc;
      }, 0)
    : null;

  const merchant = (data.merchant ?? {}) as Record<string, unknown>;

  return {
    orderType: (data.orderType as string) || null,
    currency: (merchant.currency as string) || (data.currency as string) || null,
    itemCount: orderItemsRaw.length,
    itemSubtotalSum,
    subtotal: toNumber(data.subtotal),
    taxAmount: toNumber(data.taxAmount),
    serviceChargeAmount: toNumber(data.serviceChargeAmount),
    packagingFeeAmount: toNumber(data.packagingFeeAmount),
    deliveryFeeAmount: toNumber(data.deliveryFeeAmount),
    discountAmount: toNumber(data.discountAmount),
    totalAmount: toNumber(data.totalAmount),
    trackingToken: (data.trackingToken as string) || null,
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

describe('Contract parity: POST /api/public/orders', () => {
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE, CONTRACT_MENU_ID);

  const testFn = shouldRun ? it : it.skip;

  testFn('returns compatible pricing and item totals (Next vs Go)', async () => {
    const payload = buildOrderPayload();

    const nextRes = await postJson(`${CONTRACT_NEXT_BASE}/api/public/orders`, payload);
    const goRes = await postJson(`${CONTRACT_GO_BASE}/api/public/orders`, payload);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextPricing = extractPricing(nextRes.json);
    const goPricing = extractPricing(goRes.json);

    expect(nextPricing.itemCount).toBe(goPricing.itemCount);
    expect(nextPricing.orderType).toBe(goPricing.orderType);

    const numericKeys: Array<keyof PricingSnapshot> = [
      'subtotal',
      'taxAmount',
      'serviceChargeAmount',
      'packagingFeeAmount',
      'deliveryFeeAmount',
      'discountAmount',
      'totalAmount',
    ];

    for (const key of numericKeys) {
      const nextValue = nextPricing[key];
      const goValue = goPricing[key];
      if (typeof nextValue !== 'number' || typeof goValue !== 'number') continue;
      expect(Math.abs(nextValue - goValue)).toBeLessThanOrEqual(0.01);
    }

    if (typeof nextPricing.itemSubtotalSum === 'number' && typeof goPricing.itemSubtotalSum === 'number') {
      expect(Math.abs(nextPricing.itemSubtotalSum - goPricing.itemSubtotalSum)).toBeLessThanOrEqual(0.01);
    }

    expect(nextPricing.trackingToken).toBeTruthy();
    expect(goPricing.trackingToken).toBeTruthy();
  });

  testFn('returns validation error for empty items', async () => {
    const payload = {
      merchantCode: CONTRACT_MERCHANT_CODE,
      customerName: CONTRACT_CUSTOMER_NAME,
      customerEmail: CONTRACT_CUSTOMER_EMAIL,
      orderType: CONTRACT_ORDER_TYPE,
      items: [],
    };

    const nextRes = await postJson(`${CONTRACT_NEXT_BASE}/api/public/orders`, payload);
    const goRes = await postJson(`${CONTRACT_GO_BASE}/api/public/orders`, payload);

    expect(nextRes.json?.success).toBe(false);
    expect(goRes.json?.success).toBe(false);

    expect(nextRes.json?.error).toBe('VALIDATION_ERROR');
    expect(goRes.json?.error).toBe('VALIDATION_ERROR');
  });
});

describe('Contract parity: GET /api/public/merchants/{code}', () => {
  const shouldRun = hasRequired(CONTRACT_MERCHANT_CODE);
  const testFn = shouldRun ? it : it.skip;

  testFn('returns core merchant fields (Next vs Go)', async () => {
    const nextRes = await getJson(`${CONTRACT_NEXT_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}`);
    const goRes = await getJson(`${CONTRACT_GO_BASE}/api/public/merchants/${CONTRACT_MERCHANT_CODE}`);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(nextData.code).toBe(goData.code);
    expect(nextData.name).toBe(goData.name);
    expect(nextData.currency).toBe(goData.currency);
    expect(nextData.isActive).toBe(goData.isActive);
  });
});

describe('Contract parity: POST /api/public/vouchers/validate', () => {
  const shouldRun = hasRequired(
    CONTRACT_MERCHANT_CODE,
    CONTRACT_MENU_ID,
    CONTRACT_VOUCHER_CODE,
    CONTRACT_VOUCHER_ITEM_SUBTOTAL,
  );
  const testFn = shouldRun ? it : it.skip;

  testFn('returns compatible discount payload (Next vs Go)', async () => {
    const payload = {
      merchantCode: CONTRACT_MERCHANT_CODE,
      voucherCode: CONTRACT_VOUCHER_CODE,
      orderType: CONTRACT_ORDER_TYPE,
      items: [
        {
          menuId: CONTRACT_MENU_ID,
          subtotal: CONTRACT_VOUCHER_ITEM_SUBTOTAL,
        },
      ],
    };

    const nextRes = await postJson(`${CONTRACT_NEXT_BASE}/api/public/vouchers/validate`, payload);
    const goRes = await postJson(`${CONTRACT_GO_BASE}/api/public/vouchers/validate`, payload);

    expect(nextRes.status).toBeGreaterThanOrEqual(200);
    expect(goRes.status).toBeGreaterThanOrEqual(200);

    expect(nextRes.json?.success).toBe(true);
    expect(goRes.json?.success).toBe(true);

    const nextData = (nextRes.json?.data ?? {}) as Record<string, unknown>;
    const goData = (goRes.json?.data ?? {}) as Record<string, unknown>;

    expect(nextData.discountType).toBe(goData.discountType);
    expect(nextData.discountValue).toBe(goData.discountValue);

    const nextDiscount = toNumber(nextData.discountAmount);
    const goDiscount = toNumber(goData.discountAmount);
    if (nextDiscount !== null && goDiscount !== null) {
      expect(Math.abs(nextDiscount - goDiscount)).toBeLessThanOrEqual(0.01);
    }
  });
});
