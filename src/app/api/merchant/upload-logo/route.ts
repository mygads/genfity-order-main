/**
 * Merchant Upload Logo API
 * POST /api/merchant/upload-logo - Upload merchant logo
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * POST /api/merchant/upload-logo
 * Upload logo for merchant
 */
async function handlePost(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });
    
    if (!merchantUser) {
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

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'File size must be less than 5MB',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `merchant-logos/${merchantUser.merchant.code}-${Date.now()}.${file.type.split('/')[1]}`;
    const blob = await put(filename, file, {
      access: 'public',
    });

    // Update merchant logo URL in database
    await prisma.merchant.update({
      where: { id: merchantUser.merchantId },
      data: { logoUrl: blob.url },
    });

    return NextResponse.json({
      success: true,
      data: { url: blob.url },
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
