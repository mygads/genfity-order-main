/**
 * POS Order Edit API
 * GET /api/merchant/orders/pos/[orderId] - Fetch order data formatted for POS editing
 * PUT /api/merchant/orders/pos/[orderId] - Update existing POS order items
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { getPosCustomItemsSettings, getPosEditOrderSettings } from '@/lib/utils/posCustomItemsSettings';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { computeVoucherDiscount, applyOrderDiscount } from '@/lib/services/OrderVoucherService';
import { ValidationError } from '@/lib/constants/errors';
import userNotificationService from '@/lib/services/UserNotificationService';

const POS_CUSTOM_PLACEHOLDER_MENU_NAME = '[POS] __CUSTOM_ITEM_PLACEHOLDER__';

function isNumericId(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
  if (typeof value === 'string') return /^\d+$/.test(value);
  return false;
}

function toBigIntId(value: number | string, fieldName: string): bigint {
  if (!isNumericId(value)) {
    throw new PosValidationError('INVALID_ID', `Invalid ${fieldName}.`);
  }
  return BigInt(value);
}

async function getOrCreatePosCustomPlaceholderMenuId(params: {
  merchantId: bigint;
  userId?: bigint;
}): Promise<bigint> {
  const existing = await prisma.menu.findFirst({
    where: {
      merchantId: params.merchantId,
      name: POS_CUSTOM_PLACEHOLDER_MENU_NAME,
      deletedAt: { not: null },
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  const now = new Date();
  const created = await prisma.menu.create({
    data: {
      merchantId: params.merchantId,
      name: POS_CUSTOM_PLACEHOLDER_MENU_NAME,
      description: 'Internal placeholder for POS custom items',
      price: 0,
      isActive: false,
      trackStock: false,
      stockQty: null,
      deletedAt: now,
      deletedByUserId: params.userId,
      createdByUserId: params.userId,
    },
    select: { id: true },
  });

  return created.id;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

class PosValidationError extends Error {
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(errorCode: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PosValidationError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

interface POSOrderRequest {
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  notes?: string;
  items: Array<{
    type?: 'MENU' | 'CUSTOM';
    menuId?: number | string;
    customName?: string;
    customPrice?: number;
    quantity: number;
    notes?: string;
    addons?: Array<{
      addonItemId: number | string;
      quantity?: number;
    }>;
  }>;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

interface AddonData {
  addonItemId: bigint;
  addonName: string;
  addonPrice: number;
  quantity: number;
  subtotal: number;
}

interface OrderItemData {
  menuId: bigint;
  menuName: string;
  menuPrice: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
  addons: AddonData[];
  isCustom: boolean;
}

async function ensureEditEnabled(merchantId: bigint) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { features: true, requireTableNumberForDineIn: true },
  });

  if (!merchant) {
    throw new PosValidationError('MERCHANT_NOT_FOUND', 'Merchant not found.');
  }

  const editOrder = getPosEditOrderSettings({ features: merchant.features });
  if (!editOrder.enabled) {
    throw new PosValidationError('POS_EDIT_ORDER_DISABLED', 'Edit order is disabled for this merchant.');
  }

  return merchant;
}

async function handleGet(
  _req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const { merchantId } = context;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    await ensureEditEnabled(merchantId);

    const orderId = orderIdResult.value;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId,
      },
      include: {
        orderItems: {
          include: {
            addons: true,
            menu: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (!['PENDING', 'ACCEPTED'].includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_EDITABLE',
          message: 'Only PENDING or ACCEPTED orders can be edited',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_TYPE_NOT_SUPPORTED',
          message: 'Only dine-in or takeaway orders can be edited in POS',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const items = order.orderItems.map((item) => {
      const isCustom = item.menu?.name === POS_CUSTOM_PLACEHOLDER_MENU_NAME;
      return {
        type: isCustom ? 'CUSTOM' : 'MENU',
        menuId: isCustom ? undefined : item.menuId,
        menuName: item.menuName,
        menuPrice: decimalToNumber(item.menuPrice),
        customName: isCustom ? item.menuName : undefined,
        customPrice: isCustom ? decimalToNumber(item.menuPrice) : undefined,
        quantity: item.quantity,
        notes: item.notes || undefined,
        addons: isCustom
          ? []
          : item.addons.map((addon) => ({
              addonItemId: addon.addonItemId,
              addonName: addon.addonName,
              addonPrice: decimalToNumber(addon.addonPrice),
              quantity: addon.quantity,
            })),
        imageUrl: item.menu?.imageUrl ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        notes: order.notes,
        customer: order.customer,
        items,
      }),
      statusCode: 200,
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/pos/[orderId]] Error:', error);

    if (error instanceof PosValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'POS_VALIDATION_ERROR',
          errorCode: error.errorCode,
          message: error.message,
          ...(error.details ? { details: serializeBigInt(error.details) } : {}),
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to load order for editing',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);

async function handlePut(
  req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const { merchantId, userId } = context;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        code: true,
        name: true,
        currency: true,
        timezone: true,
        features: true,
        enableTax: true,
        taxPercentage: true,
        enableServiceCharge: true,
        serviceChargePercent: true,
        enablePackagingFee: true,
        packagingFeeAmount: true,
        stockAlertEnabled: true,
        defaultLowStockThreshold: true,
        requireTableNumberForDineIn: true,
      },
    });

    if (!merchant) {
      throw new PosValidationError('MERCHANT_NOT_FOUND', 'Merchant not found.');
    }

    const editOrderSettings = getPosEditOrderSettings({ features: merchant.features });
    if (!editOrderSettings.enabled) {
      throw new PosValidationError('POS_EDIT_ORDER_DISABLED', 'Edit order is disabled for this merchant.');
    }

    const orderId = orderIdResult.value;

    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId,
      },
      include: {
        payment: true,
        orderItems: {
          include: {
            addons: true,
            menu: {
              select: {
                id: true,
                name: true,
                trackStock: true,
                stockQty: true,
              },
            },
          },
        },
        orderDiscounts: {
          include: {
            voucherCode: { select: { code: true } },
          },
        },
      },
    });

    if (!existingOrder) {
      throw new PosValidationError('ORDER_NOT_FOUND', 'Order not found.');
    }

    if (!['PENDING', 'ACCEPTED'].includes(existingOrder.status)) {
      throw new PosValidationError('ORDER_NOT_EDITABLE', 'Only PENDING or ACCEPTED orders can be edited.');
    }

    if (!['DINE_IN', 'TAKEAWAY'].includes(existingOrder.orderType)) {
      throw new PosValidationError('ORDER_TYPE_NOT_SUPPORTED', 'Only dine-in or takeaway orders can be edited in POS.');
    }

    if (existingOrder.payment?.status === 'COMPLETED') {
      throw new PosValidationError('ORDER_ALREADY_PAID', 'Paid orders cannot be edited.');
    }

    const body: POSOrderRequest = await req.json();

    if (!body.orderType || !['DINE_IN', 'TAKEAWAY'].includes(body.orderType)) {
      throw new PosValidationError('INVALID_ORDER_TYPE', 'Invalid order type. Must be DINE_IN or TAKEAWAY.');
    }

    if (body.orderType !== existingOrder.orderType) {
      throw new PosValidationError('ORDER_TYPE_MISMATCH', 'Order type cannot be changed in edit mode.');
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new PosValidationError('EMPTY_ITEMS', 'Order must have at least one item.');
    }

    if (body.orderType === 'DINE_IN' && merchant.requireTableNumberForDineIn) {
      const normalizedTable = String(body.tableNumber || '').trim();
      if (!normalizedTable) {
        throw new PosValidationError('TABLE_NUMBER_REQUIRED', 'Table number is required for dine-in orders.');
      }
    }

    const posCustomItems = getPosCustomItemsSettings({
      features: merchant.features,
      currency: merchant.currency,
    });

    const merchantTimezone = merchant.timezone || 'Australia/Sydney';

    const normalizedItems = body.items.map((item) => ({
      ...item,
      type: item.type === 'CUSTOM' ? 'CUSTOM' : 'MENU',
    }));

    // Handle customer updates
    let customerId: bigint | null = existingOrder.customerId ?? null;

    if (body.customer && (body.customer.name || body.customer.phone || body.customer.email)) {
      let existingCustomer = null;

      if (body.customer.email) {
        existingCustomer = await prisma.customer.findUnique({
          where: { email: body.customer.email.toLowerCase() },
        });
      }

      if (!existingCustomer && body.customer.phone) {
        existingCustomer = await prisma.customer.findFirst({
          where: { phone: body.customer.phone },
        });
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;

        if (body.customer.name || body.customer.phone) {
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: body.customer.name || existingCustomer.name,
              phone: body.customer.phone || existingCustomer.phone,
            },
          });
        }
      } else if (body.customer.email) {
        const newCustomer = await prisma.customer.create({
          data: {
            name: body.customer.name || 'Walk-in Customer',
            email: body.customer.email.toLowerCase(),
            phone: body.customer.phone || null,
          },
        });
        customerId = newCustomer.id;
      }
    }

    // Fetch menus/addons for validation and pricing
    const menuItemsOnly = normalizedItems.filter((i) => i.type === 'MENU');
    const customItemsOnly = normalizedItems.filter((i) => i.type === 'CUSTOM');

    const menuIds = menuItemsOnly.map((item) => toBigIntId(item.menuId as any, 'menuId'));
    const addonItemIds: bigint[] = [];

    menuItemsOnly.forEach((item) => {
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach((addon) => {
          addonItemIds.push(toBigIntId(addon.addonItemId, 'addonItemId'));
        });
      }
    });

    const [menus, addons, specialPrices] = await Promise.all([
      menuIds.length > 0
        ? prisma.menu.findMany({
            where: {
              id: { in: menuIds },
              merchantId: merchantId,
            },
          })
        : [],
      addonItemIds.length > 0
        ? prisma.addonItem.findMany({
            where: { id: { in: addonItemIds } },
          })
        : [],
      menuIds.length > 0
        ? prisma.specialPriceItem.findMany({
            where: {
              menuId: { in: menuIds },
              specialPrice: {
                merchantId: merchantId,
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
              },
            },
            include: {
              specialPrice: true,
            },
          })
        : [],
    ]);

    const menuMap = new Map(menus.map((m) => [m.id.toString(), m]));
    const addonMap = new Map(addons.map((a) => [a.id.toString(), a]));
    const promoPriceMap = new Map<string, number>();

    specialPrices.forEach((sp) => {
      if (sp.promoPrice !== null) {
        promoPriceMap.set(sp.menuId.toString(), decimalToNumber(sp.promoPrice));
      }
    });

    let subtotal = 0;
    const orderItemsData: OrderItemData[] = [];

    const customPlaceholderMenuId = customItemsOnly.length > 0
      ? await getOrCreatePosCustomPlaceholderMenuId({ merchantId: merchant.id, userId })
      : null;

    for (const item of normalizedItems) {
      if (item.type === 'CUSTOM') {
        if (!posCustomItems.enabled) {
          throw new PosValidationError('POS_CUSTOM_ITEMS_DISABLED', 'Custom items are disabled for this merchant.');
        }

        if (item.addons && item.addons.length > 0) {
          throw new PosValidationError('CUSTOM_ITEM_ADDONS_NOT_ALLOWED', 'Custom items do not support addons.');
        }

        const name = (item.customName || '').trim();
        if (!name) {
          throw new PosValidationError('CUSTOM_ITEM_NAME_REQUIRED', 'Custom item name is required.');
        }

        if (name.length > posCustomItems.maxNameLength) {
          throw new PosValidationError(
            'CUSTOM_ITEM_NAME_TOO_LONG',
            `Custom item name is too long (max ${posCustomItems.maxNameLength} characters).`
          );
        }

        const price = typeof item.customPrice === 'number' ? item.customPrice : Number(item.customPrice);
        if (!Number.isFinite(price) || price <= 0) {
          throw new PosValidationError('CUSTOM_ITEM_PRICE_INVALID', 'Custom item price must be a valid number.');
        }

        if (price > posCustomItems.maxPrice) {
          throw new PosValidationError(
            'CUSTOM_ITEM_PRICE_TOO_HIGH',
            `Custom item price is too high (max ${posCustomItems.maxPrice}).`
          );
        }

        if (!Number.isFinite(item.quantity) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new PosValidationError('INVALID_QUANTITY', 'Invalid quantity.');
        }

        const menuPrice = round2(price);
        const itemTotal = round2(menuPrice * item.quantity);

        subtotal = round2(subtotal + itemTotal);
        orderItemsData.push({
          menuId: customPlaceholderMenuId as bigint,
          menuName: name,
          menuPrice,
          quantity: item.quantity,
          subtotal: itemTotal,
          notes: item.notes || null,
          addons: [],
          isCustom: true,
        });

        continue;
      }

      const menuId = toBigIntId(item.menuId as any, 'menuId');
      const menu = menuMap.get(menuId.toString());

      if (!menu) {
        throw new PosValidationError('MENU_NOT_FOUND', `Menu item with ID ${item.menuId} not found.`);
      }

      if (!menu.isActive || (menu as any).deletedAt) {
        throw new PosValidationError('MENU_NOT_AVAILABLE', `Menu item "${menu.name}" is not available.`);
      }

      if (!Number.isFinite(item.quantity) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new PosValidationError('INVALID_QUANTITY', 'Invalid quantity.');
      }

      const promoPrice = promoPriceMap.get(menu.id.toString());
      const originalPrice = decimalToNumber(menu.price);
      const effectivePrice = promoPrice ?? originalPrice;
      const menuPrice = round2(effectivePrice);
      let itemTotal = round2(menuPrice * item.quantity);

      const addonData: AddonData[] = [];
      if (item.addons && item.addons.length > 0) {
        for (const addonItem of item.addons) {
          const addon = addonMap.get(addonItem.addonItemId.toString());

          if (addon && addon.isActive && !(addon as any).deletedAt) {
            const addonPrice = round2(decimalToNumber(addon.price));
            const addonQty = addonItem.quantity || 1;
            const addonSubtotal = round2(addonPrice * addonQty);
            itemTotal = round2(itemTotal + addonSubtotal);

            addonData.push({
              addonItemId: addon.id,
              addonName: addon.name,
              addonPrice,
              quantity: addonQty,
              subtotal: addonSubtotal,
            });
          }
        }
      }

      subtotal = round2(subtotal + itemTotal);

      orderItemsData.push({
        menuId: menu.id,
        menuName: menu.name,
        menuPrice,
        quantity: item.quantity,
        subtotal: itemTotal,
        notes: item.notes || null,
        addons: addonData,
        isCustom: false,
      });
    }

    const orderItemsForVoucher = orderItemsData.map((item) => ({
      menuId: item.menuId,
      subtotal: item.subtotal,
    }));

    const discountsToApply: Array<{
      source: 'POS_VOUCHER' | 'CUSTOMER_VOUCHER' | 'MANUAL';
      label: string;
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      discountValue: number | null;
      discountAmount: number;
      voucherTemplateId: bigint | null;
      voucherCodeId: bigint | null;
      appliedByUserId: bigint | null;
      appliedByCustomerId: bigint | null;
    }> = [];

    let recalculatedDiscountAmount = 0;
    if (existingOrder.orderDiscounts && existingOrder.orderDiscounts.length > 0) {
      for (const discount of existingOrder.orderDiscounts) {
        if (discount.source === 'MANUAL') {
          const rawValue = discount.discountValue !== null ? Number(discount.discountValue) : null;
          let discountAmount = Number(discount.discountAmount);

          if (discount.discountType === 'PERCENTAGE' && rawValue !== null) {
            const pct = Math.max(0, Math.min(rawValue, 100));
            discountAmount = round2(subtotal * (pct / 100));
          } else if (discount.discountType === 'FIXED_AMOUNT' && rawValue !== null) {
            discountAmount = round2(Math.max(0, rawValue));
          } else {
            discountAmount = round2(Math.max(0, discountAmount));
          }

          if (discountAmount > 0) {
            discountsToApply.push({
              source: 'MANUAL',
              label: discount.label || 'Manual discount',
              discountType: discount.discountType,
              discountValue: rawValue,
              discountAmount,
              voucherTemplateId: null,
              voucherCodeId: null,
              appliedByUserId: discount.appliedByUserId ?? null,
              appliedByCustomerId: discount.appliedByCustomerId ?? null,
            });
          }
          continue;
        }

        if (discount.source !== 'POS_VOUCHER' && discount.source !== 'CUSTOMER_VOUCHER') {
          continue;
        }

        const voucherCodeRaw = discount.voucherCode?.code || '';
        const voucherTemplateId = discount.voucherTemplateId ?? null;

        if (!voucherCodeRaw && !voucherTemplateId) {
          const fallbackAmount = round2(Math.max(0, Number(discount.discountAmount)));
          if (fallbackAmount > 0) {
            discountsToApply.push({
              source: discount.source,
              label: discount.label,
              discountType: discount.discountType,
              discountValue: discount.discountValue !== null ? Number(discount.discountValue) : null,
              discountAmount: fallbackAmount,
              voucherTemplateId: voucherTemplateId,
              voucherCodeId: discount.voucherCodeId ?? null,
              appliedByUserId: discount.appliedByUserId ?? null,
              appliedByCustomerId: discount.appliedByCustomerId ?? null,
            });
          }
          continue;
        }

        let computed;
        try {
          computed = await computeVoucherDiscount({
            merchantId: merchant.id,
            merchantCurrency: merchant.currency || 'AUD',
            merchantTimezone,
            audience: discount.source === 'CUSTOMER_VOUCHER' ? 'CUSTOMER' : 'POS',
            orderType: body.orderType,
            subtotal,
            items: orderItemsForVoucher,
            voucherCode: voucherCodeRaw || undefined,
            voucherTemplateId: voucherTemplateId || undefined,
            customerId: discount.source === 'CUSTOMER_VOUCHER' ? customerId : null,
            excludeOrderIdFromUsage: existingOrder.id,
          });
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new PosValidationError(error.errorCode, error.message, error.details);
          }
          throw error;
        }

        let discountAmount = computed.discountAmount;
        let discountType = computed.discountType;
        let discountValue = computed.discountValue;

        if (
          discount.source === 'POS_VOUCHER'
          && voucherTemplateId
          && !voucherCodeRaw
          && discount.discountValue !== null
        ) {
          const eligible = computed.eligibleSubtotal;
          const overrideValue = Number(discount.discountValue);

          if (discount.discountType === 'PERCENTAGE') {
            const pct = Math.max(0, Math.min(overrideValue, 100));
            let amount = eligible * (pct / 100);
            const template = await prisma.orderVoucherTemplate.findUnique({
              where: { id: computed.templateId },
              select: { maxDiscountAmount: true },
            });
            if (template?.maxDiscountAmount) {
              amount = Math.min(amount, Number(template.maxDiscountAmount));
            }
            discountAmount = round2(Math.min(amount, eligible));
            discountType = 'PERCENTAGE';
            discountValue = pct;
          } else {
            discountAmount = round2(Math.min(overrideValue, eligible));
            discountType = 'FIXED_AMOUNT';
            discountValue = overrideValue;
          }
        }

        if (discountAmount > 0) {
          discountsToApply.push({
            source: discount.source,
            label: computed.label,
            discountType,
            discountValue,
            discountAmount,
            voucherTemplateId: computed.templateId,
            voucherCodeId: computed.codeId,
            appliedByUserId: discount.appliedByUserId ?? null,
            appliedByCustomerId: discount.appliedByCustomerId ?? null,
          });
        }
      }

      recalculatedDiscountAmount = round2(
        discountsToApply.reduce((sum, item) => sum + item.discountAmount, 0)
      );
    } else {
      recalculatedDiscountAmount = Number(existingOrder.discountAmount ?? 0);
    }

    const taxPercentage = merchant.enableTax && merchant.taxPercentage
      ? Number(merchant.taxPercentage)
      : 0;
    const taxAmount = round2(subtotal * (taxPercentage / 100));

    const serviceChargePercent = merchant.enableServiceCharge && merchant.serviceChargePercent
      ? Number(merchant.serviceChargePercent)
      : 0;
    const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));

    const packagingFeeAmount = (body.orderType === 'TAKEAWAY' && merchant.enablePackagingFee && merchant.packagingFeeAmount)
      ? round2(Number(merchant.packagingFeeAmount))
      : 0;

    const discountAmount = recalculatedDiscountAmount;
    const totalAmount = Math.max(0, round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount - discountAmount));

    const shouldAdjustStock = !existingOrder.isScheduled || existingOrder.stockDeductedAt !== null;

    const oldMenuQty = new Map<string, number>();
    const oldAddonQty = new Map<string, number>();

    existingOrder.orderItems.forEach((item) => {
      const isCustom = item.menu?.name === POS_CUSTOM_PLACEHOLDER_MENU_NAME;
      if (!isCustom && item.menuId) {
        const key = item.menuId.toString();
        oldMenuQty.set(key, (oldMenuQty.get(key) ?? 0) + item.quantity);
      }

      item.addons.forEach((addon) => {
        const key = addon.addonItemId.toString();
        oldAddonQty.set(key, (oldAddonQty.get(key) ?? 0) + addon.quantity);
      });
    });

    const newMenuQty = new Map<string, number>();
    const newAddonQty = new Map<string, number>();

    orderItemsData.forEach((item) => {
      if (!item.isCustom && item.menuId) {
        const key = item.menuId.toString();
        newMenuQty.set(key, (newMenuQty.get(key) ?? 0) + item.quantity);
      }

      item.addons.forEach((addon) => {
        const key = addon.addonItemId.toString();
        newAddonQty.set(key, (newAddonQty.get(key) ?? 0) + addon.quantity);
      });
    });

    const menuIdsToCheck = Array.from(new Set([...oldMenuQty.keys(), ...newMenuQty.keys()])).map((id) => BigInt(id));
    const addonIdsToCheck = Array.from(new Set([...oldAddonQty.keys(), ...newAddonQty.keys()])).map((id) => BigInt(id));

    const [menusForStock, addonsForStockRaw] = await Promise.all([
      menuIdsToCheck.length > 0
        ? prisma.menu.findMany({
            where: { id: { in: menuIdsToCheck } },
            select: { id: true, name: true, trackStock: true, stockQty: true, lowStockThreshold: true },
          })
        : [],
      addonIdsToCheck.length > 0
        ? prisma.addonItem.findMany({
            where: { id: { in: addonIdsToCheck } },
            select: { id: true, name: true, trackStock: true, stockQty: true, lowStockThreshold: true } as any,
          })
        : [],
    ]);

    const addonsForStock = addonsForStockRaw as Array<{
      id: bigint;
      name: string;
      trackStock: boolean;
      stockQty: number | null;
      lowStockThreshold?: number | null;
    }>;

    if (shouldAdjustStock) {
      for (const menu of menusForStock) {
        if (!menu.trackStock || menu.stockQty === null) continue;
        const oldQty = oldMenuQty.get(menu.id.toString()) ?? 0;
        const newQty = newMenuQty.get(menu.id.toString()) ?? 0;
        const delta = newQty - oldQty;
        if (delta > 0 && menu.stockQty < delta) {
          throw new PosValidationError('INSUFFICIENT_STOCK', `Insufficient stock for "${menu.name}".`);
        }
      }

      for (const addon of addonsForStock) {
        if (!addon.trackStock || addon.stockQty === null) continue;
        const oldQty = oldAddonQty.get(addon.id.toString()) ?? 0;
        const newQty = newAddonQty.get(addon.id.toString()) ?? 0;
        const delta = newQty - oldQty;
        if (delta > 0 && addon.stockQty < delta) {
          throw new PosValidationError('INSUFFICIENT_STOCK', `Insufficient stock for "${addon.name}".`);
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      if (shouldAdjustStock) {
        for (const menu of menusForStock) {
          if (!menu.trackStock || menu.stockQty === null) continue;
          const oldQty = oldMenuQty.get(menu.id.toString()) ?? 0;
          const newQty = newMenuQty.get(menu.id.toString()) ?? 0;
          const delta = newQty - oldQty;
          if (delta === 0) continue;

          if (delta > 0) {
            const res = await tx.menu.updateMany({
              where: {
                id: menu.id,
                trackStock: true,
                stockQty: { gte: delta },
              },
              data: {
                stockQty: { decrement: delta },
              },
            });
            if (res.count !== 1) {
              throw new PosValidationError('INSUFFICIENT_STOCK', `Insufficient stock for "${menu.name}".`);
            }
          } else {
            await tx.menu.update({
              where: { id: menu.id },
              data: {
                stockQty: { increment: Math.abs(delta) },
              },
            });
          }

          const updatedMenu = await tx.menu.findUnique({ where: { id: menu.id }, select: { stockQty: true } });
          if (updatedMenu && updatedMenu.stockQty !== null) {
            await tx.menu.update({
              where: { id: menu.id },
              data: { isActive: updatedMenu.stockQty > 0 },
            });
          }
        }

        for (const addon of addonsForStock) {
          if (!addon.trackStock || addon.stockQty === null) continue;
          const oldQty = oldAddonQty.get(addon.id.toString()) ?? 0;
          const newQty = newAddonQty.get(addon.id.toString()) ?? 0;
          const delta = newQty - oldQty;
          if (delta === 0) continue;

          if (delta > 0) {
            const res = await tx.addonItem.updateMany({
              where: {
                id: addon.id,
                trackStock: true,
                stockQty: { gte: delta },
              },
              data: {
                stockQty: { decrement: delta },
              },
            });
            if (res.count !== 1) {
              throw new PosValidationError('INSUFFICIENT_STOCK', `Insufficient stock for "${addon.name}".`);
            }
          } else {
            await tx.addonItem.update({
              where: { id: addon.id },
              data: {
                stockQty: { increment: Math.abs(delta) },
              },
            });
          }

          const updatedAddon = await tx.addonItem.findUnique({ where: { id: addon.id }, select: { stockQty: true } });
          if (updatedAddon && updatedAddon.stockQty !== null) {
            await tx.addonItem.update({
              where: { id: addon.id },
              data: { isActive: updatedAddon.stockQty > 0 },
            });
          }
        }
      }

      await tx.orderItemAddon.deleteMany({
        where: {
          orderItem: {
            orderId: existingOrder.id,
          },
        },
      });

      await tx.orderItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      for (const itemData of orderItemsData) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: existingOrder.id,
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
            data: itemData.addons.map((addon) => ({
              orderItemId: orderItem.id,
              addonItemId: addon.addonItemId,
              addonName: addon.addonName,
              addonPrice: addon.addonPrice,
              quantity: addon.quantity,
              subtotal: addon.subtotal,
            })),
          });
        }
      }

      if (existingOrder.orderDiscounts && existingOrder.orderDiscounts.length > 0) {
        await tx.orderDiscount.deleteMany({
          where: { orderId: existingOrder.id },
        });

        for (const discount of discountsToApply) {
          await applyOrderDiscount({
            tx,
            merchantId: merchant.id,
            orderId: existingOrder.id,
            source: discount.source,
            currency: merchant.currency || 'AUD',
            label: discount.label,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            discountAmount: discount.discountAmount,
            voucherTemplateId: discount.voucherTemplateId,
            voucherCodeId: discount.voucherCodeId,
            appliedByUserId: discount.appliedByUserId,
            appliedByCustomerId: discount.appliedByCustomerId,
          });
        }
      }

      if (existingOrder.payment) {
        await tx.payment.update({
          where: { orderId: existingOrder.id },
          data: {
            amount: totalAmount,
          },
        });
      }

      const updateData = {
        customerId,
        tableNumber: body.tableNumber || null,
        notes: body.notes || null,
        subtotal,
        taxAmount,
        serviceChargeAmount,
        packagingFeeAmount,
        discountAmount,
        totalAmount,
        editedAt: new Date(),
        editedByUserId: userId ?? null,
      } as any;

      await tx.order.update({
        where: { id: existingOrder.id },
        data: updateData,
      });
    });

    if (shouldAdjustStock && merchant.stockAlertEnabled) {
      for (const menu of menusForStock) {
        if (!menu.trackStock || menu.stockQty === null) continue;
        const oldQty = oldMenuQty.get(menu.id.toString()) ?? 0;
        const newQty = newMenuQty.get(menu.id.toString()) ?? 0;
        const delta = newQty - oldQty;
        if (delta <= 0) continue;

        const previousQty = menu.stockQty;
        const updatedQty = menu.stockQty - delta;
        const threshold = menu.lowStockThreshold ?? merchant.defaultLowStockThreshold ?? 0;

        if (updatedQty <= 0) {
          userNotificationService.notifyStockOut(merchant.id, menu.name, menu.id).catch((error: Error) => {
            console.error('[POS Edit] Stock notification failed:', error);
          });
        } else if (threshold > 0 && previousQty > threshold && updatedQty <= threshold) {
          userNotificationService.notifyLowStock(merchant.id, menu.name, menu.id, updatedQty, threshold).catch((error: Error) => {
            console.error('[POS Edit] Low stock notification failed:', error);
          });
        }
      }

      for (const addon of addonsForStock) {
        if (!addon.trackStock || addon.stockQty === null) continue;
        const oldQty = oldAddonQty.get(addon.id.toString()) ?? 0;
        const newQty = newAddonQty.get(addon.id.toString()) ?? 0;
        const delta = newQty - oldQty;
        if (delta <= 0) continue;

        const previousQty = addon.stockQty;
        const updatedQty = addon.stockQty - delta;
        const threshold = addon.lowStockThreshold ?? merchant.defaultLowStockThreshold ?? 0;

        if (updatedQty <= 0) {
          userNotificationService.notifyAddonStockOut(merchant.id, addon.name, addon.id).catch((error: Error) => {
            console.error('[POS Edit] Addon stock notification failed:', error);
          });
        } else if (threshold > 0 && previousQty > threshold && updatedQty <= threshold) {
          userNotificationService.notifyAddonLowStock(merchant.id, addon.name, addon.id, updatedQty, threshold).catch((error: Error) => {
            console.error('[POS Edit] Addon low stock notification failed:', error);
          });
        }
      }
    }

    const updatedOrder = await OrderManagementService.getOrderById(existingOrder.id, merchantId);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
      message: 'Order updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('[PUT /api/merchant/orders/pos/[orderId]] Error:', error);

    if (error instanceof PosValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'POS_VALIDATION_ERROR',
          errorCode: error.errorCode,
          message: error.message,
          ...(error.details ? { details: serializeBigInt(error.details) } : {}),
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
