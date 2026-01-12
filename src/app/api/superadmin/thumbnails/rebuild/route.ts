/**
 * Super Admin Utility: Global Thumbnail Rebuild
 *
 * GET  /api/superadmin/thumbnails/rebuild
 * POST /api/superadmin/thumbnails/rebuild
 *
 * This job is intended to be run once to backfill:
 * - Menu.imageThumbUrl + Menu.imageThumbMeta for all merchants
 * - StockPhoto.thumbnailUrl
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { BlobService } from '@/lib/services/BlobService';

const JOB_KEY = 'GLOBAL_THUMBNAIL_REBUILD_V1';

type PostBody = {
  action: 'start' | 'tick';
  force?: boolean;
  batchSizeMenus?: number;
  batchSizeStockPhotos?: number;
  onlyMissing?: boolean;
  dryRun?: boolean;
};

async function fetchImageBuffer(url: string, timeoutMs: number): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

function clampBatchSize(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'number' ? value : fallback;
  return Math.min(Math.max(n, min), max);
}

async function getStatusHandler(_req: NextRequest, _ctx: AuthContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await (prisma as any).maintenanceJob.findUnique({
    where: { jobKey: JOB_KEY },
  });

  return NextResponse.json({
    success: true,
    data: {
      job: job ? serializeBigInt(job) : null,
    },
    statusCode: 200,
  });
}

async function startHandler(req: NextRequest, _ctx: AuthContext) {
  const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;
  const force = body.force === true;

  const onlyMissing = body.onlyMissing !== undefined ? Boolean(body.onlyMissing) : true;
  const dryRun = body.dryRun === true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).maintenanceJob.findUnique({
    where: { jobKey: JOB_KEY },
  });

  if (existing?.status === 'RUNNING') {
    return NextResponse.json(
      {
        success: false,
        error: 'ALREADY_RUNNING',
        message: 'Global thumbnail rebuild is already running',
        data: { job: serializeBigInt(existing) },
        statusCode: 409,
      },
      { status: 409 }
    );
  }

  if (existing?.status === 'COMPLETED' && !force) {
    return NextResponse.json(
      {
        success: false,
        error: 'ALREADY_COMPLETED',
        message: 'Global thumbnail rebuild has already been completed',
        data: { job: serializeBigInt(existing) },
        statusCode: 409,
      },
      { status: 409 }
    );
  }

  const menuWhere: Prisma.MenuWhereInput = {
    deletedAt: null,
    imageUrl: { not: null },
  };

  if (onlyMissing) {
    menuWhere.OR = [{ imageThumbUrl: null }, { imageThumbMeta: { equals: Prisma.DbNull } }];
  }

  const stockWhere: Prisma.StockPhotoWhereInput = {
    isActive: true,
    imageUrl: { not: '' },
    ...(onlyMissing ? { thumbnailUrl: null } : {}),
  };

  const [menuTotal, stockTotal] = await Promise.all([
    prisma.menu.count({ where: menuWhere }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).stockPhoto.count({ where: stockWhere }),
  ]);

  const total = menuTotal + stockTotal;

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await (prisma as any).maintenanceJob.upsert({
    where: { jobKey: JOB_KEY },
    create: {
      jobKey: JOB_KEY,
      status: 'RUNNING',
      progressCurrent: 0,
      progressTotal: total,
      startedAt: now,
      completedAt: null,
      lastError: null,
      message: `Starting (menus: ${menuTotal}, stock photos: ${stockTotal})`,
    },
    update: {
      status: 'RUNNING',
      progressCurrent: 0,
      progressTotal: total,
      startedAt: now,
      completedAt: null,
      lastError: null,
      message: `Restarting (menus: ${menuTotal}, stock photos: ${stockTotal})`,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      job: serializeBigInt(job),
      breakdown: { menus: menuTotal, stockPhotos: stockTotal },
      onlyMissing,
      dryRun,
    },
    statusCode: 200,
  });
}

async function tickHandler(req: NextRequest, _ctx: AuthContext) {
  const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;

  const onlyMissing = body.onlyMissing !== undefined ? Boolean(body.onlyMissing) : true;
  const dryRun = body.dryRun === true;

  const batchSizeMenus = clampBatchSize(body.batchSizeMenus, 20, 1, 200);
  const batchSizeStockPhotos = clampBatchSize(body.batchSizeStockPhotos, 20, 1, 200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await (prisma as any).maintenanceJob.findUnique({
    where: { jobKey: JOB_KEY },
  });

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: 'NOT_STARTED',
        message: 'Job not started. Call start first.',
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  if (job.status !== 'RUNNING') {
    return NextResponse.json({
      success: true,
      data: { job: serializeBigInt(job) },
      statusCode: 200,
    });
  }

  const menuWhere: Prisma.MenuWhereInput = {
    deletedAt: null,
    imageUrl: { not: null },
  };

  if (onlyMissing) {
    menuWhere.OR = [{ imageThumbUrl: null }, { imageThumbMeta: { equals: Prisma.DbNull } }];
  }

  const stockWhere: Prisma.StockPhotoWhereInput = {
    isActive: true,
    imageUrl: { not: '' },
    ...(onlyMissing ? { thumbnailUrl: null } : {}),
  };

  const [menus, stockPhotos] = await Promise.all([
    prisma.menu.findMany({
      where: menuWhere,
      select: {
        id: true,
        merchantId: true,
        imageUrl: true,
      },
      take: batchSizeMenus,
      orderBy: { id: 'asc' },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).stockPhoto.findMany({
      where: stockWhere,
      select: { id: true, imageUrl: true },
      take: batchSizeStockPhotos,
      orderBy: { id: 'asc' },
    }),
  ]);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  // Menus
  for (const menu of menus) {
    processed++;

    if (!menu.imageUrl) {
      failed++;
      continue;
    }

    try {
      const buffer = await fetchImageBuffer(menu.imageUrl, 15000);
      const sourceMetadata = await sharp(buffer).metadata();

      const sourceWidth = sourceMetadata.width ?? null;
      const sourceHeight = sourceMetadata.height ?? null;

      const thumbJpegBuffer = await sharp(buffer)
        .rotate()
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const thumb2xJpegBuffer = await sharp(buffer)
        .rotate()
        .resize(600, 600, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      if (dryRun) {
        updated++;
        continue;
      }

      const imageKey = menu.id.toString();
      const merchantIdString = menu.merchantId.toString();

      const thumbResult = await BlobService.uploadMenuImageThumbnail(
        merchantIdString,
        imageKey,
        thumbJpegBuffer
      );

      const thumb2xResult = await BlobService.uploadMenuImageThumbnail2x(
        merchantIdString,
        imageKey,
        thumb2xJpegBuffer
      );

      const imageThumbMeta = {
        format: 'jpeg',
        source: {
          width: sourceWidth,
          height: sourceHeight,
          format: sourceMetadata.format ?? null,
        },
        variants: [
          { dpr: 1, width: 300, height: 300, url: thumbResult.url },
          { dpr: 2, width: 600, height: 600, url: thumb2xResult.url },
        ],
      };

      await prisma.menu.update({
        where: { id: menu.id },
        data: {
          imageThumbUrl: thumbResult.url,
          imageThumbMeta: imageThumbMeta as unknown as object,
        },
      });

      updated++;
    } catch (error) {
      if (!dryRun) {
        // Mark as handled to avoid infinite retries: fallback to full image
        const fallbackMeta = {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallback: true,
        };

        await prisma.menu.update({
          where: { id: menu.id },
          data: {
            imageThumbUrl: menu.imageUrl,
            imageThumbMeta: fallbackMeta as unknown as object,
          },
        });
      }

      failed++;
    }
  }

  // Stock Photos
  for (const photo of stockPhotos as Array<{ id: bigint; imageUrl: string }>) {
    processed++;

    try {
      const buffer = await fetchImageBuffer(photo.imageUrl, 15000);
      const sourceMetadata = await sharp(buffer).metadata();

      const sourceWidth = sourceMetadata.width ?? null;
      const sourceHeight = sourceMetadata.height ?? null;

      const thumbJpegBuffer = await sharp(buffer)
        .rotate()
        .resize(600, 600, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const thumb2xJpegBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 1200, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      if (dryRun) {
        updated++;
        continue;
      }

      const pathname = `stock-photos/thumbs/stock-photo-${photo.id.toString()}.jpg`;

      const pathname2x = `stock-photos/thumbs/stock-photo-${photo.id.toString()}-2x.jpg`;

      const thumbResult = await BlobService.uploadFile(thumbJpegBuffer, pathname, {
        access: 'public',
        addRandomSuffix: true,
        cacheControlMaxAge: 86400 * 365,
        contentType: 'image/jpeg',
      });

      const thumb2xResult = await BlobService.uploadFile(thumb2xJpegBuffer, pathname2x, {
        access: 'public',
        addRandomSuffix: true,
        cacheControlMaxAge: 86400 * 365,
        contentType: 'image/jpeg',
      });

      const thumbnailMeta = {
        format: 'jpeg',
        source: {
          width: sourceWidth,
          height: sourceHeight,
          format: sourceMetadata.format ?? null,
        },
        variants: [
          { dpr: 1, width: 600, height: 600, url: thumbResult.url },
          { dpr: 2, width: 1200, height: 1200, url: thumb2xResult.url },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).stockPhoto.update({
        where: { id: photo.id },
        data: {
          thumbnailUrl: thumbResult.url,
          thumbnailMeta: thumbnailMeta as unknown as object,
        },
      });

      updated++;
    } catch {
      if (!dryRun) {
        // Fallback to full image to avoid infinite retries
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).stockPhoto.update({
          where: { id: photo.id },
          data: { thumbnailUrl: photo.imageUrl },
        });
      }

      failed++;
    }
  }

  const newProgressCurrent = Math.min(
    (job.progressCurrent as number) + processed,
    job.progressTotal as number
  );

  const remainingCount = menus.length + stockPhotos.length;
  const isDone = remainingCount === 0;

  const updatedJob = await (prisma as any).maintenanceJob.update({
    where: { jobKey: JOB_KEY },
    data: {
      progressCurrent: newProgressCurrent,
      message: isDone
        ? 'Completed'
        : `Processed batch: ${processed} (updated: ${updated}, failed: ${failed})`,
      ...(isDone
        ? {
            status: 'COMPLETED',
            completedAt: new Date(),
            lastError: null,
          }
        : {}),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      job: serializeBigInt(updatedJob),
      batch: { processed, updated, failed },
    },
    statusCode: 200,
  });
}

async function postHandler(req: NextRequest, ctx: AuthContext) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;

    if (body.action === 'start') {
      return startHandler(req, ctx);
    }

    if (body.action === 'tick') {
      return tickHandler(req, ctx);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid action. Use { action: "start" } or { action: "tick" }',
        statusCode: 400,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Global thumbnail rebuild error:', error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).maintenanceJob
      .update({
        where: { jobKey: JOB_KEY },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed',
        },
      })
      .catch(() => null);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to rebuild thumbnails',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(getStatusHandler);
export const POST = withSuperAdmin(postHandler);
