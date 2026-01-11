/**
 * Push Subscription Cleanup Cron API
 * POST /api/cron/push-subscription-cleanup
 *
 * Deletes inactive web push subscriptions older than N days for:
 * - push_subscriptions
 * - customer_push_subscriptions
 *
 * Protected by CRON_SECRET environment variable.
 */

import { NextRequest, NextResponse } from 'next/server';
import pushSubscriptionCleanupService from '@/lib/services/PushSubscriptionCleanupService';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const inactiveDaysEnv = process.env.PUSH_SUBSCRIPTION_INACTIVE_RETENTION_DAYS;
    const inactiveDays = inactiveDaysEnv ? Number(inactiveDaysEnv) : 30;

    const result = await pushSubscriptionCleanupService.cleanupInactive({
      inactiveDays: Number.isFinite(inactiveDays) ? inactiveDays : 30,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Push subscription cleanup cron error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to clean push subscriptions' },
      { status: 500 }
    );
  }
}

// GET handler for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
