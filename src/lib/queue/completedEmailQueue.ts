import { type Channel } from 'amqplib';

import { getRabbitChannel, publishJson } from '@/lib/queue/rabbitmq';

export const COMPLETED_EMAIL_EXCHANGE = 'genfity.completed_email';
export const COMPLETED_EMAIL_QUEUE = 'genfity.completed_email.send';
export const COMPLETED_EMAIL_DLQ = 'genfity.completed_email.dlq';
export const COMPLETED_EMAIL_ROUTING_KEY = 'send';
export const COMPLETED_EMAIL_DLX_ROUTING_KEY = 'dead';

export type CompletedEmailJob = {
  orderId: string;
  merchantId: string;
  customerEmail: string;
  orderNumber: string;
  completedEmailFee: number;
  locale?: string;

  createdAt: string;
  attempt: number;
};

export function computeRetryDelayMs(attempt: number): number {
  // Exponential backoff with cap (1m, 5m, 15m, 30m)
  const schedule = [60_000, 300_000, 900_000, 1_800_000];
  return schedule[Math.min(Math.max(attempt - 1, 0), schedule.length - 1)];
}

export async function ensureCompletedEmailTopology() {
  const channel = await getRabbitChannel();
  if (!channel) return null;

  await channel.assertExchange(COMPLETED_EMAIL_EXCHANGE, 'direct', { durable: true });

  // Dead-letter queue
  await channel.assertQueue(COMPLETED_EMAIL_DLQ, { durable: true });
  await channel.bindQueue(
    COMPLETED_EMAIL_DLQ,
    COMPLETED_EMAIL_EXCHANGE,
    COMPLETED_EMAIL_DLX_ROUTING_KEY,
  );

  // Main queue dead-letters to DLQ after we reject without requeue
  await channel.assertQueue(COMPLETED_EMAIL_QUEUE, {
    durable: true,
    deadLetterExchange: COMPLETED_EMAIL_EXCHANGE,
    deadLetterRoutingKey: COMPLETED_EMAIL_DLX_ROUTING_KEY,
  });
  await channel.bindQueue(
    COMPLETED_EMAIL_QUEUE,
    COMPLETED_EMAIL_EXCHANGE,
    COMPLETED_EMAIL_ROUTING_KEY,
  );

  return channel;
}

export async function enqueueCompletedEmail(job: Omit<CompletedEmailJob, 'createdAt' | 'attempt'>) {
  const channel = await ensureCompletedEmailTopology();
  if (!channel) return { ok: false as const, reason: 'disabled' as const };

  const message: CompletedEmailJob = {
    ...job,
    createdAt: new Date().toISOString(),
    attempt: 1,
  };

  const ok = publishJson(channel, COMPLETED_EMAIL_EXCHANGE, COMPLETED_EMAIL_ROUTING_KEY, message);
  return { ok: ok as boolean };
}

export async function enqueueCompletedEmailRetry(job: CompletedEmailJob) {
  const channel = await ensureCompletedEmailTopology();
  if (!channel) return { ok: false as const, reason: 'disabled' as const };
  return enqueueCompletedEmailRetryOnChannel(channel, job);
}

export async function enqueueCompletedEmailRetryOnChannel(channel: Channel, job: CompletedEmailJob) {
  const nextAttempt = job.attempt + 1;
  const delayMs = computeRetryDelayMs(nextAttempt);

  const message: CompletedEmailJob = {
    ...job,
    attempt: nextAttempt,
  };

  // Use per-message TTL + DLX to re-route back to main exchange/queue after delay.
  // This creates a delayed retry without requiring a RabbitMQ delayed-message plugin.
  const retryQueue = `${COMPLETED_EMAIL_QUEUE}.retry.${delayMs}`;

  await channel.assertQueue(retryQueue, {
    durable: true,
    messageTtl: delayMs,
    deadLetterExchange: COMPLETED_EMAIL_EXCHANGE,
    deadLetterRoutingKey: COMPLETED_EMAIL_ROUTING_KEY,
  });

  const ok = channel.sendToQueue(retryQueue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    contentType: 'application/json',
  });

  return { ok: ok as boolean, delayMs };
}
