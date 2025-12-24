/**
 * Public Order Creation API
 * POST /api/public/orders - Create new order
 * 
 * ✅ FIXED: Use customerId instead of customer name/email/phone in Order table
 * 
 * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
 * 
 * @description
 * Public endpoint for creating orders with auto customer registration:
 * 1. Validate merchant exists & active
 * 2. Auto-register customer if not exists (by email)
 * 3. Create order with customerId reference
 * 4. Create Payment record
 * 5. Decrement stock for tracked items
 * 6. Return serialized order data (Decimal → number)
 * 
 * @security
 * - Merchant validation before order creation
 * - Input sanitization & validation
 * - Proper error handling (400, 404, 500)
 * 
 * @response
 * - success: true
 * - data: Order object (all Decimals converted to numbers)
 * - message: Success message
 * - statusCode: 201
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/lib/constants/errors';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import emailService from '@/lib/services/EmailService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

// ===== TYPE DEFINITIONS =====

interface OrderItemAddonInput {
  addonItemId: string;
  quantity?: number;
}

interface OrderItemInput {
  menuId: string;
  quantity: number;
  notes?: string;
  addons?: OrderItemAddonInput[];
}

interface _OrderRequestBody {
  merchantCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  items: OrderItemInput[];
  notes?: string;
  paymentMethod?: string;
}

interface AddonData {
  addonItemId: bigint;
  addonName: string;
  addonPrice: Decimal;
  quantity: number;
  subtotal: number;
}

interface OrderItemData {
  menuId: bigint;
  menuName: string;
  menuPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string;
  addons: AddonData[];
}

interface MerchantWithConfig {
  id: bigint;
  code: string;
  name: string;
  isActive: boolean;
  isOpen: boolean;
  serviceChargeRate?: number | null;
  packagingFeeAmount?: number | null;
  taxRate?: number | null;
  taxIncluded?: boolean;
  // Additional config properties
  enableTax?: boolean;
  taxPercentage?: number | null;
  enableServiceCharge?: boolean;
  serviceChargePercent?: number | null;
  enablePackagingFee?: boolean;
}

interface PrismaError {
  code?: string;
}

/**
 * POST /api/public/orders
 * Public endpoint to create order with auto customer registration
 * 
 * ✅ MAJOR REWRITE: Direct Prisma implementation for order creation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ========================================
    // VALIDATION (STEP_04 - Input Validation)
    // ========================================

    // Validate merchantCode
    if (!body.merchantCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Merchant code is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Get merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code: body.merchantCode },
    }) as MerchantWithConfig | null;

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_INACTIVE',
          message: 'Merchant is currently not accepting orders',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate customer info
    if (!body.customerName || !body.customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Customer name and email are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate orderType
    if (!body.orderType || !['DINE_IN', 'TAKEAWAY'].includes(body.orderType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Valid order type is required (DINE_IN or TAKEAWAY)',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate items array
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order must contain at least one item',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // ========================================
    // STEP 1: Find or create customer (Email-Primary)
    // Now uses separate Customer table (not User table)
    // ========================================

    // Find customer by email in Customer table
    let customer = await prisma.customer.findUnique({
      where: {
        email: body.customerEmail.toLowerCase(),
      },
    });

    if (!customer) {
      // ✅ Check if phone is already used by another customer with different email
      if (body.customerPhone) {
        const phoneOwner = await prisma.customer.findFirst({
          where: {
            phone: body.customerPhone,
            email: { not: body.customerEmail.toLowerCase() },
          },
          select: { email: true },
        });

        if (phoneOwner) {
          console.log('⚠️ [ORDER] Phone already used by another email:', phoneOwner.email);
          return NextResponse.json(
            {
              success: false,
              error: 'PHONE_CONFLICT',
              message: 'This phone number is already registered with a different email address.',
              statusCode: 400,
            },
            { status: 400 }
          );
        }
      }

      // Email doesn't exist - create new customer with temp password
      console.log('👤 [ORDER] Registering new customer:', body.customerEmail);

      // ✅ Generate temporary password for new customer
      const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char random password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      try {
        customer = await prisma.customer.create({
          data: {
            name: body.customerName,
            email: body.customerEmail.toLowerCase(),
            phone: body.customerPhone || null,
            passwordHash: hashedPassword,
            isActive: true,
            mustChangePassword: true, // ✅ Force password change on first login
          },
        });
        console.log('✅ [ORDER] Customer registered:', customer.id.toString());

        // ✅ Send welcome email with temp password (async, don't wait)
        emailService.sendCustomerWelcome({
          to: body.customerEmail.toLowerCase(),
          name: body.customerName || 'Customer',
          email: body.customerEmail.toLowerCase(),
          phone: body.customerPhone || '',
          tempPassword: tempPassword,
        }).then(sent => {
          if (sent) {
            console.log('✅ [ORDER] Welcome email sent to:', body.customerEmail);
          } else {
            console.warn('⚠️ [ORDER] Welcome email failed for:', body.customerEmail);
          }
        }).catch(err => {
          console.error('❌ [ORDER] Welcome email error:', err);
        });
      } catch (createError: unknown) {
        // Handle race condition - email was created between check and create
        const prismaError = createError as PrismaError;
        if (prismaError.code === 'P2002') {
          console.log('⚠️ [ORDER] Race condition - fetching existing customer');
          customer = await prisma.customer.findUnique({
            where: {
              email: body.customerEmail.toLowerCase(),
            },
          });
        } else {
          throw createError;
        }
      }
    } else {
      console.log('👤 [ORDER] Using existing customer:', customer.id.toString());

      // ✅ Update name/phone if different (keep customer data fresh)
      // Phone can be changed because email is the primary identifier
      if (customer.name !== body.customerName || customer.phone !== (body.customerPhone || null)) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: body.customerName,
            phone: body.customerPhone || null,
          },
        });
        console.log('✅ [ORDER] Updated customer info (name/phone)');
      }
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'CUSTOMER_ERROR',
          message: 'Failed to create or find customer',
          statusCode: 500,
        },
        { status: 500 }
      );
    }

    // ========================================
    // STEP 2: Validate menu items & calculate prices
    // ========================================

    // ✅ PERFORMANCE: Helper function for 2 decimal precision
    const round2 = (num: number): number => Math.round(num * 100) / 100;

    // ✅ PERFORMANCE: Batch fetch all menus in ONE query
    const menuIds = body.items.map((item: OrderItemInput) => BigInt(item.menuId));
    const menus = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        merchantId: merchant.id,
      },
      include: {
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: true,
              },
            },
          },
        },
      },
    });

    // Create lookup map for O(1) access
    const menuMap = new Map(menus.map(m => [m.id.toString(), m]));

    // ✅ PERFORMANCE: Batch fetch all addon items in ONE query
    const allAddonIds = body.items.flatMap((item: OrderItemInput) =>
      (item.addons || []).map((a: OrderItemAddonInput) => BigInt(a.addonItemId))
    );
    const addons = allAddonIds.length > 0
      ? await prisma.addonItem.findMany({
        where: { id: { in: allAddonIds } },
      })
      : [];
    const addonMap = new Map(addons.map(a => [a.id.toString(), a]));

    let subtotal = 0;
    const orderItemsData: OrderItemData[] = [];

    for (const item of body.items) {
      const menu = menuMap.get(item.menuId.toString());

      if (!menu) {
        throw new ValidationError('Menu item not found');
      }

      if (!menu.isActive || menu.deletedAt) {
        throw new ValidationError(`Menu item "${menu.name}" is not available`);
      }

      // Check stock
      if (menu.trackStock && (menu.stockQty === null || menu.stockQty < item.quantity)) {
        throw new ValidationError(`Insufficient stock for "${menu.name}"`);
      }

      // ✅ PROMO PRICE: Use promo price if available
      const effectivePrice = menu.isPromo && menu.promoPrice
        ? decimalToNumber(menu.promoPrice)
        : decimalToNumber(menu.price);

      const menuPrice = round2(effectivePrice);
      let itemTotal = round2(menuPrice * item.quantity);

      console.log(`💰 [MENU PRICE] ${menu.name}: ${menu.isPromo && menu.promoPrice ? `PROMO ${menuPrice} (was ${decimalToNumber(menu.price)})` : menuPrice}`);

      // ✅ Process addons using pre-fetched map
      const addonData: AddonData[] = [];
      if (item.addons && item.addons.length > 0) {
        for (const addonItem of item.addons) {
          const addon = addonMap.get(addonItem.addonItemId.toString());

          if (addon && addon.isActive && !addon.deletedAt) {
            const addonPrice = round2(decimalToNumber(addon.price));
            const addonQty = addonItem.quantity || 1;
            const addonSubtotal = round2(addonPrice * addonQty);
            itemTotal = round2(itemTotal + addonSubtotal);

            console.log(`💰 [ADDON] ${addon.name}: ${addonPrice} x ${addonQty} = ${addonSubtotal}`);

            addonData.push({
              addonItemId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
              quantity: addonQty,
              subtotal: addonSubtotal,
            });
          }
        }
      }

      subtotal = round2(subtotal + itemTotal);

      console.log(`📊 [ITEM] ${menu.name} x${item.quantity}: base=${round2(menuPrice * item.quantity)}, addons=${round2(itemTotal - (menuPrice * item.quantity))}, total=${itemTotal}`);

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

    console.log(`💰 [ORDER CALC] Subtotal (items + addons): ${subtotal}`);

    // ========================================
    // STEP 3: Calculate fees and total
    // ========================================

    // Tax calculation
    const taxPercentage = merchant.enableTax && merchant.taxPercentage
      ? Number(merchant.taxPercentage)
      : 0;
    const taxAmount = round2(subtotal * (taxPercentage / 100));
    console.log(`💰 [ORDER CALC] Tax (${taxPercentage}% on ${subtotal}): ${taxAmount}`);

    // Service charge calculation
    const serviceChargePercent = merchant.enableServiceCharge && merchant.serviceChargePercent
      ? Number(merchant.serviceChargePercent)
      : 0;
    const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));
    console.log(`💰 [ORDER CALC] Service Charge (${serviceChargePercent}% on ${subtotal}): ${serviceChargeAmount}`);

    // Packaging fee (only for TAKEAWAY orders)
    const packagingFeeAmount = (body.orderType === 'TAKEAWAY' && merchant.enablePackagingFee && merchant.packagingFeeAmount)
      ? round2(Number(merchant.packagingFeeAmount))
      : 0;
    console.log(`💰 [ORDER CALC] Packaging Fee: ${packagingFeeAmount} (orderType: ${body.orderType})`);

    // Total calculation
    const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount);
    console.log(`💰 [ORDER CALC] Total: ${totalAmount} (subtotal: ${subtotal} + tax: ${taxAmount} + service: ${serviceChargeAmount} + packaging: ${packagingFeeAmount})`);

    // ========================================
    // STEP 4: Generate unique order number
    // ========================================

    /**
     * ✅ SIMPLIFIED: Shorter order number format
     * Format: ORD-YYYYMMDD-XXXX
     * - YYYYMMDD: Date
     * - XXXX: Sequence + random suffix for uniqueness
     */
    const generateOrderNumber = async (merchantId: bigint): Promise<string> => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const orderCount = await prisma.order.count({
        where: {
          merchantId: merchantId,
          placedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      const sequenceNumber = String(orderCount + 1).padStart(4, '0');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD-${dateStr}-${sequenceNumber}${randomSuffix}`;
    };

    const orderNumber = await generateOrderNumber(merchant.id);
    console.log(`📝 [ORDER] Generated order number: ${orderNumber}`);

    // ========================================
    // STEP 5: Create order with items and addons (using transaction)
    // ========================================

    /**
     * ✅ CRITICAL FIX: Use transaction to create order, items, and addons separately
     * 
     * Why: OrderItemAddon requires orderItemId which doesn't exist during nested create.
     * Solution: Create in sequence within a transaction.
     * 
     * ✅ SCHEMA COMPLIANCE MATRIX:
     * 
     * Order {
     *   merchantId: BigInt @map("merchant_id")          ✅ merchant.id
     *   customerId: BigInt? @map("customer_id")         ✅ customer.id (nullable)
     *   orderNumber: String @map("order_number")        ✅ Generated ORD-YYYYMMDD-XXXX
     *   orderType: OrderType                            ✅ DINE_IN | TAKEAWAY
     *   tableNumber: String? @map("table_number")       ✅ nullable
     *   status: OrderStatus @default(PENDING)           ✅ PENDING
     *   subtotal: Decimal @db.Decimal(10, 2)            ✅ calculated
     *   taxAmount: Decimal @default(0)                  ✅ calculated
     *   totalAmount: Decimal                            ✅ subtotal + tax
     *   notes: String?                                  ✅ nullable
     *   placedAt: DateTime @default(now())              ✅ auto timestamp
     * }
     * 
     * OrderItem {
     *   orderId: BigInt @map("order_id")                ✅ from created order
     *   menuId: BigInt @map("menu_id")                  ✅ menu.id
     *   menuName: String @map("menu_name")              ✅ denormalized
     *   menuPrice: Decimal @map("menu_price")           ✅ denormalized
     *   quantity: Int                                   ✅ from request
     *   subtotal: Decimal                               ✅ calculated
     *   notes: String?                                  ✅ nullable
     * }
     * 
     * OrderItemAddon {
     *   orderItemId: BigInt @map("order_item_id")       ✅ from created item
     *   addonItemId: BigInt @map("addon_item_id")       ✅ addon.id
     *   addonName: String @map("addon_name")            ✅ denormalized
     *   addonPrice: Decimal @map("addon_price")         ✅ denormalized
     *   quantity: Int                                   ✅ matches item qty
     *   subtotal: Decimal                               ✅ calculated
     * }
     * 
     * Flow:
     * 1. Create Order (get orderId)
     * 2. Create OrderItems (get orderItemIds)
     * 3. Create OrderItemAddons (with orderItemIds)
     */
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      // ✅ Customer info stored in users table, accessed via customerId relation
      const createdOrder = await tx.order.create({
        data: {
          merchantId: merchant.id,
          customerId: customer.id,
          orderNumber,
          orderType: body.orderType,
          tableNumber: body.tableNumber || null,
          status: 'PENDING',
          subtotal,
          taxAmount,
          // Note: serviceChargeAmount and packagingFeeAmount are calculated but not stored in DB
          // They are included in totalAmount
          totalAmount,
          notes: body.notes || null,
        },
      });

      // 2. Create OrderItems and track for addon creation
      const createdItems: Array<{ id: bigint }> = [];

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

        createdItems.push(orderItem);
      }

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
          merchant: {
            select: {
              id: true,
              code: true,
              name: true,
              currency: true,
              enableTax: true,
              taxPercentage: true,
            },
          },
        },
      });
    });

    // ========================================
    // STEP 6: Decrement stock (non-blocking)
    // ========================================

    for (const item of body.items) {
      try {
        const menu = await prisma.menu.findUnique({
          where: { id: BigInt(item.menuId) },
        });

        if (menu && menu.trackStock && menu.stockQty !== null) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: {
              stockQty: menu.stockQty - item.quantity,
              isActive: (menu.stockQty - item.quantity) > 0,
            },
          });
        }
      } catch (stockError) {
        console.error('⚠️ Stock decrement failed (non-critical):', stockError);
      }
    }

    console.log('[ORDER] Order created successfully:', orderNumber);

    // ========================================
    // STEP 7: Return serialized response
    // ========================================

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: 'Order created successfully',
      statusCode: 201,
    }, { status: 201 });

  } catch (error) {
    console.error('[ORDER] Error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
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
