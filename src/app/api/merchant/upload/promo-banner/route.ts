/**
 * Upload Promo Banner API
 * POST /api/merchant/upload/promo-banner
 *
 * Uploads promotional banners for customer display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';

async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'FILE_REQUIRED',
          message: 'File is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const validation = BlobService.validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_FILE',
          message: validation.error,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const existingUrls = Array.isArray((merchantUser.merchant as any)?.promoBannerUrls)
      ? (merchantUser.merchant as any).promoBannerUrls
      : [];

    if (existingUrls.length >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'LIMIT_REACHED',
          message: 'Maximum 10 promotional banners allowed',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const merchantCode = merchantUser.merchant.code;
    const result = await BlobService.uploadMerchantPromoBanner(merchantCode, buffer);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
      },
      message: 'Promo banner uploaded successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Promo banner upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Failed to upload promo banner',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
