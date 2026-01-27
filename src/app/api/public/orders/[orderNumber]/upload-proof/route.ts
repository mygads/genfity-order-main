/**
 * Customer payment proof upload API
 * POST /api/public/orders/[orderNumber]/upload-proof
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';

const MAX_SIDE = 1400;

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  try {
    const { orderNumber } = params;
    const token = request.nextUrl.searchParams.get('token') || '';

    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order number is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
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

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        merchant: { select: { code: true } },
        payment: true,
      },
    });

    if (!order || !order.merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const ok = token
      ? verifyOrderTrackingToken({
          token,
          merchantCode: order.merchant.code,
          orderNumber: order.orderNumber,
        })
      : false;

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (!order.payment) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const metadata = await sharp(buffer).metadata();

    const resizedBuffer = await sharp(buffer)
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    await BlobService.deleteOldPaymentProof(order.merchant.code, orderNumber);
    const upload = await BlobService.uploadPaymentProof(order.merchant.code, orderNumber, resizedBuffer);

    const updated = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        customerProofUrl: upload.url,
        customerProofMeta: {
          format: 'jpeg',
          source: {
            width: metadata.width ?? null,
            height: metadata.height ?? null,
            format: metadata.format ?? null,
          },
        } as any,
        customerProofUploadedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        payment: updated,
        proofUrl: upload.url,
      }),
      message: 'Payment proof uploaded',
      statusCode: 200,
    });
  } catch (error) {
    console.error('❌ [API] Upload payment proof error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload payment proof',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
