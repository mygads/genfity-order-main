import prisma from '@/lib/db/client';
import { ERROR_CODES, ValidationError } from '@/lib/constants/errors';
import { getCurrencyConfig } from '@/lib/constants/location';
import { formatInTimeZone } from 'date-fns-tz';
import { Prisma } from '@prisma/client';

export type OrderVoucherAudience = 'POS' | 'CUSTOMER' | 'BOTH';
export type OrderVoucherDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type OrderDiscountSource = 'POS_VOUCHER' | 'CUSTOMER_VOUCHER' | 'MANUAL';

export type VoucherOrderItemInput = {
  menuId: bigint;
  subtotal: number; // includes addons for that item
};

type VoucherResolution = {
  template: {
    id: bigint;
    name: string;
    audience: OrderVoucherAudience;
    discountType: OrderVoucherDiscountType;
    discountValue: Prisma.Decimal;
    maxDiscountAmount: Prisma.Decimal | null;
    minOrderAmount: Prisma.Decimal | null;
    maxUsesTotal: number | null;
    maxUsesPerCustomer: number | null;
    maxUsesPerOrder: number;
    totalDiscountCap: Prisma.Decimal | null;
    requiresCustomerLogin: boolean;
    allowedOrderTypes: Array<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>;
    validFrom: Date | null;
    validUntil: Date | null;
    daysOfWeek: number[];
    startTime: string | null;
    endTime: string | null;
    includeAllItems: boolean;
    reportCategory: string | null;
    isActive: boolean;
    menuScopes: Array<{ menuId: bigint }>;
    categoryScopes: Array<{ categoryId: bigint }>;
  };
  code: null | {
    id: bigint;
    code: string;
    isActive: boolean;
    maxUsesTotal: number | null;
    maxUsesPerCustomer: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
  };
};

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeDowSunday0(date: Date, tz: string): number {
  // date-fns 'i' is ISO day of week (1=Mon .. 7=Sun)
  const iso = Number(formatInTimeZone(date, tz, 'i'));
  return iso % 7; // Sunday -> 0
}

function isTimeWithinWindow(nowHHMM: string, startHHMM: string, endHHMM: string): boolean {
  if (!isValidHHMM(nowHHMM) || !isValidHHMM(startHHMM) || !isValidHHMM(endHHMM)) return false;
  if (startHHMM === endHHMM) return true; // treat as all-day

  if (startHHMM < endHHMM) {
    return nowHHMM >= startHHMM && nowHHMM <= endHHMM;
  }

  // Overnight window (e.g. 22:00-02:00)
  return nowHHMM >= startHHMM || nowHHMM <= endHHMM;
}

function roundCurrency(amount: number, currency: string): number {
  const decimals = getCurrencyConfig(currency).decimals;
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

function isAudienceApplicable(templateAudience: OrderVoucherAudience, requestAudience: Exclude<OrderVoucherAudience, 'BOTH'>): boolean {
  if (templateAudience === 'BOTH') return true;
  return templateAudience === requestAudience;
}

async function resolveVoucher(params: {
  merchantId: bigint;
  audience: Exclude<OrderVoucherAudience, 'BOTH'>;
  voucherCode?: string;
  voucherTemplateId?: bigint;
}): Promise<VoucherResolution> {
  const { merchantId, audience, voucherCode, voucherTemplateId } = params;

  const normalizedVoucherCode = typeof voucherCode === 'string' ? voucherCode.trim().toUpperCase() : '';

  if (normalizedVoucherCode) {
    const code = await prisma.orderVoucherCode.findFirst({
      where: {
        merchantId,
        code: normalizedVoucherCode,
      },
      include: {
        template: {
          include: {
            menuScopes: { select: { menuId: true } },
            categoryScopes: { select: { categoryId: true } },
          },
        },
      },
    });

    if (!code) throw new ValidationError('Invalid voucher code', ERROR_CODES.VOUCHER_NOT_FOUND);
    if (!code.isActive) throw new ValidationError('Voucher is inactive', ERROR_CODES.VOUCHER_INACTIVE);
    if (!code.template?.isActive) throw new ValidationError('Voucher is inactive', ERROR_CODES.VOUCHER_INACTIVE);
    if (!isAudienceApplicable(code.template.audience as OrderVoucherAudience, audience)) {
      throw new ValidationError('Voucher is not applicable', ERROR_CODES.VOUCHER_NOT_APPLICABLE);
    }

    return {
      template: {
        id: code.template.id,
        name: code.template.name,
        audience: code.template.audience,
        discountType: code.template.discountType,
        discountValue: code.template.discountValue,
        maxDiscountAmount: code.template.maxDiscountAmount,
        minOrderAmount: code.template.minOrderAmount,
        maxUsesTotal: code.template.maxUsesTotal,
        maxUsesPerCustomer: code.template.maxUsesPerCustomer,
        maxUsesPerOrder: code.template.maxUsesPerOrder,
        totalDiscountCap: code.template.totalDiscountCap,
        requiresCustomerLogin: code.template.requiresCustomerLogin,
        allowedOrderTypes: code.template.allowedOrderTypes as any,
        validFrom: code.template.validFrom,
        validUntil: code.template.validUntil,
        daysOfWeek: code.template.daysOfWeek,
        startTime: code.template.startTime,
        endTime: code.template.endTime,
        includeAllItems: code.template.includeAllItems,
        reportCategory: code.template.reportCategory,
        isActive: code.template.isActive,
        menuScopes: code.template.menuScopes,
        categoryScopes: code.template.categoryScopes,
      },
      code: {
        id: code.id,
        code: code.code,
        isActive: code.isActive,
        maxUsesTotal: code.maxUsesTotal,
        maxUsesPerCustomer: code.maxUsesPerCustomer,
        validFrom: code.validFrom,
        validUntil: code.validUntil,
      },
    };
  }

  if (!voucherTemplateId) {
    throw new ValidationError('Voucher template is required', ERROR_CODES.VOUCHER_TEMPLATE_REQUIRED);
  }

  const template = await prisma.orderVoucherTemplate.findFirst({
    where: {
      id: voucherTemplateId,
      merchantId,
    },
    include: {
      menuScopes: { select: { menuId: true } },
      categoryScopes: { select: { categoryId: true } },
    },
  });

  if (!template) throw new ValidationError('Voucher template not found', ERROR_CODES.VOUCHER_NOT_FOUND);
  if (!template.isActive) throw new ValidationError('Voucher is inactive', ERROR_CODES.VOUCHER_INACTIVE);
  if (!isAudienceApplicable(template.audience as OrderVoucherAudience, audience)) {
    throw new ValidationError('Voucher is not applicable', ERROR_CODES.VOUCHER_NOT_APPLICABLE);
  }

  return {
    template: {
      id: template.id,
      name: template.name,
      audience: template.audience,
      discountType: template.discountType,
      discountValue: template.discountValue,
      maxDiscountAmount: template.maxDiscountAmount,
      minOrderAmount: template.minOrderAmount,
      maxUsesTotal: template.maxUsesTotal,
      maxUsesPerCustomer: template.maxUsesPerCustomer,
      maxUsesPerOrder: template.maxUsesPerOrder,
      totalDiscountCap: template.totalDiscountCap,
      requiresCustomerLogin: template.requiresCustomerLogin,
      allowedOrderTypes: template.allowedOrderTypes as any,
      validFrom: template.validFrom,
      validUntil: template.validUntil,
      daysOfWeek: template.daysOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      includeAllItems: template.includeAllItems,
      reportCategory: template.reportCategory,
      isActive: template.isActive,
      menuScopes: template.menuScopes,
      categoryScopes: template.categoryScopes,
    },
    code: null,
  };
}

async function computeEligibleSubtotal(params: {
  template: VoucherResolution['template'];
  items: VoucherOrderItemInput[];
}): Promise<number> {
  const { template, items } = params;

  if (template.includeAllItems) {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  const scopedMenuIds = new Set(template.menuScopes.map((m) => m.menuId.toString()));
  const scopedCategoryIds = new Set(template.categoryScopes.map((c) => c.categoryId.toString()));

  if (scopedMenuIds.size === 0 && scopedCategoryIds.size === 0) {
    return 0;
  }

  const itemMenuIds = items.map((i) => i.menuId);
  let menuIdsFromCategories = new Set<string>();

  if (scopedCategoryIds.size > 0 && itemMenuIds.length > 0) {
    const rows = await prisma.menuCategoryItem.findMany({
      where: {
        menuId: { in: itemMenuIds },
        categoryId: { in: Array.from(scopedCategoryIds).map((id) => BigInt(id)) },
      },
      select: { menuId: true },
    });

    menuIdsFromCategories = new Set(rows.map((r) => r.menuId.toString()));
  }

  return items.reduce((sum, item) => {
    const menuIdStr = item.menuId.toString();
    const eligible = scopedMenuIds.has(menuIdStr) || menuIdsFromCategories.has(menuIdStr);
    return sum + (eligible ? item.subtotal : 0);
  }, 0);
}

async function assertUsageLimits(params: {
  merchantId: bigint;
  templateId: bigint;
  codeId: bigint | null;
  customerId: bigint | null;
  maxUsesTotal: number | null;
  maxUsesPerCustomer: number | null;
  totalDiscountCap: Prisma.Decimal | null;
  excludeOrderId?: bigint | null;
}): Promise<void> {
  const { merchantId, templateId, codeId, customerId, maxUsesTotal, maxUsesPerCustomer, totalDiscountCap, excludeOrderId } = params;

  if (maxUsesTotal != null) {
    const orderFilter = excludeOrderId ? { orderId: { not: excludeOrderId } } : {};
    const used = await prisma.orderDiscount.count({
      where: { merchantId, voucherTemplateId: templateId, ...orderFilter },
    });
    if (used >= maxUsesTotal) {
      throw new ValidationError('Voucher usage limit reached', ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED, {
        maxUsesTotal,
        used,
      });
    }
  }

  if (codeId != null) {
    const orderFilter = excludeOrderId ? { orderId: { not: excludeOrderId } } : {};
    const codeUsed = await prisma.orderDiscount.count({
      where: { merchantId, voucherCodeId: codeId, ...orderFilter },
    });
    const code = await prisma.orderVoucherCode.findUnique({ where: { id: codeId } });
    const codeMax = code?.maxUsesTotal ?? null;
    if (codeMax != null && codeUsed >= codeMax) {
      throw new ValidationError('Voucher usage limit reached', ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED, {
        maxUsesTotal: codeMax,
        used: codeUsed,
      });
    }
  }

  if (customerId != null && maxUsesPerCustomer != null) {
    const orderFilter = excludeOrderId ? { orderId: { not: excludeOrderId } } : {};
    const usedByCustomer = await prisma.orderDiscount.count({
      where: { merchantId, voucherTemplateId: templateId, appliedByCustomerId: customerId, ...orderFilter },
    });
    if (usedByCustomer >= maxUsesPerCustomer) {
      throw new ValidationError('Voucher usage limit reached', ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED, {
        maxUsesPerCustomer,
        usedByCustomer,
      });
    }
  }

  if (customerId != null && codeId != null) {
    const orderFilter = excludeOrderId ? { orderId: { not: excludeOrderId } } : {};
    const code = await prisma.orderVoucherCode.findUnique({ where: { id: codeId } });
    const codePerCustomer = code?.maxUsesPerCustomer ?? null;
    if (codePerCustomer != null) {
      const usedByCustomer = await prisma.orderDiscount.count({
        where: { merchantId, voucherCodeId: codeId, appliedByCustomerId: customerId, ...orderFilter },
      });
      if (usedByCustomer >= codePerCustomer) {
        throw new ValidationError('Voucher usage limit reached', ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED, {
          maxUsesPerCustomer: codePerCustomer,
          usedByCustomer,
        });
      }
    }
  }

  if (totalDiscountCap != null) {
    const orderFilter = excludeOrderId ? { orderId: { not: excludeOrderId } } : {};
    const agg = await prisma.orderDiscount.aggregate({
      where: { merchantId, voucherTemplateId: templateId, ...orderFilter },
      _sum: { discountAmount: true },
    });

    const used = agg._sum.discountAmount ? Number(agg._sum.discountAmount) : 0;
    if (used >= Number(totalDiscountCap)) {
      throw new ValidationError('Voucher discount budget reached', ERROR_CODES.VOUCHER_DISCOUNT_CAP_REACHED, {
        totalDiscountCap: Number(totalDiscountCap),
        used,
      });
    }
  }
}

function assertTimeAndChannel(params: {
  template: VoucherResolution['template'];
  now: Date;
  merchantTimezone: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
}): void {
  const { template, now, merchantTimezone, orderType } = params;

  if (!template.isActive) throw new ValidationError('Voucher is inactive', ERROR_CODES.VOUCHER_INACTIVE);

  if (template.allowedOrderTypes && template.allowedOrderTypes.length > 0) {
    if (!template.allowedOrderTypes.includes(orderType)) {
      throw new ValidationError('Voucher is not applicable for this order type', ERROR_CODES.VOUCHER_ORDER_TYPE_NOT_ALLOWED, {
        orderType,
        allowedOrderTypes: template.allowedOrderTypes,
      });
    }
  }

  if (template.validFrom && now < template.validFrom) {
    throw new ValidationError('Voucher is not active yet', ERROR_CODES.VOUCHER_NOT_ACTIVE_YET, {
      validFrom: template.validFrom,
    });
  }

  if (template.validUntil && now > template.validUntil) {
    throw new ValidationError('Voucher has expired', ERROR_CODES.VOUCHER_EXPIRED, {
      validUntil: template.validUntil,
    });
  }

  if (template.daysOfWeek && template.daysOfWeek.length > 0) {
    const dow = normalizeDowSunday0(now, merchantTimezone);
    if (!template.daysOfWeek.includes(dow)) {
      throw new ValidationError('Voucher is not available today', ERROR_CODES.VOUCHER_NOT_AVAILABLE_TODAY, {
        daysOfWeek: template.daysOfWeek,
        today: dow,
      });
    }
  }

  const startTime = template.startTime;
  const endTime = template.endTime;
  if (startTime && endTime) {
    if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) {
      throw new ValidationError('Voucher schedule is invalid', ERROR_CODES.VOUCHER_SCHEDULE_INVALID);
    }

    const nowHHMM = formatInTimeZone(now, merchantTimezone, 'HH:mm');
    if (!isTimeWithinWindow(nowHHMM, startTime, endTime)) {
      throw new ValidationError('Voucher is not available at this time', ERROR_CODES.VOUCHER_NOT_AVAILABLE_NOW, {
        startTime,
        endTime,
        now: nowHHMM,
      });
    }
  }
}

export async function computeVoucherDiscount(params: {
  merchantId: bigint;
  merchantCurrency: string;
  merchantTimezone: string;
  audience: Exclude<OrderVoucherAudience, 'BOTH'>;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  subtotal: number;
  items: VoucherOrderItemInput[];
  voucherCode?: string;
  voucherTemplateId?: bigint;
  customerId?: bigint | null;
  orderIdForStacking?: bigint | null;
  excludeOrderIdFromUsage?: bigint | null;
}): Promise<{
  templateId: bigint;
  codeId: bigint | null;
  label: string;
  discountType: OrderVoucherDiscountType;
  discountValue: number;
  discountAmount: number;
  eligibleSubtotal: number;
}> {
  const {
    merchantId,
    merchantCurrency,
    merchantTimezone,
    audience,
    orderType,
    subtotal,
    items,
    voucherCode,
    voucherTemplateId,
    customerId,
    orderIdForStacking,
    excludeOrderIdFromUsage,
  } = params;

  const resolved = await resolveVoucher({ merchantId, audience, voucherCode, voucherTemplateId });
  const now = new Date();

  assertTimeAndChannel({
    template: resolved.template,
    now,
    merchantTimezone,
    orderType,
  });

  if (resolved.code) {
    if (!resolved.code.isActive) throw new ValidationError('Voucher is inactive', ERROR_CODES.VOUCHER_INACTIVE);
    if (resolved.code.validFrom && now < resolved.code.validFrom) {
      throw new ValidationError('Voucher is not active yet', ERROR_CODES.VOUCHER_NOT_ACTIVE_YET, {
        validFrom: resolved.code.validFrom,
      });
    }
    if (resolved.code.validUntil && now > resolved.code.validUntil) {
      throw new ValidationError('Voucher has expired', ERROR_CODES.VOUCHER_EXPIRED, {
        validUntil: resolved.code.validUntil,
      });
    }
  }

  if (resolved.template.requiresCustomerLogin && !customerId) {
    throw new ValidationError('Customer login is required to use this voucher', ERROR_CODES.VOUCHER_REQUIRES_LOGIN);
  }

  const minOrderAmount = resolved.template.minOrderAmount ? Number(resolved.template.minOrderAmount) : null;

  if (minOrderAmount != null && subtotal < minOrderAmount) {
    throw new ValidationError('Order does not meet minimum amount', ERROR_CODES.VOUCHER_MIN_ORDER_NOT_MET, {
      minOrderAmount,
      subtotal,
      currency: merchantCurrency,
    });
  }

  await assertUsageLimits({
    merchantId,
    templateId: resolved.template.id,
    codeId: resolved.code ? resolved.code.id : null,
    customerId: customerId ?? null,
    maxUsesTotal: resolved.template.maxUsesTotal,
    maxUsesPerCustomer: resolved.template.maxUsesPerCustomer,
    totalDiscountCap: resolved.template.totalDiscountCap,
    excludeOrderId: excludeOrderIdFromUsage ?? null,
  });

  // Stacking rules (only enforce if we have an existing order to inspect)
  if (orderIdForStacking) {
    const existing = await prisma.orderDiscount.findMany({
      where: { merchantId, orderId: orderIdForStacking },
      include: { voucherTemplate: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const d of existing) {
      if (d.source === 'MANUAL') {
        throw new ValidationError('Voucher cannot be combined with manual discount', ERROR_CODES.VOUCHER_CANNOT_STACK_MANUAL, {
          existingSource: d.source,
        });
      }

      if (d.source === 'POS_VOUCHER' || d.source === 'CUSTOMER_VOUCHER') {
        throw new ValidationError('Only one voucher can be used per order', ERROR_CODES.VOUCHER_ALREADY_APPLIED, {
          existingSource: d.source,
          existingLabel: d.label,
        });
      }
    }
  }

  const eligibleSubtotal = await computeEligibleSubtotal({ template: resolved.template, items });
  if (eligibleSubtotal <= 0) {
    throw new ValidationError('Voucher is not applicable to selected items', ERROR_CODES.VOUCHER_NOT_APPLICABLE_ITEMS, {
      includeAllItems: resolved.template.includeAllItems,
      scopedMenus: resolved.template.menuScopes?.length || 0,
      scopedCategories: resolved.template.categoryScopes?.length || 0,
    });
  }

  const discountValue = Number(resolved.template.discountValue);
  let discountAmount = 0;

  if (resolved.template.discountType === 'PERCENTAGE') {
    const pct = Math.max(0, Math.min(discountValue, 100));
    discountAmount = eligibleSubtotal * (pct / 100);
    if (resolved.template.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, Number(resolved.template.maxDiscountAmount));
    }
  } else {
    discountAmount = Math.min(discountValue, eligibleSubtotal);
  }

  discountAmount = roundCurrency(Math.max(0, discountAmount), merchantCurrency);

  if (discountAmount <= 0) {
    throw new ValidationError('Voucher discount is zero', ERROR_CODES.VOUCHER_DISCOUNT_ZERO);
  }

  // Do not embed voucher codes into the human-facing label.
  // Codes are tracked via voucherCodeId, while labels should be display-safe (e.g. receipts).
  const label = resolved.template.name;

  return {
    templateId: resolved.template.id,
    codeId: resolved.code ? resolved.code.id : null,
    label,
    discountType: resolved.template.discountType,
    discountValue,
    discountAmount,
    eligibleSubtotal: roundCurrency(eligibleSubtotal, merchantCurrency),
  };
}

export async function applyOrderDiscount(params: {
  tx: Prisma.TransactionClient;
  merchantId: bigint;
  orderId: bigint;
  source: OrderDiscountSource;
  currency: string;
  label: string;
  discountType: OrderVoucherDiscountType;
  discountValue?: number | null;
  discountAmount: number;
  voucherTemplateId?: bigint | null;
  voucherCodeId?: bigint | null;
  appliedByUserId?: bigint | null;
  appliedByCustomerId?: bigint | null;
  replaceExistingSources?: OrderDiscountSource[];
}): Promise<void> {
  const {
    tx,
    merchantId,
    orderId,
    source,
    currency,
    label,
    discountType,
    discountValue,
    discountAmount,
    voucherTemplateId,
    voucherCodeId,
    appliedByUserId,
    appliedByCustomerId,
    replaceExistingSources,
  } = params;

  if (replaceExistingSources && replaceExistingSources.length > 0) {
    await tx.orderDiscount.deleteMany({
      where: {
        merchantId,
        orderId,
        source: { in: replaceExistingSources },
      },
    });
  }

  await tx.orderDiscount.create({
    data: {
      merchantId,
      orderId,
      source,
      voucherTemplateId: voucherTemplateId ?? null,
      voucherCodeId: voucherCodeId ?? null,
      label,
      discountType,
      discountValue: discountValue != null ? new Prisma.Decimal(discountValue) : null,
      discountAmount: new Prisma.Decimal(discountAmount),
      appliedByUserId: appliedByUserId ?? null,
      appliedByCustomerId: appliedByCustomerId ?? null,
      metadata: { currency } as Prisma.InputJsonValue,
    },
  });

  const agg = await tx.orderDiscount.aggregate({
    where: { merchantId, orderId },
    _sum: { discountAmount: true },
  });

  const totalDiscount = agg._sum.discountAmount ? Number(agg._sum.discountAmount) : 0;

  // Keep Order.discountAmount in sync with sum(order_discounts)
  await tx.order.update({
    where: { id: orderId },
    data: {
      discountAmount: new Prisma.Decimal(totalDiscount),
    },
  });
}
