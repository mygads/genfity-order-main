/**
 * Merchant Upload Logo API
 * POST /api/merchant/upload-logo - Upload merchant logo
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';

/**
 * POST /api/merchant/upload-logo
 * Upload logo for merchant
 */
async function handlePost(req: NextRequest, authContext: AuthContext) {
  try {
    if (!authContext.merchantId) {
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
      where: { id: authContext.merchantId },
      select: { id: true, code: true },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'No file provided',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const validation = BlobService.validateImageFile(file, 5);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: validation.error || 'Invalid file',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchantCode = merchant.code;

    // Delete old logo before uploading a new one
    await BlobService.deleteOldMerchantLogo(merchantCode);

    // Upload to R2
    const result = await BlobService.uploadMerchantLogo(merchantCode, file);

    // Update merchant logo URL in database
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { logoUrl: result.url },
    });

    return NextResponse.json({
      success: true,
      data: { url: result.url },
      message: 'Logo uploaded successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload logo',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
