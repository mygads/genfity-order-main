import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getPosCustomItemsSettings } from '@/lib/utils/posCustomItemsSettings';
import { mergePosCustomItemsFeatures } from '@/lib/utils/posCustomItemsSettings.server';

const CustomItemsSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxNameLength: z.number().int().min(10).max(200).optional(),
    maxPrice: z.number().finite().positive().optional(),
  })
  .strict();

const BodySchema = z
  .object({
    customItems: CustomItemsSchema,
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

async function handlePut(req: NextRequest, authContext: AuthContext) {
  try {
    const bodyJson = await req.json();
    const parsed = BodySchema.safeParse(bodyJson);

    if (!parsed.success) {
      return jsonError(400, 'POS_SETTINGS_INVALID', 'Invalid POS settings payload');
    }

    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return jsonError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found for this user');
    }

    const existingFeatures = (merchantUser.merchant as any)?.features;
    const currency = (merchantUser.merchant as any)?.currency || 'IDR';

    // Merge + normalize
    const nextFeatures = mergePosCustomItemsFeatures({
      existingFeatures,
      patch: {
        enabled: parsed.data.customItems.enabled,
        maxNameLength: parsed.data.customItems.maxNameLength,
        maxPrice: parsed.data.customItems.maxPrice,
      },
    });

    const updated = await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: {
        features: nextFeatures,
      },
      select: {
        id: true,
        currency: true,
        features: true,
      },
    });

    const normalized = getPosCustomItemsSettings({
      features: updated.features,
      currency: updated.currency || currency,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        merchantId: updated.id,
        customItems: normalized,
      }),
      message: 'POS settings updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating POS settings:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Failed to update POS settings');
  }
}

async function handleGet(_req: NextRequest, authContext: AuthContext) {
  try {
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return jsonError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found for this user');
    }

    const currency = (merchantUser.merchant as any)?.currency || 'IDR';
    const features = (merchantUser.merchant as any)?.features;

    const normalized = getPosCustomItemsSettings({
      features,
      currency,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        merchantId: merchantUser.merchantId,
        customItems: normalized,
      }),
      message: 'POS settings retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving POS settings:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Failed to retrieve POS settings');
  }
}

export const PUT = withMerchant(handlePut);
export const GET = withMerchant(handleGet);
