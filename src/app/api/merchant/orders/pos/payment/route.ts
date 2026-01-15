/**
 * POS Payment Recording API
 * POST /api/merchant/orders/pos/payment - Record payment for POS order
 * 
 * Features:
 * - Record cash or card payment
 * - Calculate change for cash payments
 * - Update order status to COMPLETED
 * - Track payment details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { Prisma } from '@prisma/client';
import { computeVoucherDiscount, applyOrderDiscount } from '@/lib/services/OrderVoucherService';

/**
 * Payment Request Body Interface
 */
interface PaymentRequest {
  orderId: number | string;
  paymentMethod: 'CASH_ON_COUNTER' | 'CARD_ON_COUNTER' | 'SPLIT';
  amountPaid?: number;
  changeAmount?: number;
  notes?: string;
  cashAmount?: number;
  cardAmount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
  voucherCode?: string;
  voucherTemplateId?: number | string;
}

/**
 * POST /api/merchant/orders/pos/payment
 * Record payment for a POS order
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

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { orderId, paymentMethod, amountPaid, changeAmount, notes } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Payment method is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate payment method
    const validMethods = ['CASH_ON_COUNTER', 'CARD_ON_COUNTER', 'SPLIT'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;

    const voucherCodeRaw = typeof body.voucherCode === 'string' ? body.voucherCode.trim() : '';

    const numericVoucherTemplateId =
      body.voucherTemplateId !== undefined && body.voucherTemplateId !== null
        ? BigInt(typeof body.voucherTemplateId === 'string' ? parseInt(body.voucherTemplateId, 10) : body.voucherTemplateId)
        : null;

    // Find the order and verify it belongs to this merchant
    const order = await prisma.order.findFirst({
      where: {
        id: BigInt(numericOrderId),
        merchantId: BigInt(merchantId),
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        subtotal: true,
        orderType: true,
        status: true,
        orderItems: {
          select: {
            menuId: true,
            subtotal: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found or does not belong to this merchant',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if payment already exists (POS create-order currently creates a PENDING payment)
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId: order.id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        amount: true,
        paidAt: true,
        paidByUserId: true,
      },
    });

    const merchant = await prisma.merchant.findUnique({
      where: { id: BigInt(merchantId) },
      select: { currency: true, timezone: true },
    });

    const merchantCurrency = merchant?.currency || 'AUD';
    const merchantTimezone = merchant?.timezone || 'Australia/Sydney';

    const orderTotalAmountBeforeDiscount = Number(order.totalAmount);

    const requestedDiscountAmount =
      typeof body.discountAmount === 'number' && Number.isFinite(body.discountAmount)
        ? body.discountAmount
        : undefined;

    const requestedDiscountType = body.discountType;
    const requestedDiscountValue = typeof body.discountValue === 'number' && Number.isFinite(body.discountValue)
      ? body.discountValue
      : undefined;

    const orderItems = (order.orderItems || []).map((i) => ({
      menuId: i.menuId,
      subtotal: Number(i.subtotal),
    }));

    let discountAmountToApply = 0;
    let discountLabel: string | null = null;
    let discountSource: 'POS_VOUCHER' | 'MANUAL' | null = null;
    let voucherTemplateIdToApply: bigint | null = null;
    let voucherCodeIdToApply: bigint | null = null;
    let discountTypeToStore: 'PERCENTAGE' | 'FIXED_AMOUNT' | null = null;
    let discountValueToStore: number | null = null;

    if (voucherCodeRaw) {
      const computed = await computeVoucherDiscount({
        merchantId: BigInt(merchantId),
        merchantCurrency,
        merchantTimezone,
        audience: 'POS',
        orderType: order.orderType,
        subtotal: Number(order.subtotal),
        items: orderItems,
        voucherCode: voucherCodeRaw,
        customerId: null,
        orderIdForStacking: order.id,
      });

      discountAmountToApply = computed.discountAmount;
      discountLabel = computed.label;
      discountSource = 'POS_VOUCHER';
      voucherTemplateIdToApply = computed.templateId;
      voucherCodeIdToApply = computed.codeId;
      discountTypeToStore = computed.discountType;
      discountValueToStore = computed.discountValue;
    } else if (numericVoucherTemplateId) {
      const computed = await computeVoucherDiscount({
        merchantId: BigInt(merchantId),
        merchantCurrency,
        merchantTimezone,
        audience: 'POS',
        orderType: order.orderType,
        subtotal: Number(order.subtotal),
        items: orderItems,
        voucherTemplateId: numericVoucherTemplateId,
        customerId: null,
        orderIdForStacking: order.id,
      });

      // Default to template values
      discountAmountToApply = computed.discountAmount;
      discountLabel = computed.label;
      discountSource = 'POS_VOUCHER';
      voucherTemplateIdToApply = computed.templateId;
      voucherCodeIdToApply = null;
      discountTypeToStore = computed.discountType;
      discountValueToStore = computed.discountValue;

      // Allow cashier override of type/value (still bounded by eligible subtotal and template caps via computeVoucherDiscount)
      if (requestedDiscountType && requestedDiscountValue !== undefined && requestedDiscountValue > 0) {
        const eligible = computed.eligibleSubtotal;
        if (requestedDiscountType === 'PERCENTAGE') {
          const pct = Math.max(0, Math.min(requestedDiscountValue, 100));
          let amount = eligible * (pct / 100);
          // If the template has a max cap, computeVoucherDiscount already enforced it for template defaults,
          // but we must enforce again for overrides.
          const template = await prisma.orderVoucherTemplate.findUnique({
            where: { id: computed.templateId },
            select: { maxDiscountAmount: true },
          });
          if (template?.maxDiscountAmount) {
            amount = Math.min(amount, Number(template.maxDiscountAmount));
          }
          discountAmountToApply = Math.min(amount, eligible);
          discountTypeToStore = 'PERCENTAGE';
          discountValueToStore = pct;
        } else {
          discountAmountToApply = Math.min(requestedDiscountValue, eligible);
          discountTypeToStore = 'FIXED_AMOUNT';
          discountValueToStore = requestedDiscountValue;
        }
      }
    } else if (requestedDiscountAmount !== undefined && requestedDiscountAmount > 0) {
      discountAmountToApply = requestedDiscountAmount;
      discountLabel = 'Manual discount';
      discountSource = 'MANUAL';
      voucherCodeIdToApply = null;
      discountTypeToStore = requestedDiscountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT';
      discountValueToStore = requestedDiscountValue ?? null;
    }

    // Compute final total server-side (do not trust client finalTotal)
    const finalTotal = Math.max(0, orderTotalAmountBeforeDiscount - discountAmountToApply);
    const totalAmount = Number.isFinite(finalTotal) ? finalTotal : orderTotalAmountBeforeDiscount;

    const paidAmount = amountPaid !== undefined ? amountPaid : totalAmount;
    const change = changeAmount !== undefined ? changeAmount : Math.max(0, paidAmount - totalAmount);

    // Map SPLIT into a valid Prisma PaymentMethod (schema does not have SPLIT).
    // Store the split breakdown in metadata.
    const cashAmount = typeof body.cashAmount === 'number' ? body.cashAmount : undefined;
    const cardAmount = typeof body.cardAmount === 'number' ? body.cardAmount : undefined;

    const prismaPaymentMethod: 'CASH_ON_COUNTER' | 'CARD_ON_COUNTER' =
      paymentMethod === 'SPLIT'
        ? (cashAmount && !cardAmount
          ? 'CASH_ON_COUNTER'
          : !cashAmount && cardAmount
            ? 'CARD_ON_COUNTER'
            : 'CASH_ON_COUNTER')
        : paymentMethod;

    // Build payment metadata
    const metadata = {
      source: 'POS',
      paidAmount,
      changeAmount: change,
      notes: notes || '',
      requestedPaymentMethod: paymentMethod,
      ...(paymentMethod === 'SPLIT'
        ? {
          split: {
            cashAmount: cashAmount ?? 0,
            cardAmount: cardAmount ?? 0,
          },
        }
        : {}),
    };

    // Create or update payment record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Keep order totals in sync with what was paid (discount applied at payment step)
      if (discountAmountToApply > 0) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            totalAmount: new Prisma.Decimal(totalAmount),
          },
        });

        if (discountSource && discountLabel && discountTypeToStore) {
          await applyOrderDiscount({
            tx,
            merchantId: BigInt(merchantId),
            orderId: order.id,
            source: discountSource,
            currency: merchantCurrency,
            label: discountLabel,
            discountType: discountTypeToStore,
            discountValue: discountValueToStore,
            discountAmount: discountAmountToApply,
            voucherTemplateId: voucherTemplateIdToApply,
            voucherCodeId: voucherCodeIdToApply,
            appliedByUserId: BigInt(userId),
            appliedByCustomerId: null,
            // Replace any prior POS-entered discount to prevent duplicates on retries
            replaceExistingSources: ['POS_VOUCHER', 'MANUAL'],
          });
        }
      }

      if (existingPayment) {
        // Idempotent behavior: if already completed, just return it as success.
        if (existingPayment.status === 'COMPLETED') {
          return await tx.payment.findUniqueOrThrow({ where: { id: existingPayment.id } });
        }

        // Upgrade existing PENDING payment to COMPLETED
        return await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: new Prisma.Decimal(totalAmount),
            paymentMethod: prismaPaymentMethod,
            status: 'COMPLETED',
            paidByUserId: BigInt(userId),
            paidAt: new Date(),
            notes: notes || null,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });
      }

      // No payment exists yet, create a new record
      return await tx.payment.create({
        data: {
          orderId: order.id,
          amount: new Prisma.Decimal(totalAmount),
          paymentMethod: prismaPaymentMethod,
          status: 'COMPLETED',
          paidByUserId: BigInt(userId),
          paidAt: new Date(),
          notes: notes || null,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    });

    console.log(`[POS Payment] Payment recorded for order ${order.orderNumber}: ${paymentMethod}, Amount: ${totalAmount}`);

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        paymentId: result.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        paymentMethod,
        paidAmount,
        changeAmount: change,
        status: 'COMPLETED',
      }),
    });

  } catch (error) {
    console.error('[POS Payment API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to record payment',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
