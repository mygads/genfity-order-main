import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { BlobService } from '@/lib/services/BlobService';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GLOBAL_THUMBNAIL_REBUILD_JOB_KEY = 'GLOBAL_THUMBNAIL_REBUILD_V1';

export type GlobalThumbnailRebuildOptions = {
  onlyMissing?: boolean;
  dryRun?: boolean;
  batchSizeMenus?: number;
  batchSizeStockPhotos?: number;
};

export type GlobalThumbnailRebuildSummary = {
  missingMenus: number;
  missingStockPhotos: number;
  totalMissing: number;
};

function clampBatchSize(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'number' ? value : fallback;
  return Math.min(Math.max(n, min), max);
}

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

function buildMenuWhere(onlyMissing: boolean): Prisma.MenuWhereInput {
  const menuWhere: Prisma.MenuWhereInput = {
    deletedAt: null,
    imageUrl: { not: null },
  };

  if (onlyMissing) {
    menuWhere.OR = [{ imageThumbUrl: null }, { imageThumbMeta: { equals: Prisma.DbNull } }];
  }

  return menuWhere;
}

function buildStockWhere(onlyMissing: boolean): Prisma.StockPhotoWhereInput {
  return {
    isActive: true,
    imageUrl: { not: '' },
    ...(onlyMissing ? { thumbnailUrl: null } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maintenanceJobModel() {
  return (prisma as any).maintenanceJob;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stockPhotoModel() {
  return (prisma as any).stockPhoto;
}

export async function getGlobalThumbnailRebuildJob() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await maintenanceJobModel().findUnique({
    where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
  });

  return job ? serializeBigInt(job) : null;
}

export async function getGlobalThumbnailMissingSummary(): Promise<GlobalThumbnailRebuildSummary> {
  const onlyMissing = true;
  const menuWhere = buildMenuWhere(onlyMissing);
  const stockWhere = buildStockWhere(onlyMissing);

  const [missingMenus, missingStockPhotos] = await Promise.all([
    prisma.menu.count({ where: menuWhere }),
    stockPhotoModel().count({ where: stockWhere }),
  ]);

  return {
    missingMenus,
    missingStockPhotos,
    totalMissing: missingMenus + missingStockPhotos,
  };
}

export async function startGlobalThumbnailRebuild(params?: {
  force?: boolean;
  onlyMissing?: boolean;
  dryRun?: boolean;
}) {
  const force = params?.force === true;
  const onlyMissing = params?.onlyMissing !== undefined ? Boolean(params.onlyMissing) : true;
  const dryRun = params?.dryRun === true;

  const existing = await maintenanceJobModel().findUnique({
    where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
  });

  if (existing?.status === 'RUNNING') {
    return {
      kind: 'ALREADY_RUNNING' as const,
      job: serializeBigInt(existing),
      onlyMissing,
      dryRun,
    };
  }

  if (existing?.status === 'COMPLETED' && !force) {
    return {
      kind: 'ALREADY_COMPLETED' as const,
      job: serializeBigInt(existing),
      onlyMissing,
      dryRun,
    };
  }

  const menuWhere = buildMenuWhere(onlyMissing);
  const stockWhere = buildStockWhere(onlyMissing);

  const [menuTotal, stockTotal] = await Promise.all([
    prisma.menu.count({ where: menuWhere }),
    stockPhotoModel().count({ where: stockWhere }),
  ]);

  const total = menuTotal + stockTotal;
  const now = new Date();

  const job = await maintenanceJobModel().upsert({
    where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
    create: {
      jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY,
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

  return {
    kind: 'STARTED' as const,
    job: serializeBigInt(job),
    breakdown: { menus: menuTotal, stockPhotos: stockTotal },
    onlyMissing,
    dryRun,
  };
}

export async function tickGlobalThumbnailRebuild(options?: GlobalThumbnailRebuildOptions) {
  const onlyMissing = options?.onlyMissing !== undefined ? Boolean(options.onlyMissing) : true;
  const dryRun = options?.dryRun === true;

  const batchSizeMenus = clampBatchSize(options?.batchSizeMenus, 20, 1, 200);
  const batchSizeStockPhotos = clampBatchSize(options?.batchSizeStockPhotos, 20, 1, 200);

  const job = await maintenanceJobModel().findUnique({
    where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
  });

  if (!job) {
    return {
      kind: 'NOT_STARTED' as const,
    };
  }

  if (job.status !== 'RUNNING') {
    return {
      kind: 'NOT_RUNNING' as const,
      job: serializeBigInt(job),
    };
  }

  const menuWhere = buildMenuWhere(onlyMissing);
  const stockWhere = buildStockWhere(onlyMissing);

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
    stockPhotoModel().findMany({
      where: stockWhere,
      select: { id: true, imageUrl: true },
      take: batchSizeStockPhotos,
      orderBy: { id: 'asc' },
    }),
  ]);

  let processed = 0;
  let updated = 0;
  let failed = 0;

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

      await stockPhotoModel().update({
        where: { id: photo.id },
        data: {
          thumbnailUrl: thumbResult.url,
          thumbnailMeta: thumbnailMeta as unknown as object,
        },
      });

      updated++;
    } catch {
      if (!dryRun) {
        await stockPhotoModel().update({
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

  const updatedJob = await maintenanceJobModel().update({
    where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
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

  return {
    kind: 'TICKED' as const,
    job: serializeBigInt(updatedJob),
    batch: { processed, updated, failed },
    isDone,
  };
}
