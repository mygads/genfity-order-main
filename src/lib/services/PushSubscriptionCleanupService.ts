import prisma from '@/lib/db/client';

export interface PushSubscriptionCleanupOptions {
  inactiveDays?: number;
}

export interface PushSubscriptionCleanupResult {
  threshold: string;
  inactiveDays: number;
  adminDeleted: number;
  customerDeleted: number;
  totalDeleted: number;
}

class PushSubscriptionCleanupService {
  async cleanupInactive(options: PushSubscriptionCleanupOptions = {}): Promise<PushSubscriptionCleanupResult> {
    const inactiveDays = options.inactiveDays ?? 30;
    const thresholdDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    const [adminResult, customerResult] = await prisma.$transaction([
      prisma.pushSubscription.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: thresholdDate },
        },
      }),
      prisma.customerPushSubscription.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: thresholdDate },
        },
      }),
    ]);

    const adminDeleted = adminResult.count;
    const customerDeleted = customerResult.count;

    return {
      threshold: thresholdDate.toISOString(),
      inactiveDays,
      adminDeleted,
      customerDeleted,
      totalDeleted: adminDeleted + customerDeleted,
    };
  }
}

const pushSubscriptionCleanupService = new PushSubscriptionCleanupService();
export default pushSubscriptionCleanupService;
