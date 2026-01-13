/**
 * Global Thumbnail Rebuild Cron Worker
 *
 * POST /api/cron/thumbnails-rebuild
 * GET  /api/cron/thumbnails-rebuild (aliases POST for schedulers that only support GET)
 *
 * Protected by CRON_SECRET environment variable.
 *
 * This endpoint advances the global thumbnail rebuild job in the background so it
 * continues even if an admin closes the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalThumbnailMissingSummary,
  getGlobalThumbnailRebuildJob,
  startGlobalThumbnailRebuild,
  tickGlobalThumbnailRebuild,
} from '@/lib/services/GlobalThumbnailRebuildService';

const CRON_SECRET = process.env.CRON_SECRET;

function getProvidedSecret(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  return authHeader?.replace('Bearer ', '') || '';
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export async function POST(req: NextRequest) {
  try {
    if (!CRON_SECRET) {
      console.warn('CRON_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'SERVER_MISCONFIG', message: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    const providedSecret = getProvidedSecret(req);
    if (providedSecret !== CRON_SECRET) {
      console.warn('Cron API called with invalid secret');
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);

    const ticks = clampInt(url.searchParams.get('ticks'), 1, 1, 25);
    const onlyMissing = url.searchParams.get('onlyMissing') === '0' ? false : true;
    const dryRun = url.searchParams.get('dryRun') === '1';
    const forceStart = url.searchParams.get('forceStart') === '1';

    const summary = await getGlobalThumbnailMissingSummary();
    const jobBefore = await getGlobalThumbnailRebuildJob();

    // If there is nothing missing and no RUNNING job, we can exit early.
    if (summary.totalMissing === 0 && jobBefore?.status !== 'RUNNING') {
      return NextResponse.json({
        success: true,
        message: 'No missing thumbnails',
        data: {
          summary,
          job: jobBefore,
          ticksRequested: ticks,
          ticksExecuted: 0,
        },
      });
    }

    // Ensure the job exists and is running.
    const startResult = await startGlobalThumbnailRebuild({
      force: forceStart,
      onlyMissing,
      dryRun,
    });

    if (startResult.kind === 'ALREADY_COMPLETED' && !forceStart && jobBefore?.status !== 'RUNNING') {
      return NextResponse.json({
        success: true,
        message: 'Thumbnail rebuild already completed (use forceStart=1 to rerun)',
        data: {
          summary,
          startResult: {
            kind: startResult.kind,
            onlyMissing: startResult.onlyMissing,
            dryRun: startResult.dryRun,
          },
          jobBefore,
          jobAfter: jobBefore,
          ticksRequested: ticks,
          ticksExecuted: 0,
          tickBatches: [],
          isDone: true,
        },
      });
    }

    const tickBatches: Array<{ processed: number; updated: number; failed: number }> = [];
    let isDone = false;

    for (let i = 0; i < ticks; i++) {
      const tickResult = await tickGlobalThumbnailRebuild({
        onlyMissing,
        dryRun,
      });

      if (tickResult.kind === 'NOT_STARTED') {
        break;
      }

      if (tickResult.kind === 'NOT_RUNNING') {
        isDone = true;
        break;
      }

      tickBatches.push(tickResult.batch);
      if (tickResult.isDone) {
        isDone = true;
        break;
      }
    }

    const jobAfter = await getGlobalThumbnailRebuildJob();

    return NextResponse.json({
      success: true,
      message: 'Thumbnail rebuild worker ticked',
      data: {
        summary,
        startResult: {
          kind: startResult.kind,
          onlyMissing: startResult.onlyMissing,
          dryRun: startResult.dryRun,
          breakdown: 'breakdown' in startResult ? startResult.breakdown : undefined,
        },
        jobBefore,
        jobAfter,
        ticksRequested: ticks,
        ticksExecuted: tickBatches.length,
        tickBatches,
        isDone,
      },
    });
  } catch (error) {
    console.error('Thumbnail rebuild cron worker failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_FAILED',
        message: error instanceof Error ? error.message : 'Cron task failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
