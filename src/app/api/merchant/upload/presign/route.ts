/**
 * Presigned Upload API (R2)
 * POST /api/merchant/upload/presign
 *
 * Body:
 * - type: 'logo' | 'banner' | 'promo' | 'menu' | 'menu-thumb' | 'menu-thumb-2x'
 * - contentType: string (e.g. image/jpeg)
 * - fileSize: number (bytes)
 * - menuId?: string (required for menu types)
 * - allowTemp?: boolean (allow non-numeric menuId for temporary uploads)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  buildR2PublicUrl,
  getR2BucketName,
  getR2S3Client,
  getR2StorageClass,
} from '@/lib/utils/r2Client';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

const TYPE_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function getMaxFileSize(): number {
  const raw = process.env.MAX_FILE_SIZE;
  const parsed = raw ? Number(raw) : 5 * 1024 * 1024;
  return Number.isFinite(parsed) ? parsed : 5 * 1024 * 1024;
}

function buildObjectKey(params: {
  type: string;
  merchantCode: string;
  menuId?: string;
  extension: string;
}): string {
  const { type, merchantCode, menuId, extension } = params;
  const timestamp = Date.now();
  const safeCode = merchantCode.toLowerCase();

  switch (type) {
    case 'logo':
      return `merchants/${safeCode}/logos/logo-${timestamp}.${extension}`;
    case 'banner':
      return `merchants/${safeCode}/banners/banner-${timestamp}.${extension}`;
    case 'promo':
      return `merchants/${safeCode}/promos/promo-${timestamp}.${extension}`;
    case 'menu':
      return `merchants/${safeCode}/menus/menu-${menuId}-${timestamp}.${extension}`;
    case 'menu-thumb':
      return `merchants/${safeCode}/menus/menu-${menuId}-thumb-${timestamp}.${extension}`;
    case 'menu-thumb-2x':
      return `merchants/${safeCode}/menus/menu-${menuId}-thumb-2x-${timestamp}.${extension}`;
    default:
      throw new Error('Invalid upload type');
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const { type, contentType, fileSize, menuId, allowTemp } = body || {};

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { success: false, error: 'TYPE_REQUIRED', message: 'Upload type is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!contentType || typeof contentType !== 'string' || !ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CONTENT_TYPE', message: 'Invalid content type', statusCode: 400 },
        { status: 400 }
      );
    }

    const maxSize = getMaxFileSize();
    const sizeValue = typeof fileSize === 'number' ? fileSize : Number(fileSize);
    if (!Number.isFinite(sizeValue) || sizeValue <= 0 || sizeValue > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_FILE_SIZE',
          message: `File size must be between 1 and ${maxSize} bytes`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const isMenuType = ['menu', 'menu-thumb', 'menu-thumb-2x'].includes(type);
    if (isMenuType && !menuId) {
      return NextResponse.json(
        { success: false, error: 'MENU_ID_REQUIRED', message: 'menuId is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!context.merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { id: true, code: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (menuId && isMenuType && !allowTemp) {
      let menuIdValue: bigint;
      try {
        menuIdValue = BigInt(menuId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'INVALID_MENU_ID', message: 'menuId must be numeric', statusCode: 400 },
          { status: 400 }
        );
      }

      const menu = await prisma.menu.findFirst({
        where: { id: menuIdValue, merchantId: merchant.id },
        select: { id: true },
      });

      if (!menu) {
        return NextResponse.json(
          { success: false, error: 'MENU_NOT_FOUND', message: 'Menu not found', statusCode: 404 },
          { status: 404 }
        );
      }
    }

    const extension = TYPE_EXTENSION_MAP[contentType] || 'bin';
    const objectKey = buildObjectKey({
      type,
      merchantCode: merchant.code,
      menuId: menuId ? String(menuId) : undefined,
      extension,
    });

    const client = getR2S3Client();

    const cacheControl = `public, max-age=31536000, immutable`;

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      ContentType: contentType,
      CacheControl: cacheControl,
      StorageClass: getR2StorageClass(),
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        objectKey,
        publicUrl: buildR2PublicUrl(objectKey),
        expiresIn: 900,
      },
      message: 'Presigned upload URL created',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Presign upload error:', error);
    return NextResponse.json(
      { success: false, error: 'PRESIGN_FAILED', message: 'Failed to create upload URL', statusCode: 500 },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
