import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { DEFAULT_RECEIPT_SETTINGS, type ReceiptSettings } from '@/lib/types/receiptSettings';
import subscriptionService from '@/lib/services/SubscriptionService';
import { Prisma } from '@prisma/client';

const ReceiptSettingsSchema = z
  .object({
    sendCompletedOrderEmailToCustomer: z.boolean().optional(),

    paperSize: z.enum(['58mm', '80mm']).optional(),
    receiptLanguage: z.enum(['en', 'id']).optional(),

    showLogo: z.boolean().optional(),
    showMerchantName: z.boolean().optional(),
    showAddress: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showEmail: z.boolean().optional(),

    showOrderNumber: z.boolean().optional(),
    showOrderType: z.boolean().optional(),
    showTableNumber: z.boolean().optional(),
    showDateTime: z.boolean().optional(),
    showCustomerName: z.boolean().optional(),
    showCustomerPhone: z.boolean().optional(),

    showItemNotes: z.boolean().optional(),
    showAddons: z.boolean().optional(),
    showAddonPrices: z.boolean().optional(),
    showUnitPrice: z.boolean().optional(),

    showSubtotal: z.boolean().optional(),
    showTax: z.boolean().optional(),
    showServiceCharge: z.boolean().optional(),
    showPackagingFee: z.boolean().optional(),
    showDiscount: z.boolean().optional(),
    showTotal: z.boolean().optional(),
    showAmountPaid: z.boolean().optional(),
    showChange: z.boolean().optional(),
    showPaymentMethod: z.boolean().optional(),
    showCashierName: z.boolean().optional(),

    showThankYouMessage: z.boolean().optional(),
    customThankYouMessage: z
      .string()
      .max(300, 'customThankYouMessage is too long')
      .optional()
      .transform((v) => (typeof v === 'string' ? v.trim() : v)),

    showCustomFooterText: z.boolean().optional(),
    customFooterText: z
      .string()
      .max(500, 'customFooterText is too long')
      .optional()
      .transform((v) => (typeof v === 'string' ? v.trim() : v)),

    showFooterPhone: z.boolean().optional(),

    showTrackingQRCode: z.boolean().optional(),
  })
  .strict();

const BodySchema = z
  .object({
    receiptSettings: ReceiptSettingsSchema,
  })
  .strict();

function jsonError(status: number, errorCode: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
      errorCode,
      message,
      statusCode: status,
    },
    { status }
  );
}

function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue {
  // Prisma JSON inputs do not allow `undefined` values.
  // JSON stringify drops undefined keys, giving us a safe JSON-compatible payload.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    const bodyJson = await req.json();
    const parsed = BodySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return jsonError(400, 'RECEIPT_SETTINGS_INVALID', 'Invalid receipt settings payload');
    }

    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return jsonError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found for this user');
    }

    const current = (merchantUser.merchant as any)?.receiptSettings as Partial<ReceiptSettings> | null | undefined;

    const nextMerged: ReceiptSettings = {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...(current || {}),
      ...parsed.data.receiptSettings,
    };

    // Normalize optional text fields
    if (typeof nextMerged.customThankYouMessage === 'string' && !nextMerged.customThankYouMessage.trim()) {
      nextMerged.customThankYouMessage = undefined;
    }
    if (typeof nextMerged.customFooterText === 'string' && !nextMerged.customFooterText.trim()) {
      nextMerged.customFooterText = undefined;
    }

    // Server-side enforcement for paid completed-order email toggle.
    // This prevents API bypass (even if UI gating fails).
    if (nextMerged.sendCompletedOrderEmailToCustomer) {
      const merchantCurrency = (merchantUser.merchant as any)?.currency || 'IDR';
      const pricing = await subscriptionService.getPlanPricing(merchantCurrency);
      const completedEmailFee = pricing.completedOrderEmailFee;

      const isFeeConfigured =
        typeof completedEmailFee === 'number' && Number.isFinite(completedEmailFee) && completedEmailFee > 0;

      if (!isFeeConfigured) {
        return jsonError(
          400,
          'COMPLETED_EMAIL_FEE_NOT_CONFIGURED',
          'Completed-order email fee is not configured. Please contact support.'
        );
      }

      const balanceRecord = await prisma.merchantBalance.findUnique({
        where: { merchantId: merchantUser.merchantId },
        select: { balance: true },
      });

      const currentBalance = balanceRecord ? Number(balanceRecord.balance) : 0;
      const hasSufficientBalance = currentBalance > 0 && currentBalance >= completedEmailFee;

      if (!hasSufficientBalance) {
        return jsonError(
          400,
          'INSUFFICIENT_BALANCE',
          'Insufficient balance to enable completed-order email.'
        );
      }
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: {
        receiptSettings: toPrismaInputJsonValue(nextMerged),
      },
      select: {
        receiptSettings: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { receiptSettings: updated.receiptSettings },
      message: 'Receipt settings updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating receipt settings:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Failed to update receipt settings');
  }
}

export const PUT = withMerchant(handlePut);
