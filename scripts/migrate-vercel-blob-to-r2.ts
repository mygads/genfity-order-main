import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';
import fs from 'fs';
import path from 'path';

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024);
const DRY_RUN = process.env.MIGRATION_DRY_RUN === 'true';
const LIMIT = Number(process.env.MIGRATION_LIMIT || 0);
const MAX_RETRIES = Number(process.env.MIGRATION_MAX_RETRIES || 3);
const REPORT_PATH = process.env.MIGRATION_REPORT_PATH || 'migration-report.csv';

const VERCEL_HOST_MATCH = /vercel-storage\.com/i;

type MigrationResult = {
  migrated: number;
  skipped: number;
  failed: number;
};

type MigrationReportRow = {
  entity: string;
  entityId: string;
  field: string;
  oldUrl: string;
  newUrl: string;
  status: 'migrated' | 'skipped' | 'failed';
  error: string;
};

class DownloadNotFoundError extends Error {
  url: string;
  status: number;

  constructor(url: string, status: number) {
    super(`Source not found (${status})`);
    this.url = url;
    this.status = status;
  }
}

function isDownloadNotFoundError(error: unknown): error is DownloadNotFoundError {
  return error instanceof DownloadNotFoundError;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function isVercelBlobUrl(url?: string | null) {
  return Boolean(url && VERCEL_HOST_MATCH.test(url));
}

function getExtensionFromContentType(contentType: string | null) {
  if (!contentType) return 'bin';
  const type = contentType.toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('bmp')) return 'bmp';
  if (type.includes('tiff')) return 'tiff';
  if (type.includes('heic')) return 'heic';
  if (type.includes('heif')) return 'heif';
  return 'bin';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const backoff = Math.min(1000 * 2 ** attempt, 8000);
      console.warn(`${label} failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}`);
      if (attempt < MAX_RETRIES - 1) {
        await delay(backoff);
      }
      attempt += 1;
    }
  }

  throw lastError || new Error(`${label} failed`);
}

async function downloadBuffer(url: string) {
  return withRetry(async () => {
    const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS);
    if (!response.ok) {
      if (response.status === 404) {
        throw new DownloadNotFoundError(url, response.status);
      }
      throw new Error(`Failed to download ${url} (${response.status})`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const lengthValue = contentLength ? Number(contentLength) : null;

    if (lengthValue && lengthValue > MAX_FILE_SIZE) {
      throw new Error(`File exceeds max size (${lengthValue} > ${MAX_FILE_SIZE})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File exceeds max size (${buffer.length} > ${MAX_FILE_SIZE})`);
    }

    return { buffer, contentType };
  }, `download ${url}`);
}

async function uploadBuffer(pathname: string, buffer: Buffer, contentType: string | null) {
  return withRetry(
    () =>
      BlobService.uploadFile(buffer, pathname, {
        access: 'public',
        addRandomSuffix: true,
        cacheControlMaxAge: 31536000,
        contentType: contentType || undefined,
      }),
    `upload ${pathname}`
  );
}

function writeCsvReport(rows: MigrationReportRow[]) {
  if (rows.length === 0) return;
  const reportFile = path.resolve(process.cwd(), REPORT_PATH);
  const header = 'entity,entityId,field,oldUrl,newUrl,status,error\n';
  const lines = rows
    .map((row) => {
      const safe = (value: string) => `"${value.replace(/"/g, '""')}"`;
      return [
        safe(row.entity),
        safe(row.entityId),
        safe(row.field),
        safe(row.oldUrl),
        safe(row.newUrl),
        safe(row.status),
        safe(row.error),
      ].join(',');
    })
    .join('\n');

  if (!fs.existsSync(reportFile)) {
    fs.writeFileSync(reportFile, header + lines + '\n');
  } else {
    fs.appendFileSync(reportFile, lines + '\n');
  }
}

async function migrateMerchantAssets(reportRows: MigrationReportRow[]): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  const merchants = await prisma.merchant.findMany({
    select: {
      id: true,
      code: true,
      logoUrl: true,
      bannerUrl: true,
      promoBannerUrls: true,
    },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  for (const merchant of merchants) {
    const updates: { logoUrl?: string; bannerUrl?: string; promoBannerUrls?: string[] } = {};

    try {
      if (isVercelBlobUrl(merchant.logoUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(merchant.logoUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `merchants/${merchant.code}/logos/logo-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.logoUrl = upload.url;
            reportRows.push({
              entity: 'merchant',
              entityId: merchant.id.toString(),
              field: 'logoUrl',
              oldUrl: merchant.logoUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'merchant',
              entityId: merchant.id.toString(),
              field: 'logoUrl',
              oldUrl: merchant.logoUrl || '',
              newUrl: merchant.logoUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (merchant.logoUrl) {
        reportRows.push({
          entity: 'merchant',
          entityId: merchant.id.toString(),
          field: 'logoUrl',
          oldUrl: merchant.logoUrl,
          newUrl: merchant.logoUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (isVercelBlobUrl(merchant.bannerUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(merchant.bannerUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `merchants/${merchant.code}/banners/banner-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.bannerUrl = upload.url;
            reportRows.push({
              entity: 'merchant',
              entityId: merchant.id.toString(),
              field: 'bannerUrl',
              oldUrl: merchant.bannerUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'merchant',
              entityId: merchant.id.toString(),
              field: 'bannerUrl',
              oldUrl: merchant.bannerUrl || '',
              newUrl: merchant.bannerUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (merchant.bannerUrl) {
        reportRows.push({
          entity: 'merchant',
          entityId: merchant.id.toString(),
          field: 'bannerUrl',
          oldUrl: merchant.bannerUrl,
          newUrl: merchant.bannerUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (Array.isArray(merchant.promoBannerUrls) && merchant.promoBannerUrls.length > 0) {
        const nextPromoUrls: string[] = [];
        for (const url of merchant.promoBannerUrls) {
          if (!isVercelBlobUrl(url)) {
            nextPromoUrls.push(url);
            reportRows.push({
              entity: 'merchant',
              entityId: merchant.id.toString(),
              field: 'promoBannerUrls',
              oldUrl: url,
              newUrl: url,
              status: 'skipped',
              error: 'Not a Vercel Blob URL',
            });
            continue;
          }
          try {
            const { buffer, contentType } = await downloadBuffer(url);
            const ext = getExtensionFromContentType(contentType);
            const pathname = `merchants/${merchant.code}/promos/promo-${Date.now()}.${ext}`;
            if (!DRY_RUN) {
              const upload = await uploadBuffer(pathname, buffer, contentType);
              nextPromoUrls.push(upload.url);
              reportRows.push({
                entity: 'merchant',
                entityId: merchant.id.toString(),
                field: 'promoBannerUrls',
                oldUrl: url,
                newUrl: upload.url,
                status: 'migrated',
                error: '',
              });
            } else {
              nextPromoUrls.push(url);
            }
            result.migrated += 1;
          } catch (error) {
            if (isDownloadNotFoundError(error)) {
              nextPromoUrls.push(url);
              reportRows.push({
                entity: 'merchant',
                entityId: merchant.id.toString(),
                field: 'promoBannerUrls',
                oldUrl: url,
                newUrl: url,
                status: 'skipped',
                error: error.message,
              });
              result.skipped += 1;
            } else {
              throw error;
            }
          }
        }
        if (!DRY_RUN) {
          updates.promoBannerUrls = nextPromoUrls;
        }
      }

      if (!DRY_RUN && Object.keys(updates).length > 0) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: updates,
        });
      } else if (DRY_RUN && Object.keys(updates).length === 0) {
        result.skipped += 1;
      }
    } catch (error) {
      console.error(`Merchant migration failed (${merchant.id.toString()}):`, error);
      reportRows.push({
        entity: 'merchant',
        entityId: merchant.id.toString(),
        field: 'unknown',
        oldUrl: '',
        newUrl: '',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      result.failed += 1;
    }
  }

  return result;
}

async function migrateMenuAssets(reportRows: MigrationReportRow[]): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  const menus = await prisma.menu.findMany({
    where: {
      OR: [
        { imageUrl: { contains: 'vercel-storage.com' } },
        { imageThumbUrl: { contains: 'vercel-storage.com' } },
      ],
    },
    select: {
      id: true,
      merchantId: true,
      merchant: { select: { code: true } },
      imageUrl: true,
      imageThumbUrl: true,
      imageThumbMeta: true,
    },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  for (const menu of menus) {
    if (!menu.merchant?.code) {
      reportRows.push({
        entity: 'menu',
        entityId: menu.id.toString(),
        field: 'imageUrl',
        oldUrl: menu.imageUrl || '',
        newUrl: '',
        status: 'skipped',
        error: 'Missing merchant code',
      });
      result.skipped += 1;
      continue;
    }

    const updates: { imageUrl?: string; imageThumbUrl?: string; imageThumbMeta?: object } = {};

    try {
      if (isVercelBlobUrl(menu.imageUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(menu.imageUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `merchants/${menu.merchant.code}/menus/menu-${menu.id.toString()}-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.imageUrl = upload.url;
            reportRows.push({
              entity: 'menu',
              entityId: menu.id.toString(),
              field: 'imageUrl',
              oldUrl: menu.imageUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'menu',
              entityId: menu.id.toString(),
              field: 'imageUrl',
              oldUrl: menu.imageUrl || '',
              newUrl: menu.imageUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (menu.imageUrl) {
        reportRows.push({
          entity: 'menu',
          entityId: menu.id.toString(),
          field: 'imageUrl',
          oldUrl: menu.imageUrl,
          newUrl: menu.imageUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (isVercelBlobUrl(menu.imageThumbUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(menu.imageThumbUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `merchants/${menu.merchant.code}/menus/menu-${menu.id.toString()}-thumb-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.imageThumbUrl = upload.url;
            if (menu.imageThumbMeta && typeof menu.imageThumbMeta === 'object') {
              const nextMeta = JSON.parse(JSON.stringify(menu.imageThumbMeta));
              if (Array.isArray(nextMeta.variants)) {
                nextMeta.variants = nextMeta.variants.map((variant: { url?: string }) => {
                  if (variant.url === menu.imageThumbUrl) {
                    return { ...variant, url: upload.url };
                  }
                  return variant;
                });
              }
              updates.imageThumbMeta = nextMeta;
            }
            reportRows.push({
              entity: 'menu',
              entityId: menu.id.toString(),
              field: 'imageThumbUrl',
              oldUrl: menu.imageThumbUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'menu',
              entityId: menu.id.toString(),
              field: 'imageThumbUrl',
              oldUrl: menu.imageThumbUrl || '',
              newUrl: menu.imageThumbUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (menu.imageThumbUrl) {
        reportRows.push({
          entity: 'menu',
          entityId: menu.id.toString(),
          field: 'imageThumbUrl',
          oldUrl: menu.imageThumbUrl,
          newUrl: menu.imageThumbUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (!DRY_RUN && Object.keys(updates).length > 0) {
        await prisma.menu.update({
          where: { id: menu.id },
          data: updates as Parameters<typeof prisma.menu.update>[0]['data'],
        });
      } else if (DRY_RUN && Object.keys(updates).length === 0) {
        result.skipped += 1;
      }
    } catch (error) {
      console.error(`Menu migration failed (${menu.id.toString()}):`, error);
      reportRows.push({
        entity: 'menu',
        entityId: menu.id.toString(),
        field: 'unknown',
        oldUrl: '',
        newUrl: '',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      result.failed += 1;
    }
  }

  return result;
}

async function migrateUserProfiles(reportRows: MigrationReportRow[]): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  const users = await prisma.user.findMany({
    where: { profilePictureUrl: { contains: 'vercel-storage.com' } },
    select: { id: true, profilePictureUrl: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  for (const user of users) {
    if (!user.profilePictureUrl) continue;
    try {
      const { buffer, contentType } = await downloadBuffer(user.profilePictureUrl);
      const ext = getExtensionFromContentType(contentType);
      const pathname = `avatars/user-${user.id.toString()}-${Date.now()}.${ext}`;
      if (!DRY_RUN) {
        const upload = await uploadBuffer(pathname, buffer, contentType);
        await prisma.user.update({
          where: { id: user.id },
          data: { profilePictureUrl: upload.url },
        });
        reportRows.push({
          entity: 'user',
          entityId: user.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: user.profilePictureUrl,
          newUrl: upload.url,
          status: 'migrated',
          error: '',
        });
      }
      result.migrated += 1;
    } catch (error) {
      if (isDownloadNotFoundError(error)) {
        reportRows.push({
          entity: 'user',
          entityId: user.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: user.profilePictureUrl || '',
          newUrl: user.profilePictureUrl || '',
          status: 'skipped',
          error: error.message,
        });
        result.skipped += 1;
      } else {
        console.error(`User migration failed (${user.id.toString()}):`, error);
        reportRows.push({
          entity: 'user',
          entityId: user.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: user.profilePictureUrl || '',
          newUrl: '',
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
        result.failed += 1;
      }
    }
  }

  return result;
}

async function migrateInfluencerProfiles(reportRows: MigrationReportRow[]): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  const influencers = await prisma.influencer.findMany({
    where: { profilePictureUrl: { contains: 'vercel-storage.com' } },
    select: { id: true, profilePictureUrl: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  for (const influencer of influencers) {
    if (!influencer.profilePictureUrl) continue;
    try {
      const { buffer, contentType } = await downloadBuffer(influencer.profilePictureUrl);
      const ext = getExtensionFromContentType(contentType);
      const pathname = `avatars/influencer-${influencer.id.toString()}-${Date.now()}.${ext}`;
      if (!DRY_RUN) {
        const upload = await uploadBuffer(pathname, buffer, contentType);
        await prisma.influencer.update({
          where: { id: influencer.id },
          data: { profilePictureUrl: upload.url },
        });
        reportRows.push({
          entity: 'influencer',
          entityId: influencer.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: influencer.profilePictureUrl,
          newUrl: upload.url,
          status: 'migrated',
          error: '',
        });
      }
      result.migrated += 1;
    } catch (error) {
      if (isDownloadNotFoundError(error)) {
        reportRows.push({
          entity: 'influencer',
          entityId: influencer.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: influencer.profilePictureUrl || '',
          newUrl: influencer.profilePictureUrl || '',
          status: 'skipped',
          error: error.message,
        });
        result.skipped += 1;
      } else {
        console.error(`Influencer migration failed (${influencer.id.toString()}):`, error);
        reportRows.push({
          entity: 'influencer',
          entityId: influencer.id.toString(),
          field: 'profilePictureUrl',
          oldUrl: influencer.profilePictureUrl || '',
          newUrl: '',
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
        result.failed += 1;
      }
    }
  }

  return result;
}

async function migrateStockPhotos(reportRows: MigrationReportRow[]): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  const stockPhotos = await (prisma as any).stockPhoto.findMany({
    where: {
      OR: [
        { imageUrl: { contains: 'vercel-storage.com' } },
        { thumbnailUrl: { contains: 'vercel-storage.com' } },
      ],
    },
    select: { id: true, imageUrl: true, thumbnailUrl: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  for (const photo of stockPhotos as Array<{ id: bigint; imageUrl?: string; thumbnailUrl?: string }>) {
    const updates: { imageUrl?: string; thumbnailUrl?: string } = {};
    try {
      if (isVercelBlobUrl(photo.imageUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(photo.imageUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `stock-photos/stock-photo-${photo.id.toString()}-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.imageUrl = upload.url;
            reportRows.push({
              entity: 'stock_photo',
              entityId: photo.id.toString(),
              field: 'imageUrl',
              oldUrl: photo.imageUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'stock_photo',
              entityId: photo.id.toString(),
              field: 'imageUrl',
              oldUrl: photo.imageUrl || '',
              newUrl: photo.imageUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (photo.imageUrl) {
        reportRows.push({
          entity: 'stock_photo',
          entityId: photo.id.toString(),
          field: 'imageUrl',
          oldUrl: photo.imageUrl,
          newUrl: photo.imageUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (isVercelBlobUrl(photo.thumbnailUrl)) {
        try {
          const { buffer, contentType } = await downloadBuffer(photo.thumbnailUrl as string);
          const ext = getExtensionFromContentType(contentType);
          const pathname = `stock-photos/thumbs/stock-photo-${photo.id.toString()}-${Date.now()}.${ext}`;
          if (!DRY_RUN) {
            const upload = await uploadBuffer(pathname, buffer, contentType);
            updates.thumbnailUrl = upload.url;
            reportRows.push({
              entity: 'stock_photo',
              entityId: photo.id.toString(),
              field: 'thumbnailUrl',
              oldUrl: photo.thumbnailUrl || '',
              newUrl: upload.url,
              status: 'migrated',
              error: '',
            });
          }
          result.migrated += 1;
        } catch (error) {
          if (isDownloadNotFoundError(error)) {
            reportRows.push({
              entity: 'stock_photo',
              entityId: photo.id.toString(),
              field: 'thumbnailUrl',
              oldUrl: photo.thumbnailUrl || '',
              newUrl: photo.thumbnailUrl || '',
              status: 'skipped',
              error: error.message,
            });
            result.skipped += 1;
          } else {
            throw error;
          }
        }
      } else if (photo.thumbnailUrl) {
        reportRows.push({
          entity: 'stock_photo',
          entityId: photo.id.toString(),
          field: 'thumbnailUrl',
          oldUrl: photo.thumbnailUrl,
          newUrl: photo.thumbnailUrl,
          status: 'skipped',
          error: 'Not a Vercel Blob URL',
        });
      }

      if (!DRY_RUN && Object.keys(updates).length > 0) {
        await (prisma as any).stockPhoto.update({
          where: { id: photo.id },
          data: updates,
        });
      } else if (DRY_RUN && Object.keys(updates).length === 0) {
        result.skipped += 1;
      }
    } catch (error) {
      console.error(`Stock photo migration failed (${photo.id.toString()}):`, error);
      reportRows.push({
        entity: 'stock_photo',
        entityId: photo.id.toString(),
        field: 'unknown',
        oldUrl: '',
        newUrl: '',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      result.failed += 1;
    }
  }

  return result;
}

async function run() {
  console.log('Starting Vercel Blob -> R2 migration');
  console.log(`Dry run: ${DRY_RUN}`);

  const reportRows: MigrationReportRow[] = [];

  const results = {
    merchants: await migrateMerchantAssets(reportRows),
    menus: await migrateMenuAssets(reportRows),
    users: await migrateUserProfiles(reportRows),
    influencers: await migrateInfluencerProfiles(reportRows),
    stockPhotos: await migrateStockPhotos(reportRows),
  };

  console.log('Migration summary:', results);
  writeCsvReport(reportRows);
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
