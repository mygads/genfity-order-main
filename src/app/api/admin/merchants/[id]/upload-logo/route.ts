/**
 * Upload Merchant Logo API
 * POST /api/admin/merchants/:id/upload-logo
 * Access: SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { BlobService } from '@/lib/services/BlobService';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function uploadMerchantLogoHandler(
  request: NextRequest,
  _authContext: AuthContext,
  context: RouteContext
) {
  try {
    const merchantIdResult = await requireBigIntRouteParam(context, 'id');
    if (!merchantIdResult.ok) {
      return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
    }

    const merchantId = merchantIdResult.value;
    const merchantIdStr = merchantId.toString();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded', error: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = BlobService.validateImageFile(file, 5); // Max 5MB
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || 'Invalid file', error: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Check if merchant exists using Prisma
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, code: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found', error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete old logo if exists
    await BlobService.deleteOldMerchantLogo(merchant.code);

    // Upload new logo
    const uploadResult = await BlobService.uploadMerchantLogo(merchant.code, file);

    // Update merchant logo URL in database using Prisma
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        logoUrl: uploadResult.url,
      },
    });

    return successResponse(
      {
        url: uploadResult.url,
        downloadUrl: uploadResult.downloadUrl,
        pathname: uploadResult.pathname,
      },
      'Merchant logo uploaded successfully',
      200
    );
  } catch (error) {
    console.error('Upload merchant logo error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload merchant logo', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const POST = withSuperAdmin(uploadMerchantLogoHandler);
