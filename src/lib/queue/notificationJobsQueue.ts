import { type Channel } from 'amqplib';

import { getRabbitChannel, publishJson } from '@/lib/queue/rabbitmq';

export const NOTIFICATION_JOBS_EXCHANGE = 'genfity.notification_jobs';
export const NOTIFICATION_JOBS_QUEUE = 'genfity.notification_jobs.process';
export const NOTIFICATION_JOBS_DLQ = 'genfity.notification_jobs.dlq';
export const NOTIFICATION_JOBS_ROUTING_KEY = 'process';
export const NOTIFICATION_JOBS_DLX_ROUTING_KEY = 'dead';

export type NotificationJobKind =
  | 'email.password_reset_link'
  | 'email.password_reset_otp'
  | 'email.raw'
  | 'push.customer_order_status'
  | 'push.webpush_raw';

export type NotificationJob = {
  kind: NotificationJobKind;
  payload:
    | {
        kind: 'email.password_reset_link';
        to: string;
        resetUrl: string;
        expiresAt: string;
      }
    | {
        kind: 'email.password_reset_otp';
        to: string;
        name: string;
        code: string;
        expiresInMinutes: number;
        locale: 'en' | 'id';
      }
    | {
        kind: 'email.raw';
        idempotencyKey: string;
        to: string;
        subject: string;
        html: string;
        from?: string;
        attachments?: Array<{
          filename: string;
          contentBase64: string;
          contentType?: string;
        }>;
      }
    | {
        kind: 'push.customer_order_status';
        orderNumber: string;
        status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
        merchantName: string;
        merchantCode: string;
        customerId: string | null;
        orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
      }
    | {
        kind: 'push.webpush_raw';
        idempotencyKey: string;
        subscription: {
          endpoint: string;
          keys: {
            p256dh: string;
            auth: string;
          };
        };
        payload: {
          title: string;
          body: string;
          icon?: string;
          badge?: string;
          tag?: string;
          data?: Record<string, unknown>;
          actions?: Array<{
            action: string;
            title: string;
            icon?: string;
          }>;
          requireInteraction?: boolean;
          vibrate?: number[];
        };
      };

  createdAt: string;
  attempt: number;
};

export function computeNotificationJobRetryDelayMs(attempt: number): number {
  // Exponential-ish backoff with cap
  const schedule = [15_000, 60_000, 300_000, 900_000, 1_800_000];
  return schedule[Math.min(Math.max(attempt - 1, 0), schedule.length - 1)];
}

export async function ensureNotificationJobsTopology() {
  const channel = await getRabbitChannel();
  if (!channel) return null;

  await channel.assertExchange(NOTIFICATION_JOBS_EXCHANGE, 'direct', { durable: true });

  await channel.assertQueue(NOTIFICATION_JOBS_DLQ, { durable: true });
  await channel.bindQueue(NOTIFICATION_JOBS_DLQ, NOTIFICATION_JOBS_EXCHANGE, NOTIFICATION_JOBS_DLX_ROUTING_KEY);

  await channel.assertQueue(NOTIFICATION_JOBS_QUEUE, {
    durable: true,
    deadLetterExchange: NOTIFICATION_JOBS_EXCHANGE,
    deadLetterRoutingKey: NOTIFICATION_JOBS_DLX_ROUTING_KEY,
  });
  await channel.bindQueue(NOTIFICATION_JOBS_QUEUE, NOTIFICATION_JOBS_EXCHANGE, NOTIFICATION_JOBS_ROUTING_KEY);

  return channel;
}

export async function enqueueNotificationJob(
  job: Omit<NotificationJob, 'createdAt' | 'attempt'>,
): Promise<{ ok: true } | { ok: false; reason: 'disabled' | 'publish_failed' }> {
  const channel = await ensureNotificationJobsTopology();
  if (!channel) return { ok: false, reason: 'disabled' };

  const message: NotificationJob = {
    ...job,
    createdAt: new Date().toISOString(),
    attempt: 1,
  };

  const ok = publishJson(channel, NOTIFICATION_JOBS_EXCHANGE, NOTIFICATION_JOBS_ROUTING_KEY, message);
  return ok ? { ok: true } : { ok: false, reason: 'publish_failed' };
}

export async function enqueueNotificationJobRetryOnChannel(channel: Channel, job: NotificationJob) {
  const nextAttempt = job.attempt + 1;
  const delayMs = computeNotificationJobRetryDelayMs(nextAttempt);

  const message: NotificationJob = {
    ...job,
    attempt: nextAttempt,
  };

  const retryQueue = `${NOTIFICATION_JOBS_QUEUE}.retry.${delayMs}`;

  await channel.assertQueue(retryQueue, {
    durable: true,
    messageTtl: delayMs,
    deadLetterExchange: NOTIFICATION_JOBS_EXCHANGE,
    deadLetterRoutingKey: NOTIFICATION_JOBS_ROUTING_KEY,
  });

  const ok = channel.sendToQueue(retryQueue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    contentType: 'application/json',
  });

  return { ok: ok as boolean, delayMs };
}
