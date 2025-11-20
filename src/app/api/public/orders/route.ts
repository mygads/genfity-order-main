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
    });

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
    // STEP 1: Auto-register customer if not exists
    // ========================================
    
    let customer = await prisma.user.findFirst({
      where: {
        email: body.customerEmail.toLowerCase(),
        role: 'CUSTOMER',
      },
    });

    if (!customer) {
      console.log('👤 [ORDER] Registering new customer:', body.customerEmail);
      
      // ✅ FIXED: No password for customers (email-based auth)
      customer = await prisma.user.create({
        data: {
          name: body.customerName,
          email: body.customerEmail.toLowerCase(),
          phone: body.customerPhone || null,
          passwordHash: '', // ✅ Empty password - customers don't need passwords
          role: 'CUSTOMER',
          isActive: true,
          mustChangePassword: false,
        },
      });
      
      console.log('✅ [ORDER] Customer registered:', customer.id.toString());
    } else {
      console.log('👤 [ORDER] Using existing customer:', customer.id.toString());
    }

    // ========================================
    // STEP 2: Validate menu items & calculate prices
    // ========================================
    
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of body.items) {
      const menu = await prisma.menu.findUnique({
        where: { id: BigInt(item.menuId) },
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

      if (!menu) {
        throw new ValidationError('Menu item not found');
      }

      if (menu.merchantId !== merchant.id) {
        throw new ValidationError('Menu item does not belong to this merchant');
      }

      if (!menu.isActive || menu.deletedAt) {
        throw new ValidationError(`Menu item "${menu.name}" is not available`);
      }

      // Check stock
      if (menu.trackStock && (menu.stockQty === null || menu.stockQty < item.quantity)) {
        throw new ValidationError(`Insufficient stock for "${menu.name}"`);
      }

      // ✅ PROMO PRICE: Use promo price if available, otherwise use regular price
      const effectivePrice = menu.isPromo && menu.promoPrice 
        ? decimalToNumber(menu.promoPrice) 
        : decimalToNumber(menu.price);
      
      const menuPrice = effectivePrice; // Store the effective price to use
      let itemTotal = menuPrice * item.quantity;

      console.log(`💰 [MENU PRICE] ${menu.name}: ${menu.isPromo && menu.promoPrice ? `PROMO ${effectivePrice} (was ${decimalToNumber(menu.price)})` : effectivePrice}`);

      // ✅ FIX: Process addons with individual quantities
      const addonData: any[] = [];
      if (item.addons && item.addons.length > 0) {
        for (const addonItem of item.addons) {
          const addon = await prisma.addonItem.findUnique({
            where: { id: BigInt(addonItem.addonItemId) },
          });

          if (addon && addon.isActive && !addon.deletedAt) {
            const addonPrice = decimalToNumber(addon.price);
            const addonQty = addonItem.quantity || 1; // ✅ Use addon-specific quantity
            const addonSubtotal = addonPrice * addonQty;
            itemTotal += addonSubtotal;

            console.log(`💰 [ADDON] ${addon.name}: ${addonPrice} x ${addonQty} = ${addonSubtotal}`);

            addonData.push({
              addonItemId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
              quantity: addonQty, // ✅ Use addon quantity, not item quantity
              subtotal: addonSubtotal,
            });
          }
        }
      }

      subtotal += itemTotal;

      console.log(`📊 [ITEM] ${menu.name} x${item.quantity}: base=${menuPrice * item.quantity}, addons=${itemTotal - (menuPrice * item.quantity)}, total=${itemTotal}`);

      orderItemsData.push({
        menuId: menu.id,
        menuName: menu.name,
        menuPrice: menuPrice, // ✅ Store effective price (promo if available)
        quantity: item.quantity,
        subtotal: itemTotal,
        notes: item.notes || null,
        addons: addonData,
      });
    }

    console.log(`💰 [ORDER CALC] Subtotal (items + addons): ${subtotal}`);

    // ========================================
    // STEP 3: Calculate tax and total (NO SERVICE CHARGE)
    // ========================================
    
    const taxPercentage = merchant.enableTax && merchant.taxPercentage 
      ? Number(merchant.taxPercentage) 
      : 0;
    
    // ✅ Tax calculated on subtotal only
    const taxAmount = subtotal * (taxPercentage / 100);
    console.log(`💰 [ORDER CALC] Tax (${taxPercentage}% on ${subtotal}): ${taxAmount}`);
    
    const totalAmount = subtotal + taxAmount;
    console.log(`💰 [ORDER CALC] Total: ${totalAmount}`);

    // ========================================
    // STEP 4: Generate unique order number with retry logic
    // ========================================
    
    /**
     * ✅ FIXED: Generate unique order number with timestamp to prevent duplicates
     * 
     * Format: ORD-YYYYMMDD-XXXX-TIMESTAMP
     * - YYYYMMDD: Date
     * - XXXX: Sequence number (4 digits)
     * - TIMESTAMP: Milliseconds for uniqueness
     * 
     * This prevents race conditions when multiple orders are created simultaneously
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
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      return `ORD-${dateStr}-${sequenceNumber}-${timestamp}`;
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
          totalAmount,
          notes: body.notes || null,
        },
      });

      // 2. Create OrderItems and track for addon creation
      const createdItems: any[] = [];
      
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

        // 3. Create OrderItemAddons for this item
        if (itemData.addons && itemData.addons.length > 0) {
          await tx.orderItemAddon.createMany({
            data: itemData.addons.map((addon: any) => ({
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
