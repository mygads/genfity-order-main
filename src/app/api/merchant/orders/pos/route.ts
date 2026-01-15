/**
 * POS (Point of Sale) Order Creation API
 * POST /api/merchant/orders/pos - Create order from POS terminal
 * 
 * Features:
 * - Staff/Admin creates orders directly
 * - Auto-accepts orders (status = ACCEPTED)
 * - Optional customer info (auto-creates if not provided)
 * - Optional table number
 * - Per-item notes and order notes
 * - Addon support
 * - Manual payment flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import userNotificationService from '@/lib/services/UserNotificationService';
import { getPosCustomItemsSettings } from '@/lib/utils/posCustomItemsSettings';

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

/**
 * Helper function to round to 2 decimal places
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Validation Error Class
 */
class PosValidationError extends Error {
  public readonly errorCode: string;

  constructor(errorCode: string, message: string) {
    super(message);
    this.name = 'PosValidationError';
    this.errorCode = errorCode;
  }
}

/**
 * POS Order Request Body Interface
 */
interface POSOrderRequest {
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  notes?: string;
  items: Array<{
    type?: 'MENU' | 'CUSTOM';
    // MENU item
    menuId?: number | string;
    // CUSTOM item
    customName?: string;
    customPrice?: number;
    // common
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

/**
 * Addon Data Interface
 */
interface AddonData {
  addonItemId: bigint;
  addonName: string;
  addonPrice: number;
  quantity: number;
  subtotal: number;
}

/**
 * Order Item Data Interface
 */
interface OrderItemData {
  menuId: bigint;
  menuName: string;
  menuPrice: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
  addons: AddonData[];
}

/**
 * POST /api/merchant/orders/pos
 * Create order from POS terminal
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
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

    const body: POSOrderRequest = await req.json();

    // ========================================
    // VALIDATION
    // ========================================

    if (!body.orderType || !['DINE_IN', 'TAKEAWAY'].includes(body.orderType)) {
      throw new PosValidationError('INVALID_ORDER_TYPE', 'Invalid order type. Must be DINE_IN or TAKEAWAY.');
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new PosValidationError('EMPTY_ITEMS', 'Order must have at least one item.');
    }

    // Normalize items (default type = MENU)
    const normalizedItems = body.items.map((item) => ({
      ...item,
      type: item.type === 'CUSTOM' ? 'CUSTOM' : 'MENU',
    }));

    // ========================================
    // STEP 1: Get merchant data
    // ========================================

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        code: true,
        name: true,
        currency: true,
        features: true,
        enableTax: true,
        taxPercentage: true,
        enableServiceCharge: true,
        serviceChargePercent: true,
        enablePackagingFee: true,
        packagingFeeAmount: true,
        stockAlertEnabled: true,
        defaultLowStockThreshold: true,
      },
    });

    if (!merchant) {
      throw new PosValidationError('MERCHANT_NOT_FOUND', 'Merchant not found.');
    }

    const posCustomItems = getPosCustomItemsSettings({
      features: merchant.features,
      currency: merchant.currency,
    });

    // ========================================
    // STEP 2: Handle customer (optional)
    // ========================================

    let customerId: bigint | null = null;

    if (body.customer && (body.customer.name || body.customer.phone || body.customer.email)) {
      // Try to find existing customer by email (primary identifier)
      let existingCustomer = null;

      if (body.customer.email) {
        existingCustomer = await prisma.customer.findUnique({
          where: {
            email: body.customer.email.toLowerCase(),
          },
        });
      }

      // If not found by email, try by phone
      if (!existingCustomer && body.customer.phone) {
        existingCustomer = await prisma.customer.findFirst({
          where: {
            phone: body.customer.phone,
          },
        });
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update name/phone if provided (keep customer data fresh)
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
        // Create new customer (email is required for new customers)
        const newCustomer = await prisma.customer.create({
          data: {
            name: body.customer.name || 'Walk-in Customer',
            email: body.customer.email.toLowerCase(),
            phone: body.customer.phone || null,
          },
        });
        customerId = newCustomer.id;
      }
      // If only phone provided without email, we don't create a customer
      // (customerId remains null, which is fine for walk-in orders)
    }

    // ========================================
    // STEP 3: Fetch menu items and addons
    // ========================================

    const menuItemsOnly = normalizedItems.filter(i => i.type === 'MENU');
    const customItemsOnly = normalizedItems.filter(i => i.type === 'CUSTOM');

    const menuIds = menuItemsOnly.map(item => toBigIntId(item.menuId as any, 'menuId'));
    const addonItemIds: bigint[] = [];

    menuItemsOnly.forEach(item => {
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => {
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
      // Fetch active special prices
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

    // Create maps for efficient lookup
    const menuMap = new Map(menus.map(m => [m.id.toString(), m]));
    const addonMap = new Map(addons.map(a => [a.id.toString(), a]));
    const promoPriceMap = new Map<string, number>();

    // Build promo price map
    specialPrices.forEach(sp => {
      if (sp.promoPrice !== null) {
        promoPriceMap.set(sp.menuId.toString(), decimalToNumber(sp.promoPrice));
      }
    });

    // ========================================
    // STEP 4: Calculate prices
    // ========================================

    let subtotal = 0;
    const orderItemsData: OrderItemData[] = [];

    // If there are any custom items, ensure we have a hidden placeholder Menu to satisfy FK constraints.
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
        });

        continue;
      }

      const menuId = toBigIntId(item.menuId as any, 'menuId');
      const menu = menuMap.get(menuId.toString());

      if (!menu) {
        throw new PosValidationError('MENU_NOT_FOUND', `Menu item with ID ${item.menuId} not found.`);
      }

      if (!menu.isActive || menu.deletedAt) {
        throw new PosValidationError('MENU_NOT_AVAILABLE', `Menu item "${menu.name}" is not available.`);
      }

      // Check stock
      if (menu.trackStock && (menu.stockQty === null || menu.stockQty < item.quantity)) {
        throw new PosValidationError('INSUFFICIENT_STOCK', `Insufficient stock for "${menu.name}".`);
      }

      // Use promo price if available
      const promoPrice = promoPriceMap.get(menu.id.toString());
      const originalPrice = decimalToNumber(menu.price);
      const effectivePrice = promoPrice ?? originalPrice;
      const menuPrice = round2(effectivePrice);
      let itemTotal = round2(menuPrice * item.quantity);

      // Process addons
      const addonData: AddonData[] = [];
      if (item.addons && item.addons.length > 0) {
        for (const addonItem of item.addons) {
          const addon = addonMap.get(addonItem.addonItemId.toString());

          if (addon && addon.isActive && !addon.deletedAt) {
            const addonPrice = round2(decimalToNumber(addon.price));
            const addonQty = addonItem.quantity || 1;
            const addonSubtotal = round2(addonPrice * addonQty);
            itemTotal = round2(itemTotal + addonSubtotal);

            addonData.push({
              addonItemId: addon.id,
              addonName: addon.name,
              addonPrice: addonPrice,
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
        menuPrice: menuPrice,
        quantity: item.quantity,
        subtotal: itemTotal,
        notes: item.notes || null,
        addons: addonData,
      });
    }

    // ========================================
    // STEP 5: Calculate fees and total
    // ========================================

    // Tax calculation
    const taxPercentage = merchant.enableTax && merchant.taxPercentage
      ? Number(merchant.taxPercentage)
      : 0;
    const taxAmount = round2(subtotal * (taxPercentage / 100));

    // Service charge calculation
    const serviceChargePercent = merchant.enableServiceCharge && merchant.serviceChargePercent
      ? Number(merchant.serviceChargePercent)
      : 0;
    const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));

    // Packaging fee (only for TAKEAWAY orders)
    const packagingFeeAmount = (body.orderType === 'TAKEAWAY' && merchant.enablePackagingFee && merchant.packagingFeeAmount)
      ? round2(Number(merchant.packagingFeeAmount))
      : 0;

    // Total calculation
    const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount);

    // ========================================
    // STEP 6: Generate unique order number
    // ========================================

    const generateOrderNumber = async (merchantId: bigint): Promise<string> => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const maxRetries = 10;
      let attempt = 0;

      while (attempt < maxRetries) {
        let orderNumber = '';
        for (let i = 0; i < 4; i++) {
          orderNumber += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existingOrder = await prisma.order.findFirst({
          where: {
            merchantId: merchantId,
            orderNumber: orderNumber,
            placedAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        if (!existingOrder) {
          return orderNumber;
        }

        attempt++;
      }

      // Fallback
      return `${Date.now().toString(36).slice(-4).toUpperCase()}`;
    };

    const orderNumber = await generateOrderNumber(merchant.id);

    // ========================================
    // STEP 7: Create order with ACCEPTED status
    // ========================================

    const order = await prisma.$transaction(async (tx) => {
      // Create Order with ACCEPTED status (auto-accept for POS orders)
      const createdOrder = await tx.order.create({
        data: {
          merchantId: merchant.id,
          customerId: customerId,
          orderNumber,
          orderType: body.orderType,
          tableNumber: body.tableNumber || null,
          status: 'ACCEPTED', // Auto-accept for POS orders
          subtotal,
          taxAmount,
          totalAmount,
          notes: body.notes || null,
        },
      });

      // Create OrderItems
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

        if (itemData.addons && itemData.addons.length > 0) {
          await tx.orderItemAddon.createMany({
            data: itemData.addons.map((addon: AddonData) => ({
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

      // Create Payment record with PENDING status
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: totalAmount,
          paymentMethod: 'CASH_ON_COUNTER', // Default for POS
          status: 'PENDING',
        },
      });

      // Return complete order with relations
      return await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          orderItems: {
            include: {
              addons: true,
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
          payment: true,
          merchant: {
            select: {
              id: true,
              code: true,
              name: true,
              currency: true,
            },
          },
        },
      });
    });

    // ========================================
    // STEP 8: Decrement stock (non-blocking)
    // ========================================

    for (const item of menuItemsOnly) {
      try {
        const menu = await prisma.menu.findUnique({
          where: { id: toBigIntId(item.menuId as any, 'menuId') },
          select: {
            id: true,
            name: true,
            trackStock: true,
            stockQty: true,
            lowStockThreshold: true,
          },
        });

        if (menu && menu.trackStock && menu.stockQty !== null) {
          const previousQty = menu.stockQty;
          const newQty = menu.stockQty - item.quantity;
          await prisma.menu.update({
            where: { id: menu.id },
            data: {
              stockQty: newQty,
              isActive: newQty > 0,
            },
          });

          // Stock alerts
          if (merchant.stockAlertEnabled) {
            const threshold = menu.lowStockThreshold ?? merchant.defaultLowStockThreshold;

            // Out of stock
            if (newQty <= 0) {
              userNotificationService.notifyStockOut(merchant.id, menu.name, menu.id).catch((error: Error) => {
                console.error('[POS] Stock notification failed:', error);
              });
            } else if (threshold > 0 && previousQty > threshold && newQty <= threshold) {
              // Low stock (only when crossing from above threshold -> <= threshold)
              userNotificationService.notifyLowStock(merchant.id, menu.name, menu.id, newQty, threshold).catch((error: Error) => {
                console.error('[POS] Low stock notification failed:', error);
              });
            }
          }
        }
      } catch (stockError) {
        console.error('[POS] Stock decrement failed (non-critical):', stockError);
      }
    }

    // ========================================
    // STEP 9: Return response
    // ========================================

    console.log(`[POS] Order created successfully: ${orderNumber}`);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: 'Order created successfully',
      statusCode: 201,
    }, { status: 201 });

  } catch (error) {
    console.error('[POS] Error:', error);

    if (error instanceof PosValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'POS_VALIDATION_ERROR',
          errorCode: error.errorCode,
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
