import emailService from '@/lib/services/EmailService';
import CustomerPushService from '@/lib/services/CustomerPushService';
import webPushService from '@/lib/services/WebPushService';
import prisma from '@/lib/db/client';
import {
  NOTIFICATION_JOBS_QUEUE,
  type NotificationJob,
  ensureNotificationJobsTopology,
  enqueueNotificationJobRetryOnChannel,
} from '@/lib/queue/notificationJobsQueue';

const MAX_ATTEMPTS = 5;

class NotificationJobsQueueWorkerService {
  async runBatch(options?: { maxMessages?: number }) {
    const startedAt = new Date();
    const maxMessages = options?.maxMessages ?? 50;

    const channel = await ensureNotificationJobsTopology();
    if (!channel) {
      return {
        success: true,
        disabled: true,
        startedAt,
        completedAt: new Date(),
        processed: 0,
        sent: 0,
        retried: 0,
        dead: 0,
        skipped: 0,
        errors: [] as string[],
      };
    }

    let processed = 0;
    let sent = 0;
    let retried = 0;
    let dead = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < maxMessages; i++) {
      const msg = await channel.get(NOTIFICATION_JOBS_QUEUE, { noAck: false });
      if (!msg) break;

      processed++;

      try {
        const raw = msg.content.toString('utf8');
        const job = JSON.parse(raw) as NotificationJob;

        const result = await this.processJob(job);

        if (result.action === 'ack') {
          channel.ack(msg);
          if (result.outcome === 'sent') sent++;
          else skipped++;
          continue;
        }

        if (result.action === 'retry') {
          const retryResult = await enqueueNotificationJobRetryOnChannel(channel, job);
          if (!retryResult.ok) {
            errors.push(`Retry schedule failed for kind=${job.kind}`);
            channel.nack(msg, false, true);
            continue;
          }

          retried++;
          channel.ack(msg);
          continue;
        }

        dead++;
        channel.nack(msg, false, false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        channel.nack(msg, false, false);
      }
    }

    return {
      success: errors.length === 0,
      disabled: false,
      startedAt,
      completedAt: new Date(),
      processed,
      sent,
      retried,
      dead,
      skipped,
      errors,
    };
  }

  private async processJob(
    job: NotificationJob,
  ): Promise<
    | { action: 'ack'; outcome: 'sent' | 'skipped' }
    | { action: 'retry' }
    | { action: 'dead' }
  > {
    switch (job.kind) {
      case 'email.password_reset_link': {
        const payload = job.payload as Extract<NotificationJob['payload'], { kind: 'email.password_reset_link' }>;
        await import('@/lib/utils/emailSender').then(({ sendPasswordResetEmail }) =>
          sendPasswordResetEmail({
            to: payload.to,
            resetUrl: payload.resetUrl,
            expiresAt: new Date(payload.expiresAt),
          })
        );
        return { action: 'ack', outcome: 'sent' };
      }

      case 'email.password_reset_otp': {
        const payload = job.payload as Extract<NotificationJob['payload'], { kind: 'email.password_reset_otp' }>;
        const ok = await emailService.sendPasswordResetOTP({
          to: payload.to,
          name: payload.name,
          code: payload.code,
          expiresInMinutes: payload.expiresInMinutes,
          locale: payload.locale,
        });

        if (!ok) {
          if (job.attempt >= MAX_ATTEMPTS) return { action: 'dead' };
          return { action: 'retry' };
        }

        return { action: 'ack', outcome: 'sent' };
      }

      case 'push.customer_order_status': {
        const payload = job.payload as Extract<NotificationJob['payload'], { kind: 'push.customer_order_status' }>;
        // This method is already internally guarded (no subs -> 0 sent)
        await CustomerPushService.notifyOrderStatusChange(
          payload.orderNumber,
          payload.status,
          payload.merchantName,
          payload.merchantCode,
          payload.customerId ? BigInt(payload.customerId) : null,
          payload.orderType,
        );
        return { action: 'ack', outcome: 'sent' };
      }

      case 'email.raw': {
        const payload = job.payload as Extract<NotificationJob['payload'], { kind: 'email.raw' }>;

        const existing = await prisma.notificationJobIdempotency.findUnique({
          where: { key: payload.idempotencyKey },
          select: { status: true },
        });

        if (existing?.status === 'SENT') {
          return { action: 'ack', outcome: 'skipped' };
        }

        const ok = await emailService.sendEmail({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          from: payload.from,
          attachments: payload.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.contentBase64, 'base64'),
            contentType: a.contentType,
          })),
          disableQueue: true,
        });

        if (!ok) {
          try {
            await prisma.notificationJobIdempotency.upsert({
              where: { key: payload.idempotencyKey },
              create: {
                key: payload.idempotencyKey,
                kind: job.kind,
                status: 'FAILED',
                attempts: 1,
                lastError: 'EmailService returned false',
              },
              update: {
                status: 'FAILED',
                attempts: { increment: 1 },
                lastError: 'EmailService returned false',
              },
            });
          } catch (err) {
            console.error('[NotificationJobsWorker] failed to update idempotency status (email.raw)', err);
          }

          if (job.attempt >= MAX_ATTEMPTS) return { action: 'dead' };
          return { action: 'retry' };
        }

        try {
          await prisma.notificationJobIdempotency.upsert({
            where: { key: payload.idempotencyKey },
            create: {
              key: payload.idempotencyKey,
              kind: job.kind,
              status: 'SENT',
              attempts: 1,
              sentAt: new Date(),
            },
            update: {
              status: 'SENT',
              attempts: { increment: 1 },
              sentAt: new Date(),
              lastError: null,
            },
          });
        } catch (err) {
          console.error('[NotificationJobsWorker] failed to update idempotency status (email.raw)', err);
          // Do not fail the job; email was already sent.
        }

        return { action: 'ack', outcome: 'sent' };
      }

      case 'push.webpush_raw': {
        const payload = job.payload as Extract<NotificationJob['payload'], { kind: 'push.webpush_raw' }>;

        const existing = await prisma.notificationJobIdempotency.findUnique({
          where: { key: payload.idempotencyKey },
          select: { status: true },
        });

        if (existing?.status === 'SENT') {
          return { action: 'ack', outcome: 'skipped' };
        }

        const result = await webPushService.sendPushNotificationDetailed(payload.subscription, payload.payload);

        if (!result.success) {
          // Best-effort cleanup for invalid endpoints (applies across both tables)
          if (result.statusCode === 404 || result.statusCode === 410) {
            try {
              await prisma.pushSubscription.updateMany({
                where: { endpoint: payload.subscription.endpoint },
                data: { isActive: false },
              });
            } catch (err) {
              console.error('[NotificationJobsWorker] failed to deactivate pushSubscription endpoint', err);
            }

            try {
              await prisma.customerPushSubscription.updateMany({
                where: { endpoint: payload.subscription.endpoint },
                data: { isActive: false },
              });
            } catch (err) {
              console.error('[NotificationJobsWorker] failed to deactivate customerPushSubscription endpoint', err);
            }
          }

          try {
            await prisma.notificationJobIdempotency.upsert({
              where: { key: payload.idempotencyKey },
              create: {
                key: payload.idempotencyKey,
                kind: job.kind,
                status: 'FAILED',
                attempts: 1,
                lastError: result.statusCode ? `WebPush failed status=${result.statusCode}` : 'WebPush failed',
              },
              update: {
                status: 'FAILED',
                attempts: { increment: 1 },
                lastError: result.statusCode ? `WebPush failed status=${result.statusCode}` : 'WebPush failed',
              },
            });
          } catch (err) {
            console.error('[NotificationJobsWorker] failed to update idempotency status (push.webpush_raw)', err);
          }

          if (job.attempt >= MAX_ATTEMPTS) return { action: 'dead' };
          return { action: 'retry' };
        }

        try {
          await prisma.notificationJobIdempotency.upsert({
            where: { key: payload.idempotencyKey },
            create: {
              key: payload.idempotencyKey,
              kind: job.kind,
              status: 'SENT',
              attempts: 1,
              sentAt: new Date(),
            },
            update: {
              status: 'SENT',
              attempts: { increment: 1 },
              sentAt: new Date(),
              lastError: null,
            },
          });
        } catch (err) {
          console.error('[NotificationJobsWorker] failed to update idempotency status (push.webpush_raw)', err);
          // Do not fail the job; push was already sent.
        }

        return { action: 'ack', outcome: 'sent' };
      }

      default: {
        return { action: 'ack', outcome: 'skipped' };
      }
    }
  }
}

const notificationJobsQueueWorkerService = new NotificationJobsQueueWorkerService();
export default notificationJobsQueueWorkerService;
