/**
 * Upload Merchant Image API
 * POST /api/merchant/upload/merchant-image
 * 
 * Handles upload for merchant logo and banner images
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';

/**
 * POST /api/merchant/upload/merchant-image
 * Upload merchant logo or banner image
 * 
 * FormData:
 * - file: Image file (required)
 * - type: 'logo' | 'banner' (required)
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('type') as string;

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

    if (!imageType || !['logo', 'banner'].includes(imageType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_TYPE',
          message: 'Image type must be "logo" or "banner"',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate file
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

    // Get merchant
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

    const merchantId = String(merchantUser.merchantId);

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let result;
    let updateData: { logoUrl?: string; bannerUrl?: string } = {};

    if (imageType === 'logo') {
      // Delete old logo
      await BlobService.deleteOldMerchantLogo(merchantId);
      // Upload new logo
      result = await BlobService.uploadMerchantLogo(merchantId, buffer);
      updateData = { logoUrl: result.url };
    } else {
      // Delete old banner
      await BlobService.deleteOldMerchantBanner(merchantId);
      // Upload new banner
      result = await BlobService.uploadMerchantBanner(merchantId, buffer);
      updateData = { bannerUrl: result.url };
    }

    // Update merchant with new image URL
    await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        type: imageType,
      },
      message: `Merchant ${imageType} uploaded successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Failed to upload image',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
