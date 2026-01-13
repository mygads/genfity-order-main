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
import {
  getGlobalThumbnailRebuildJob,
  GLOBAL_THUMBNAIL_REBUILD_JOB_KEY,
  startGlobalThumbnailRebuild,
  tickGlobalThumbnailRebuild,
} from '@/lib/services/GlobalThumbnailRebuildService';

type PostBody = {
  action: 'start' | 'tick';
  force?: boolean;
  batchSizeMenus?: number;
  batchSizeStockPhotos?: number;
  onlyMissing?: boolean;
  dryRun?: boolean;
};

async function getStatusHandler(_req: NextRequest, _ctx: AuthContext) {
  const job = await getGlobalThumbnailRebuildJob();

  return NextResponse.json({
    success: true,
    data: { job },
    statusCode: 200,
  });
}

async function startHandler(req: NextRequest, _ctx: AuthContext) {
  const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;

  const result = await startGlobalThumbnailRebuild({
    force: body.force === true,
    onlyMissing: body.onlyMissing,
    dryRun: body.dryRun === true,
  });

  if (result.kind === 'ALREADY_RUNNING') {
    return NextResponse.json(
      {
        success: false,
        error: 'ALREADY_RUNNING',
        message: 'Global thumbnail rebuild is already running',
        data: { job: result.job },
        statusCode: 409,
      },
      { status: 409 }
    );
  }

  if (result.kind === 'ALREADY_COMPLETED') {
    return NextResponse.json(
      {
        success: false,
        error: 'ALREADY_COMPLETED',
        message: 'Global thumbnail rebuild has already been completed',
        data: { job: result.job },
        statusCode: 409,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      job: result.job,
      breakdown: result.breakdown,
      onlyMissing: result.onlyMissing,
      dryRun: result.dryRun,
    },
    statusCode: 200,
  });
}

async function tickHandler(req: NextRequest, _ctx: AuthContext) {
  const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;

  const result = await tickGlobalThumbnailRebuild({
    onlyMissing: body.onlyMissing,
    dryRun: body.dryRun === true,
    batchSizeMenus: body.batchSizeMenus,
    batchSizeStockPhotos: body.batchSizeStockPhotos,
  });

  if (result.kind === 'NOT_STARTED') {
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

  if (result.kind === 'NOT_RUNNING') {
    return NextResponse.json({
      success: true,
      data: { job: result.job },
      statusCode: 200,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      job: result.job,
      batch: result.batch,
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

    // Mark as failed if job exists
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = await (prisma as any).maintenanceJob.findUnique({
        where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
      });

      if (job) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).maintenanceJob.update({
          where: { jobKey: GLOBAL_THUMBNAIL_REBUILD_JOB_KEY },
          data: {
            status: 'FAILED',
            lastError: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed',
          },
        });
      }
    } catch {
      // ignore
    }

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
