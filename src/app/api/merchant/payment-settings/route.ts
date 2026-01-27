import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { BlobService } from '@/lib/services/BlobService';

const AccountSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(['BANK', 'EWALLET']),
    providerName: z.string().min(1),
    accountName: z.string().min(1),
    accountNumber: z.string().min(1),
    bsb: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    currency: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

const SettingsSchema = z
  .object({
    payAtCashierEnabled: z.boolean(),
    manualTransferEnabled: z.boolean(),
    qrisEnabled: z.boolean(),
    requirePaymentProof: z.boolean(),
    qrisImageUrl: z.string().url().optional().nullable(),
    qrisImageMeta: z.unknown().optional().nullable(),
    qrisImageUploadedAt: z.string().optional().nullable(),
  })
  .strict();

const BodySchema = z
  .object({
    settings: SettingsSchema,
    accounts: z.array(AccountSchema),
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

function normalizeSettings(input: z.infer<typeof SettingsSchema>, opts: { isQrisEligible: boolean }) {
  const manualTransferEnabled = Boolean(input.manualTransferEnabled);
  const qrisEnabled = opts.isQrisEligible ? Boolean(input.qrisEnabled) : false;
  const hasOnline = manualTransferEnabled || qrisEnabled;

  return {
    payAtCashierEnabled: hasOnline ? Boolean(input.payAtCashierEnabled) : true,
    manualTransferEnabled,
    qrisEnabled,
    requirePaymentProof: Boolean(input.requirePaymentProof),
    qrisImageUrl: qrisEnabled ? (input.qrisImageUrl || null) : null,
    qrisImageMeta: qrisEnabled ? (input.qrisImageMeta ?? null) : null,
    qrisImageUploadedAt: qrisEnabled ? (input.qrisImageUploadedAt ?? null) : null,
  };
}

async function handleGet(_req: NextRequest, authContext: AuthContext) {
  try {
    const merchantId = authContext.merchantId;
    if (!merchantId) {
      return jsonError(400, 'MERCHANT_ID_REQUIRED', 'Merchant ID is required');
    }

    const [merchant, settings, accounts] = await Promise.all([
      prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, country: true, currency: true },
      }),
      prisma.merchantPaymentSettings.findUnique({
        where: { merchantId },
      }),
      prisma.merchantPaymentAccount.findMany({
        where: { merchantId },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!merchant) {
      return jsonError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found for this user');
    }

    const isQrisEligible =
      String(merchant.country || '').toLowerCase() === 'indonesia' &&
      String(merchant.currency || '').toUpperCase() === 'IDR';

    const normalized = normalizeSettings(
      {
        payAtCashierEnabled: settings?.payAtCashierEnabled ?? true,
        manualTransferEnabled: settings?.manualTransferEnabled ?? false,
        qrisEnabled: settings?.qrisEnabled ?? false,
        requirePaymentProof: settings?.requirePaymentProof ?? false,
        qrisImageUrl: settings?.qrisImageUrl ?? null,
        qrisImageMeta: settings?.qrisImageMeta ?? null,
        qrisImageUploadedAt: settings?.qrisImageUploadedAt ? settings.qrisImageUploadedAt.toISOString() : null,
      },
      { isQrisEligible }
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        merchantId: merchant.id,
        settings: normalized,
        accounts,
      }),
      message: 'Payment settings retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving payment settings:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Failed to retrieve payment settings');
  }
}

async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    const merchantId = authContext.merchantId;
    if (!merchantId) {
      return jsonError(400, 'MERCHANT_ID_REQUIRED', 'Merchant ID is required');
    }

    const bodyJson = await req.json();
    const parsed = BodySchema.safeParse(bodyJson);

    if (!parsed.success) {
      return jsonError(400, 'PAYMENT_SETTINGS_INVALID', 'Invalid payment settings payload');
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, country: true, currency: true },
    });

    if (!merchant) {
      return jsonError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found for this user');
    }

    const isQrisEligible =
      String(merchant.country || '').toLowerCase() === 'indonesia' &&
      String(merchant.currency || '').toUpperCase() === 'IDR';

    const settings = normalizeSettings(parsed.data.settings, { isQrisEligible });
    const settingsForDb = {
      ...settings,
      qrisImageMeta: settings.qrisImageMeta ?? Prisma.DbNull,
    };

    const activeAccounts = parsed.data.accounts.filter((account) => account.isActive !== false);

    if (settings.manualTransferEnabled && activeAccounts.length === 0) {
      return jsonError(400, 'PAYMENT_ACCOUNTS_REQUIRED', 'Add at least one active bank/e-wallet account.');
    }

    if (settings.qrisEnabled && !settings.qrisImageUrl) {
      return jsonError(400, 'QRIS_IMAGE_REQUIRED', 'QRIS image is required when QRIS is enabled.');
    }

    const existingSettings = await prisma.merchantPaymentSettings.findUnique({
      where: { merchantId },
      select: { qrisImageUrl: true },
    });

    const mappedAccounts = parsed.data.accounts.map((account, index) => ({
      merchantId,
      type: account.type,
      providerName: account.providerName.trim(),
      accountName: account.accountName.trim(),
      accountNumber: account.accountNumber.trim(),
      bsb: account.bsb?.trim() || null,
      country: account.country || merchant.country || null,
      currency: account.currency || merchant.currency || null,
      isActive: account.isActive !== false,
      sortOrder: typeof account.sortOrder === 'number' ? account.sortOrder : index,
    }));

    const result = await prisma.$transaction(async (tx) => {
      const savedSettings = await tx.merchantPaymentSettings.upsert({
        where: { merchantId },
        create: {
          merchantId,
          ...settingsForDb,
          qrisImageUploadedAt: settings.qrisImageUrl ? new Date() : null,
        },
        update: {
          ...settingsForDb,
          qrisImageUploadedAt: settings.qrisImageUrl ? new Date() : null,
        },
      });

      await tx.merchantPaymentAccount.deleteMany({ where: { merchantId } });
      if (mappedAccounts.length > 0) {
        await tx.merchantPaymentAccount.createMany({ data: mappedAccounts });
      }

      const accounts = await tx.merchantPaymentAccount.findMany({
        where: { merchantId },
        orderBy: { sortOrder: 'asc' },
      });

      return { savedSettings, accounts };
    });

    const previousQrisUrl = existingSettings?.qrisImageUrl;
    if (previousQrisUrl && previousQrisUrl !== settings.qrisImageUrl && BlobService.isManagedUrl(previousQrisUrl)) {
      try {
        await BlobService.deleteFile(previousQrisUrl);
      } catch {
        // Ignore cleanup failures
      }
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        merchantId,
        settings: {
          ...settings,
          qrisImageUploadedAt: settings.qrisImageUrl ? new Date().toISOString() : null,
        },
        accounts: result.accounts,
      }),
      message: 'Payment settings updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Failed to update payment settings');
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
