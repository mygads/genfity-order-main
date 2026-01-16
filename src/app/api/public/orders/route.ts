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
import userNotificationService from '@/lib/services/UserNotificationService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';
import DeliveryFeeService from '@/lib/services/DeliveryFeeService';
import { haversineDistanceKm, isPointInPolygon, type LatLng } from '@/lib/utils/geo';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import { optionalCustomerAuth } from '@/lib/middleware/auth';
import { computeVoucherDiscount, applyOrderDiscount } from '@/lib/services/OrderVoucherService';
import {
  type ExtendedMerchantStatus,
  isStoreOpenWithSpecialHoursAtTime,
  isModeAvailableWithSchedulesAtTime,
} from '@/lib/utils/storeStatus';

const DEBUG_ORDERS = process.env.DEBUG_ORDERS === 'true';
const orderLog = (...args: unknown[]) => {
  if (DEBUG_ORDERS) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

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
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  // Scheduled orders (same-day only, merchant timezone)
  // Example: "12:00"
  scheduledTime?: string;
  tableNumber?: string;
  deliveryUnit?: string;
  deliveryBuildingName?: string;
  deliveryBuildingNumber?: string;
  deliveryFloor?: string;
  deliveryInstructions?: string;
  deliveryAddress?: string;
  deliveryStreetLine?: string;
  deliverySuburb?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPostcode?: string;
  deliveryCountry?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  items: OrderItemInput[];
  notes?: string;
  paymentMethod?: string;
  voucherCode?: string;
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
  currency?: string;
  country?: string | null;
  isActive: boolean;
  isOpen: boolean;
  isManualOverride?: boolean;
  isPerDayModeScheduleEnabled?: boolean;
  timezone?: string;
  latitude?: Decimal | null;
  longitude?: Decimal | null;
  // Mode availability
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  dineInScheduleStart?: string | null;
  dineInScheduleEnd?: string | null;
  takeawayScheduleStart?: string | null;
  takeawayScheduleEnd?: string | null;
  isDeliveryEnabled?: boolean;
  enforceDeliveryZones?: boolean;
  deliveryMaxDistanceKm?: Decimal | null;
  deliveryFeeBase?: Decimal | null;
  deliveryFeePerKm?: Decimal | null;
  deliveryFeeMin?: Decimal | null;
  deliveryFeeMax?: Decimal | null;
  deliveryScheduleStart?: string | null;
  deliveryScheduleEnd?: string | null;
  // Fee config
  serviceChargeRate?: number | null;
  // Scheduled orders
  isScheduledOrderEnabled?: boolean;
  packagingFeeAmount?: number | null;
  taxRate?: number | null;
  taxIncluded?: boolean;
  // Additional config properties
  enableTax?: boolean;
  taxPercentage?: number | null;
  enableServiceCharge?: boolean;
  serviceChargePercent?: number | null;
  enablePackagingFee?: boolean;

  // Opening hours + schedules
  openingHours?: Array<{
    dayOfWeek: number;
    openTime?: string | null;
    closeTime?: string | null;
    isClosed: boolean;
    is24Hours?: boolean | null;
  }>;
  modeSchedules?: Array<{
    mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>;
  todaySpecialHour?: {
    date: string | Date;
    name?: string | null;
    isClosed: boolean;
    openTime?: string | null;
    closeTime?: string | null;
    isDineInEnabled?: boolean | null;
    isTakeawayEnabled?: boolean | null;
    isDeliveryEnabled?: boolean | null;
    dineInStartTime?: string | null;
    dineInEndTime?: string | null;
    takeawayStartTime?: string | null;
    takeawayEndTime?: string | null;
    deliveryStartTime?: string | null;
    deliveryEndTime?: string | null;
  } | null;
}

interface PrismaError {
  code?: string;
}

// ===== MODE AVAILABILITY HELPER =====

/**
 * Check if an order mode is currently available
 * Validates against merchant settings and time schedules
 * 
 * @param orderType - 'DINE_IN' or 'TAKEAWAY'
 * @param merchant - Merchant configuration
 * @returns { available: boolean, reason?: string }
 */
function checkModeAvailability(
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
  merchant: MerchantWithConfig
): { available: boolean; reason?: string } {
  const tz = merchant.timezone || 'Australia/Sydney';
  const currentTime = getCurrentTimeInTimezoneString(tz);

  const merchantStatus = merchant as unknown as ExtendedMerchantStatus;
  const store = isStoreOpenWithSpecialHoursAtTime(merchantStatus, currentTime);
  if (!store.isOpen) {
    return { available: false, reason: store.reason || 'Store is currently closed' };
  }

  const mode = isModeAvailableWithSchedulesAtTime(orderType, merchantStatus, currentTime);
  if (!mode.available) {
    return { available: false, reason: mode.reason || 'This order mode is currently unavailable' };
  }

  if (orderType === 'DELIVERY') {
    // Delivery requires merchant coordinates
    if (merchant.latitude === null || merchant.longitude === null) {
      return { available: false, reason: 'Delivery is not available (merchant location not set)' };
    }
  }

  return { available: true };
}

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getCurrentDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
}

function getCurrentTimeInTimezoneString(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function checkModeAvailabilityAtTime(
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
  merchant: MerchantWithConfig,
  timeHHMM: string
): { available: boolean; reason?: string } {
  const merchantStatus = merchant as unknown as ExtendedMerchantStatus;

  // Scheduled orders should be allowed when the store is closed *right now* due to schedule,
  // but must be blocked if the store will be closed at the requested time.
  // Manual override closed should block all scheduling.
  const store = isStoreOpenWithSpecialHoursAtTime(merchantStatus, timeHHMM);
  if (!store.isOpen) {
    return { available: false, reason: store.reason || 'Store is currently closed' };
  }

  const mode = isModeAvailableWithSchedulesAtTime(orderType, merchantStatus, timeHHMM);
  if (!mode.available) {
    return { available: false, reason: mode.reason || 'This order mode is currently unavailable' };
  }

  if (orderType === 'DELIVERY') {
    if (merchant.latitude === null || merchant.longitude === null) {
      return { available: false, reason: 'Delivery is not available (merchant location not set)' };
    }
  }

  return { available: true };
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
      include: {
        openingHours: true,
        modeSchedules: true,
      },
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
    if (!body.orderType || !['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(body.orderType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Valid order type is required (DINE_IN, TAKEAWAY, or DELIVERY)',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const tz = merchant.timezone || 'Australia/Sydney';

    // Attach today's special hour (if any) for correct open/close + mode overrides
    const todayDateStr = getCurrentDateInTimezone(tz);
    const todayDate = new Date(todayDateStr);
    const todaySpecialHour = await prisma.merchantSpecialHour.findUnique({
      where: {
        merchantId_date: {
          merchantId: merchant.id,
          date: todayDate,
        },
      },
    });
    merchant.todaySpecialHour = (todaySpecialHour as unknown as MerchantWithConfig['todaySpecialHour']) ?? null;
    const scheduledTimeRaw = typeof body.scheduledTime === 'string' ? body.scheduledTime.trim() : '';
    const isScheduled = scheduledTimeRaw.length > 0;

    if (isScheduled) {
      if (merchant.isScheduledOrderEnabled !== true) {
        return NextResponse.json(
          {
            success: false,
            error: 'SCHEDULED_ORDERS_DISABLED',
            message: 'Scheduled orders are not enabled for this merchant.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      if (!isValidHHMM(scheduledTimeRaw)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'scheduledTime must be in HH:MM format',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Same-day only (by design): we store today (merchant timezone) + HH:MM.
      const currentTime = getCurrentTimeInTimezoneString(tz);
      if (scheduledTimeRaw < currentTime) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Scheduled time must be later than current time (${currentTime})`,
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

    // ========================================
    // VALIDATE MODE AVAILABILITY (Real-time check)
    // ========================================
    const isModeAvailable = isScheduled
      ? checkModeAvailabilityAtTime(body.orderType, merchant, scheduledTimeRaw)
      : checkModeAvailability(body.orderType, merchant);

    if (!isModeAvailable.available) {
      return NextResponse.json(
        {
          success: false,
          error: 'MODE_UNAVAILABLE',
          message: isModeAvailable.reason || 'This order mode is currently unavailable',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // ========================================
    // DELIVERY VALIDATION + FEE CALC (using DeliveryFeeService)
    // ========================================

    const round2 = (num: number): number => Math.round(num * 100) / 100;

    const optionalTrimmed = (fieldName: string, value: unknown, maxLen: number): string | null => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.length > maxLen) {
        throw new ValidationError(`${fieldName} is too long (max ${maxLen} chars)`);
      }
      return trimmed;
    };

    let deliveryDistanceKm: number | null = null;
    let deliveryFeeAmount = 0;

    if (body.orderType === 'DELIVERY') {
      const deliveryUnit = typeof body.deliveryUnit === 'string' ? body.deliveryUnit.trim() : '';
      const deliveryAddress = String(body.deliveryAddress || '').trim();
      const deliveryLatitude = Number(body.deliveryLatitude);
      const deliveryLongitude = Number(body.deliveryLongitude);

      // Optional structured fields
      // (keep deliveryUnit + deliveryAddress required fields separate)
      optionalTrimmed('deliveryBuildingName', body.deliveryBuildingName, 80);
      optionalTrimmed('deliveryBuildingNumber', body.deliveryBuildingNumber, 20);
      optionalTrimmed('deliveryFloor', body.deliveryFloor, 20);
      optionalTrimmed('deliveryInstructions', body.deliveryInstructions, 300);

      optionalTrimmed('deliveryStreetLine', body.deliveryStreetLine, 120);
      optionalTrimmed('deliverySuburb', body.deliverySuburb, 80);
      optionalTrimmed('deliveryCity', body.deliveryCity, 80);
      optionalTrimmed('deliveryState', body.deliveryState, 80);
      optionalTrimmed('deliveryPostcode', body.deliveryPostcode, 20);
      optionalTrimmed('deliveryCountry', body.deliveryCountry, 80);

      if (deliveryUnit && deliveryUnit.length > 80) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Delivery unit is too long',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      if (!deliveryAddress) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Delivery address is required for delivery orders',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(deliveryLatitude) || !Number.isFinite(deliveryLongitude)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Delivery pin coordinates are required for delivery orders',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Use DeliveryFeeService to validate and calculate fee
      const feeResult = await DeliveryFeeService.validateAndCalculateFee(
        merchant.id,
        deliveryLatitude,
        deliveryLongitude
      );

      if (!feeResult.success) {
        const errorMessage = DeliveryFeeService.getErrorMessage(feeResult.error?.code || '');
        return NextResponse.json(
          {
            success: false,
            error: feeResult.error?.code || 'DELIVERY_VALIDATION_ERROR',
            message: errorMessage,
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      deliveryDistanceKm = feeResult.data!.distanceKm;
      deliveryFeeAmount = round2(feeResult.data!.feeAmount);
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

    const voucherCodeRaw = typeof body.voucherCode === 'string' ? body.voucherCode.trim().toUpperCase() : '';
    const wantsVoucher = voucherCodeRaw.length > 0;

    // If customer voucher is supplied, customer MUST be logged in
    const customerAuth = wantsVoucher ? await optionalCustomerAuth(req) : null;
    if (wantsVoucher && !customerAuth) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTH_REQUIRED',
          message: 'Please log in to use a voucher code.',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // Find customer (prefer authenticated customer when available)
    let customer = customerAuth
      ? await prisma.customer.findUnique({ where: { id: customerAuth.customerId } })
      : await prisma.customer.findUnique({
          where: {
            email: body.customerEmail.toLowerCase(),
          },
        });

    if (customerAuth && customer) {
      // Prevent mixing authenticated account with a different email in request
      if (String(customer.email).toLowerCase() !== String(body.customerEmail).toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            error: 'EMAIL_MISMATCH',
            message: 'Your logged-in account email does not match the checkout email.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
    }

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
          orderLog('⚠️ [ORDER] Phone already used by another email:', phoneOwner.email);
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
      orderLog('👤 [ORDER] Registering new customer:', body.customerEmail);

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
        orderLog('✅ [ORDER] Customer registered:', customer.id.toString());

        // ✅ Send welcome email with temp password (async, don't wait)
        emailService.sendCustomerWelcome({
          to: body.customerEmail.toLowerCase(),
          name: body.customerName || 'Customer',
          email: body.customerEmail.toLowerCase(),
          phone: body.customerPhone || '',
          tempPassword: tempPassword,
          merchantCountry: merchant.country,
        }).then(sent => {
          if (sent) {
            orderLog('✅ [ORDER] Welcome email sent to:', body.customerEmail);
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
          orderLog('⚠️ [ORDER] Race condition - fetching existing customer');
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
      orderLog('👤 [ORDER] Using existing customer:', customer.id.toString());

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
        orderLog('✅ [ORDER] Updated customer info (name/phone)');
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

    // round2 already defined above (used for delivery fee too)

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

    // ✅ PROMO PRICE: Batch fetch active promo prices from SpecialPrice table
    const activePromoPrices = await SpecialPriceService.getActivePromoPrices(menuIds);

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

      // ✅ PROMO PRICE: Use promo price from SpecialPrice table if available
      const promoPrice = activePromoPrices.get(menu.id.toString());
      const originalPrice = decimalToNumber(menu.price);
      const effectivePrice = promoPrice ?? originalPrice;

      const menuPrice = round2(effectivePrice);
      let itemTotal = round2(menuPrice * item.quantity);

      orderLog(`💰 [MENU PRICE] ${menu.name}: ${promoPrice !== undefined ? `PROMO ${menuPrice} (was ${originalPrice})` : menuPrice}`);

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

            orderLog(`💰 [ADDON] ${addon.name}: ${addonPrice} x ${addonQty} = ${addonSubtotal}`);

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

      orderLog(`📊 [ITEM] ${menu.name} x${item.quantity}: base=${round2(menuPrice * item.quantity)}, addons=${round2(itemTotal - (menuPrice * item.quantity))}, total=${itemTotal}`);

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

    orderLog(`💰 [ORDER CALC] Subtotal (items + addons): ${subtotal}`);

    // ========================================
    // STEP 3: Calculate fees and total
    // ========================================

    // Tax calculation
    const taxPercentage = merchant.enableTax && merchant.taxPercentage
      ? Number(merchant.taxPercentage)
      : 0;
    const taxAmount = round2(subtotal * (taxPercentage / 100));
    orderLog(`💰 [ORDER CALC] Tax (${taxPercentage}% on ${subtotal}): ${taxAmount}`);

    // Service charge calculation
    const serviceChargePercent = merchant.enableServiceCharge && merchant.serviceChargePercent
      ? Number(merchant.serviceChargePercent)
      : 0;
    const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));
    orderLog(`💰 [ORDER CALC] Service Charge (${serviceChargePercent}% on ${subtotal}): ${serviceChargeAmount}`);

    // Packaging fee (only for TAKEAWAY orders)
    const packagingFeeAmount = ((body.orderType === 'TAKEAWAY' || body.orderType === 'DELIVERY') && merchant.enablePackagingFee && merchant.packagingFeeAmount)
      ? round2(Number(merchant.packagingFeeAmount))
      : 0;
    orderLog(`💰 [ORDER CALC] Packaging Fee: ${packagingFeeAmount} (orderType: ${body.orderType})`);

    // Total calculation
    const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount + deliveryFeeAmount);
    orderLog(`💰 [ORDER CALC] Total: ${totalAmount} (subtotal: ${subtotal} + tax: ${taxAmount} + service: ${serviceChargeAmount} + packaging: ${packagingFeeAmount} + delivery: ${deliveryFeeAmount})`);

    // ========================================
    // STEP 3b: Apply customer voucher (optional)
    // ========================================

    let discountAmount = 0;
    let voucherDiscount: null | {
      templateId: bigint;
      codeId: bigint | null;
      label: string;
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      discountValue: number;
      discountAmount: number;
    } = null;

    if (wantsVoucher) {
      voucherDiscount = await computeVoucherDiscount({
        merchantId: merchant.id,
        merchantCurrency: merchant.currency || 'AUD',
        merchantTimezone: tz,
        audience: 'CUSTOMER',
        orderType: body.orderType,
        subtotal,
        items: orderItemsData.map((i) => ({ menuId: i.menuId, subtotal: i.subtotal })),
        voucherCode: voucherCodeRaw,
        customerId: customer?.id ?? null,
        orderIdForStacking: null,
      });

      discountAmount = round2(Math.min(voucherDiscount.discountAmount, totalAmount));
      orderLog(`🎟️ [VOUCHER] Applied customer voucher: ${voucherDiscount.label} => -${discountAmount}`);
    }

    const totalAmountAfterDiscount = round2(Math.max(0, totalAmount - discountAmount));

    // ========================================
    // STEP 4: Generate unique order number
    // ========================================

    /**
     * ✅ SIMPLIFIED: 4-character alphanumeric order number
     * Format: A1BC (4 chars, A-Z + 0-9)
     * - Easy to read/communicate verbally
     * - Unique per merchant per day (resets daily)
     */
    const generateOrderNumber = async (merchantId: bigint): Promise<string> => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const maxRetries = 10;
      let attempt = 0;

      while (attempt < maxRetries) {
        // Generate 4-character alphanumeric code
        let orderNumber = '';
        for (let i = 0; i < 4; i++) {
          orderNumber += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if this order number already exists for this merchant (today only)
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
          orderLog(`📝 [ORDER] Generated unique order number: ${orderNumber} (attempt ${attempt + 1})`);
          return orderNumber;
        }

        attempt++;
        console.warn(`⚠️ [ORDER] Order number ${orderNumber} collision, retrying... (attempt ${attempt})`);
      }

      // Fallback: add timestamp suffix if all retries fail
      const fallback = `${Date.now().toString(36).slice(-4).toUpperCase()}`;
      console.warn(`⚠️ [ORDER] Max retries reached, using fallback: ${fallback}`);
      return fallback;
    };

    const orderNumber = await generateOrderNumber(merchant.id);
    orderLog(`📝 [ORDER] Generated order number: ${orderNumber}`);

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
    const scheduledDate = isScheduled ? getCurrentDateInTimezone(tz) : null;
    const now = new Date();
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
          isScheduled,
          scheduledDate,
          scheduledTime: isScheduled ? scheduledTimeRaw : null,
          stockDeductedAt: isScheduled ? null : now,
          deliveryStatus: body.orderType === 'DELIVERY' ? 'PENDING_ASSIGNMENT' : null,
          deliveryUnit: body.orderType === 'DELIVERY' ? (typeof body.deliveryUnit === 'string' ? body.deliveryUnit.trim() || null : null) : null,
          deliveryBuildingName: body.orderType === 'DELIVERY' ? (typeof body.deliveryBuildingName === 'string' ? body.deliveryBuildingName.trim() || null : null) : null,
          deliveryBuildingNumber: body.orderType === 'DELIVERY' ? (typeof body.deliveryBuildingNumber === 'string' ? body.deliveryBuildingNumber.trim() || null : null) : null,
          deliveryFloor: body.orderType === 'DELIVERY' ? (typeof body.deliveryFloor === 'string' ? body.deliveryFloor.trim() || null : null) : null,
          deliveryInstructions: body.orderType === 'DELIVERY' ? (typeof body.deliveryInstructions === 'string' ? body.deliveryInstructions.trim() || null : null) : null,
          deliveryAddress: body.orderType === 'DELIVERY' ? String(body.deliveryAddress || '').trim() : null,
          deliveryStreetLine: body.orderType === 'DELIVERY' ? (typeof body.deliveryStreetLine === 'string' ? body.deliveryStreetLine.trim() || null : null) : null,
          deliverySuburb: body.orderType === 'DELIVERY' ? (typeof body.deliverySuburb === 'string' ? body.deliverySuburb.trim() || null : null) : null,
          deliveryCity: body.orderType === 'DELIVERY' ? (typeof body.deliveryCity === 'string' ? body.deliveryCity.trim() || null : null) : null,
          deliveryState: body.orderType === 'DELIVERY' ? (typeof body.deliveryState === 'string' ? body.deliveryState.trim() || null : null) : null,
          deliveryPostcode: body.orderType === 'DELIVERY' ? (typeof body.deliveryPostcode === 'string' ? body.deliveryPostcode.trim() || null : null) : null,
          deliveryCountry: body.orderType === 'DELIVERY' ? (typeof body.deliveryCountry === 'string' ? body.deliveryCountry.trim() || null : null) : null,
          deliveryLatitude: body.orderType === 'DELIVERY' ? Number(body.deliveryLatitude) : null,
          deliveryLongitude: body.orderType === 'DELIVERY' ? Number(body.deliveryLongitude) : null,
          deliveryDistanceKm: body.orderType === 'DELIVERY' && deliveryDistanceKm !== null ? deliveryDistanceKm : null,
          deliveryFeeAmount,
          subtotal,
          taxAmount,
          serviceChargeAmount,
          packagingFeeAmount,
          discountAmount,
          totalAmount: totalAmountAfterDiscount,
          notes: body.notes || null,
        } as any,
      });

      if (voucherDiscount) {
        await applyOrderDiscount({
          tx,
          merchantId: merchant.id,
          orderId: createdOrder.id,
          source: 'CUSTOMER_VOUCHER',
          currency: merchant.currency || 'AUD',
          label: voucherDiscount.label,
          discountType: voucherDiscount.discountType,
          discountValue: voucherDiscount.discountValue,
          discountAmount,
          voucherTemplateId: voucherDiscount.templateId,
          voucherCodeId: voucherDiscount.codeId,
          appliedByUserId: null,
          appliedByCustomerId: customer?.id ?? null,
        });

        // Also ensure totalAmount is discounted (applyOrderDiscount only syncs discountAmount)
        await tx.order.update({
          where: { id: createdOrder.id },
          data: {
            totalAmount: totalAmountAfterDiscount,
          } as any,
        });
      }

      // 1b. Create Payment record (orderId is required and unique)
      // For DELIVERY, default to CASH_ON_DELIVERY; for others, default to CASH_ON_COUNTER.
      const requestedPaymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
      const allowedMethods = body.orderType === 'DELIVERY'
        ? new Set(['CASH_ON_DELIVERY', 'ONLINE'])
        : new Set(['CASH_ON_COUNTER', 'CARD_ON_COUNTER']);

      const defaultMethod = body.orderType === 'DELIVERY' ? 'CASH_ON_DELIVERY' : 'CASH_ON_COUNTER';
      const paymentMethod = requestedPaymentMethod || defaultMethod;
      if (!allowedMethods.has(paymentMethod)) {
        throw new ValidationError('Invalid payment method');
      }

      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: totalAmountAfterDiscount,
          paymentMethod: paymentMethod as any,
          status: 'PENDING',
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

    if (!isScheduled) {
      for (const item of body.items) {
        try {
          const menu = await prisma.menu.findUnique({
            where: { id: BigInt(item.menuId) },
          });

          if (menu && menu.trackStock && menu.stockQty !== null) {
            const newQty = menu.stockQty - item.quantity;
            await prisma.menu.update({
              where: { id: menu.id },
              data: {
                stockQty: newQty,
                isActive: newQty > 0,
              },
            });

            // Send stock out notification if item is now out of stock
            if (newQty <= 0) {
              userNotificationService.notifyStockOut(merchant.id, menu.name, menu.id).catch(err => {
                console.error('⚠️ Stock notification failed:', err);
              });
            }
          }
        } catch (stockError) {
          console.error('⚠️ Stock decrement failed (non-critical):', stockError);
        }
      }
    }

    orderLog('[ORDER] Order created successfully:', orderNumber);

    // Send new order notification to merchant users (async, non-blocking)
    if (order) {
      userNotificationService.notifyNewOrder(
        merchant.id,
        order.id,
        orderNumber,
        totalAmount
      ).catch(err => {
        console.error('⚠️ Order notification failed:', err);
      });
    }

    // ========================================
    // STEP 7: Return serialized response
    // ========================================

    const serializedOrder = serializeBigInt(order) as Record<string, unknown>;
    // Never expose admin-only note fields to public endpoints
    delete (serializedOrder as any).adminNote;
    delete (serializedOrder as any).kitchenNotes;

    return NextResponse.json({
      success: true,
      data: {
        ...serializedOrder,
        trackingToken: createOrderTrackingToken({ merchantCode: merchant.code, orderNumber }),
      },
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
