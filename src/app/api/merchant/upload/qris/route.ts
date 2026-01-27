/**
 * Upload QRIS Image API
 * POST /api/merchant/upload/qris
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

const QRIS_SIZE = 900;

async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

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

    if (!context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { id: true, code: true, country: true, currency: true },
    });

    if (!merchant) {
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

    const isQrisEligible =
      String(merchant.country || '').toLowerCase() === 'indonesia' &&
      String(merchant.currency || '').toUpperCase() === 'IDR';

    if (!isQrisEligible) {
      return NextResponse.json(
        {
          success: false,
          error: 'QRIS_NOT_ELIGIBLE',
          message: 'QRIS is available only for merchants in Indonesia (IDR).',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const metadata = await sharp(buffer).metadata();

    const normalizedBuffer = await sharp(buffer)
      .rotate()
      .resize(QRIS_SIZE, QRIS_SIZE, { fit: 'cover' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    await BlobService.deleteOldMerchantQris(merchant.code);
    const result = await BlobService.uploadMerchantQris(merchant.code, normalizedBuffer);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        meta: {
          size: QRIS_SIZE,
          format: 'jpeg',
          source: {
            width: metadata.width ?? null,
            height: metadata.height ?? null,
            format: metadata.format ?? null,
          },
        },
      },
      message: 'QRIS image uploaded successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Upload QRIS error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Failed to upload QRIS image',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
