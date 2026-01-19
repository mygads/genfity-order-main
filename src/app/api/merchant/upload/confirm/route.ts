/**
 * Upload Confirm API (R2)
 * POST /api/merchant/upload/confirm
 *
 * Body:
 * - type: 'logo' | 'banner'
 * - publicUrl: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const { type, publicUrl } = body || {};

    if (!type || !['logo', 'banner'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TYPE', message: 'Type must be logo or banner', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!publicUrl || typeof publicUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL_REQUIRED', message: 'publicUrl is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!BlobService.isManagedUrl(publicUrl)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_URL', message: 'URL is not managed by R2', statusCode: 400 },
        { status: 400 }
      );
    }

    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const merchantCode = merchantUser.merchant.code.toLowerCase();
    const lowerUrl = publicUrl.toLowerCase();

    if (!lowerUrl.includes(`/merchants/${merchantCode}/`)) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Cannot update this asset', statusCode: 403 },
        { status: 403 }
      );
    }

    const updateData: { logoUrl?: string; bannerUrl?: string } = {};
    const existing = await prisma.merchant.findUnique({
      where: { id: merchantUser.merchantId },
      select: { logoUrl: true, bannerUrl: true },
    });

    if (type === 'logo') {
      if (existing?.logoUrl) {
        try {
          await BlobService.deleteFile(existing.logoUrl);
        } catch {
          // ignore cleanup errors
        }
      }
      updateData.logoUrl = publicUrl;
    } else {
      if (existing?.bannerUrl) {
        try {
          await BlobService.deleteFile(existing.bannerUrl);
        } catch {
          // ignore cleanup errors
        }
      }
      updateData.bannerUrl = publicUrl;
    }

    await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        type,
      },
      message: `Merchant ${type} updated successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Upload confirm error:', error);
    return NextResponse.json(
      { success: false, error: 'CONFIRM_FAILED', message: 'Failed to confirm upload', statusCode: 500 },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
