import prisma from '@/lib/db/client';
import balanceService from '@/lib/services/BalanceService';
import emailService from '@/lib/services/EmailService';
import subscriptionService from '@/lib/services/SubscriptionService';
import {
  COMPLETED_EMAIL_QUEUE,
  type CompletedEmailJob,
  ensureCompletedEmailTopology,
  enqueueCompletedEmailRetryOnChannel,
} from '@/lib/queue/completedEmailQueue';
import { shouldSendCustomerEmail } from '@/lib/utils/emailGuards';

function redactEmailForLogs(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 1) return '***';
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}

const MAX_ATTEMPTS = 5;

class CompletedEmailQueueWorkerService {
  async runBatch(options?: { maxMessages?: number }) {
    const startedAt = new Date();
    const maxMessages = options?.maxMessages ?? 25;

    const channel = await ensureCompletedEmailTopology();
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
      const msg = await channel.get(COMPLETED_EMAIL_QUEUE, { noAck: false });
      if (!msg) break;

      processed++;

      try {
        const raw = msg.content.toString('utf8');
        const job = JSON.parse(raw) as CompletedEmailJob;

        const result = await this.processJob(job);

        if (result.action === 'ack') {
          channel.ack(msg);
          if (result.outcome === 'sent') sent++;
          else skipped++;
          continue;
        }

        if (result.action === 'retry') {
          // Schedule retry first; only ack when scheduled successfully.
          const retryResult = await enqueueCompletedEmailRetryOnChannel(channel, job);
          if (!retryResult.ok) {
            errors.push(`Retry schedule failed for orderId=${job.orderId}`);
            channel.nack(msg, false, true);
            continue;
          }

          retried++;
          channel.ack(msg);
          continue;
        }

        // dead
        dead++;
        channel.nack(msg, false, false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        channel.nack(msg, false, false);
      }
    }

    const completedAt = new Date();

    return {
      success: errors.length === 0,
      disabled: false,
      startedAt,
      completedAt,
      processed,
      sent,
      retried,
      dead,
      skipped,
      errors,
    };
  }

  private async processJob(
    job: CompletedEmailJob,
  ): Promise<
    | { action: 'ack'; outcome: 'sent' | 'skipped' }
    | { action: 'retry' }
    | { action: 'dead' }
  > {
    const orderId = BigInt(job.orderId);
    const merchantId = BigInt(job.merchantId);

    const alreadyCharged = await prisma.balanceTransaction.findFirst({
      where: {
        type: 'COMPLETED_ORDER_EMAIL_FEE',
        orderId,
      },
      select: { id: true },
    });

    if (alreadyCharged) {
      return { action: 'ack', outcome: 'skipped' };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        merchant: true,
        payment: true,
        orderItems: {
          include: {
            addons: true,
          },
        },
      },
    });

    if (!order) {
      return { action: 'ack', outcome: 'skipped' };
    }

    if (order.status !== 'COMPLETED') {
      return { action: 'ack', outcome: 'skipped' };
    }

    let completedEmailFee = job.completedEmailFee;
    if (typeof completedEmailFee !== 'number' || !Number.isFinite(completedEmailFee) || completedEmailFee <= 0) {
      const pricing = await subscriptionService.getPlanPricing(order.merchant?.currency || 'IDR');
      completedEmailFee = pricing.completedOrderEmailFee;
    }
    if (typeof completedEmailFee !== 'number' || !Number.isFinite(completedEmailFee) || completedEmailFee <= 0) {
      return { action: 'ack', outcome: 'skipped' };
    }

    const toEmail = job.customerEmail || order.customer?.email;
    if (!toEmail) return { action: 'ack', outcome: 'skipped' };
    if (!shouldSendCustomerEmail(toEmail)) return { action: 'ack', outcome: 'skipped' };

    const sent = await emailService.sendOrderCompleted({
      to: toEmail,
      customerName: order.customer?.name || 'Customer',
      orderNumber: order.orderNumber,
      merchantName: order.merchant?.name || 'Restaurant',
      merchantCode: order.merchant?.code || '',
      merchantLogoUrl: (order.merchant as any)?.logoUrl,
      merchantAddress: (order.merchant as any)?.address,
      merchantPhone: (order.merchant as any)?.phone,
      merchantEmail: (order.merchant as any)?.email,
      receiptSettings: (order.merchant as any)?.receiptSettings,
      merchantCountry: order.merchant?.country,
      merchantTimezone: order.merchant?.timezone,
      currency: order.merchant?.currency,
      orderType: order.orderType as 'DINE_IN' | 'TAKEAWAY',
      tableNumber: order.tableNumber,
      customerPhone: order.customer?.phone,
      customerEmail: order.customer?.email,
      items:
        order.orderItems?.map((item: any) => ({
          menuName: item.menuName,
          quantity: item.quantity,
          unitPrice: Number(item.menuPrice),
          subtotal: Number(item.subtotal),
          notes: item.notes,
          addons: (item.addons || []).map((addon: any) => ({
            addonName: addon.addonName,
            addonPrice: Number(addon.addonPrice),
            quantity: addon.quantity,
            subtotal: Number(addon.subtotal),
          })),
        })) || [],
      subtotal: Number((order as any).subtotal),
      taxAmount: Number((order as any).taxAmount || 0),
      serviceChargeAmount: Number((order as any).serviceChargeAmount || 0),
      packagingFeeAmount: Number((order as any).packagingFeeAmount || 0),
      discountAmount:
        typeof (order as any).discountAmount !== 'undefined' ? Number((order as any).discountAmount) : undefined,
      totalAmount: Number(order.totalAmount),
      paymentMethod: (order as any).payment?.paymentMethod || null,
      completedAt: order.completedAt || new Date(),
    });

    if (!sent) {
      console.error(
        `❌ [CompletedEmailQueue] EmailService returned false for order ${order.orderNumber} to ${redactEmailForLogs(toEmail)}`
      );

      if (job.attempt >= MAX_ATTEMPTS) return { action: 'dead' };
      return { action: 'retry' };
    }

    try {
      const charged = await balanceService.deductCompletedOrderEmailFee(
        merchantId,
        orderId,
        job.orderNumber || order.orderNumber,
        completedEmailFee,
        toEmail
      );

      if (!charged.success) {
        console.error(
          `❌ [CompletedEmailQueue] Email sent but charge failed: insufficient balance (order ${order.orderNumber})`
        );
      }
    } catch (err) {
      // Charging errors should not cause email retry (to avoid duplicate emails). Log and continue.
      console.error(`[CompletedEmailQueue] Charge failed for order ${order.orderNumber}:`, err);
    }

    console.log(
      `✅ [CompletedEmailQueue] Completed email sent for order ${order.orderNumber} to ${redactEmailForLogs(toEmail)}`
    );

    return { action: 'ack', outcome: 'sent' };
  }
}

const completedEmailQueueWorkerService = new CompletedEmailQueueWorkerService();
export default completedEmailQueueWorkerService;
