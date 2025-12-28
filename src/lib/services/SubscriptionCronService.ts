/**
 * Subscription Cron Service
 * Handles all scheduled subscription tasks:
 * - Auto-suspend expired trials/subscriptions
 * - Send trial ending warnings
 * - Send low balance warnings
 */

import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import notificationRepository from '@/lib/repositories/NotificationRepository';
import emailService from '@/lib/services/EmailService';
import userNotificationService from '@/lib/services/UserNotificationService';
import type { NotificationType } from '@prisma/client';

interface CronResult {
    task: string;
    success: boolean;
    count: number;
    details?: string[];
    errors?: string[];
}

interface CronJobSummary {
    startedAt: Date;
    completedAt: Date;
    results: CronResult[];
    totalProcessed: number;
    totalErrors: number;
}

class SubscriptionCronService {
    /**
     * Run all subscription cron tasks
     */
    async runAllTasks(): Promise<CronJobSummary> {
        const startedAt = new Date();
        const results: CronResult[] = [];

        // Task 1: Suspend expired trials
        results.push(await this.suspendExpiredTrials());

        // Task 2: Suspend expired monthly subscriptions
        results.push(await this.suspendExpiredMonthly());

        // Task 3: Suspend negative balance merchants (deposit mode)
        results.push(await this.suspendNegativeBalance());

        // Task 4: Send trial ending warnings (7, 3, 1 days)
        results.push(await this.sendTrialEndingWarnings());

        // Task 5: Send low balance warnings
        results.push(await this.sendLowBalanceWarnings());

        const completedAt = new Date();
        const totalProcessed = results.reduce((sum, r) => sum + r.count, 0);
        const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);

        return {
            startedAt,
            completedAt,
            results,
            totalProcessed,
            totalErrors,
        };
    }

    /**
     * Suspend expired trial subscriptions
     */
    async suspendExpiredTrials(): Promise<CronResult> {
        const details: string[] = [];
        const errors: string[] = [];

        try {
            const expiredTrials = await subscriptionRepository.getExpiredTrials();

            for (const sub of expiredTrials) {
                try {
                    await subscriptionRepository.suspendSubscription(
                        sub.merchantId,
                        'Trial period ended'
                    );

                    // Send suspension notification
                    if (sub.merchant.email) {
                        await this.sendSuspensionNotification(
                            sub.merchantId,
                            sub.merchant.email,
                            sub.merchant.name,
                            'TRIAL_EXPIRED',
                            'Trial period has ended'
                        );
                    }

                    details.push(`Suspended: ${sub.merchant.code} (${sub.merchant.name})`);
                } catch (err) {
                    errors.push(`Failed to suspend ${sub.merchant.code}: ${err}`);
                }
            }

            return {
                task: 'Suspend Expired Trials',
                success: errors.length === 0,
                count: expiredTrials.length,
                details,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (err) {
            return {
                task: 'Suspend Expired Trials',
                success: false,
                count: 0,
                errors: [`Task failed: ${err}`],
            };
        }
    }

    /**
     * Suspend expired monthly subscriptions
     */
    async suspendExpiredMonthly(): Promise<CronResult> {
        const details: string[] = [];
        const errors: string[] = [];

        try {
            const expiredMonthly = await subscriptionRepository.getExpiredMonthly();

            for (const sub of expiredMonthly) {
                try {
                    await subscriptionRepository.suspendSubscription(
                        sub.merchantId,
                        'Monthly subscription expired'
                    );

                    // Send suspension notification
                    if (sub.merchant.email) {
                        await this.sendSuspensionNotification(
                            sub.merchantId,
                            sub.merchant.email,
                            sub.merchant.name,
                            'MONTHLY_EXPIRED',
                            'Monthly subscription has expired'
                        );
                    }

                    details.push(`Suspended: ${sub.merchant.code} (${sub.merchant.name})`);
                } catch (err) {
                    errors.push(`Failed to suspend ${sub.merchant.code}: ${err}`);
                }
            }

            return {
                task: 'Suspend Expired Monthly',
                success: errors.length === 0,
                count: expiredMonthly.length,
                details,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (err) {
            return {
                task: 'Suspend Expired Monthly',
                success: false,
                count: 0,
                errors: [`Task failed: ${err}`],
            };
        }
    }

    /**
     * Suspend merchants with negative balance (deposit mode only)
     */
    async suspendNegativeBalance(): Promise<CronResult> {
        const details: string[] = [];
        const errors: string[] = [];

        try {
            const negativeBalanceMerchants = await subscriptionRepository.getNegativeBalanceMerchants();

            for (const item of negativeBalanceMerchants) {
                try {
                    await subscriptionRepository.suspendSubscription(
                        item.merchantId,
                        `Negative balance: ${item.currency === 'AUD' ? 'A$' : 'Rp'} ${Math.abs(item.balance).toLocaleString()}`
                    );

                    // Send suspension notification
                    if (item.email) {
                        await this.sendSuspensionNotification(
                            item.merchantId,
                            item.email,
                            item.name,
                            'NEGATIVE_BALANCE',
                            'Your balance is negative. Please top up to continue service.'
                        );
                    }

                    details.push(`Suspended: ${item.code} (Balance: ${item.balance})`);
                } catch (err) {
                    errors.push(`Failed to suspend ${item.code}: ${err}`);
                }
            }

            return {
                task: 'Suspend Negative Balance',
                success: errors.length === 0,
                count: negativeBalanceMerchants.length,
                details,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (err) {
            return {
                task: 'Suspend Negative Balance',
                success: false,
                count: 0,
                errors: [`Task failed: ${err}`],
            };
        }
    }

    /**
     * Send trial ending warning notifications
     */
    async sendTrialEndingWarnings(): Promise<CronResult> {
        const details: string[] = [];
        const errors: string[] = [];
        let count = 0;

        try {
            // Check for 7, 3, and 1 day warnings
            for (const days of [7, 3, 1]) {
                const merchants = await notificationRepository.getMerchantsNeedingTrialWarning(days);

                for (const item of merchants) {
                    try {
                        const success = await emailService.sendEmail({
                            to: item.merchant.email,
                            subject: `Masa Trial Berakhir dalam ${days} Hari - Genfity`,
                            html: this.getTrialEndingEmailHtml(
                                item.merchant.name,
                                days,
                                item.trialEndsAt!
                            ),
                        });

                        await notificationRepository.logNotification(
                            item.merchantId,
                            item.notificationType,
                            item.merchant.email,
                            success,
                            undefined,
                            { daysRemaining: days }
                        );

                        // Also send in-app notification
                        await userNotificationService.notifyTrialEnding(item.merchantId, days);

                        if (success) {
                            details.push(`${days}d warning sent to: ${item.merchant.code}`);
                            count++;
                        }
                    } catch (err) {
                        errors.push(`Failed to send warning to ${item.merchant.code}: ${err}`);
                    }
                }
            }

            return {
                task: 'Send Trial Ending Warnings',
                success: errors.length === 0,
                count,
                details,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (err) {
            return {
                task: 'Send Trial Ending Warnings',
                success: false,
                count: 0,
                errors: [`Task failed: ${err}`],
            };
        }
    }

    /**
     * Send low balance warning notifications
     */
    async sendLowBalanceWarnings(): Promise<CronResult> {
        const details: string[] = [];
        const errors: string[] = [];
        let count = 0;

        try {
            const merchants = await notificationRepository.getMerchantsWithLowBalance(10);

            for (const item of merchants) {
                try {
                    const success = await emailService.sendEmail({
                        to: item.merchantEmail,
                        subject: `Saldo Rendah - Segera Top Up - Genfity`,
                        html: this.getLowBalanceEmailHtml(
                            item.merchantName,
                            item.balance,
                            item.estimatedOrders
                        ),
                    });

                    await notificationRepository.logNotification(
                        item.merchantId,
                        'LOW_BALANCE',
                        item.merchantEmail,
                        success,
                        undefined,
                        { balance: item.balance, estimatedOrders: item.estimatedOrders }
                    );

                    // Also send in-app notification
                    await userNotificationService.notifyLowBalance(
                        item.merchantId,
                        item.balance,
                        item.estimatedOrders
                    );

                    if (success) {
                        details.push(`Low balance warning sent to: ${item.merchantCode}`);
                        count++;
                    }
                } catch (err) {
                    errors.push(`Failed to send to ${item.merchantCode}: ${err}`);
                }
            }

            return {
                task: 'Send Low Balance Warnings',
                success: errors.length === 0,
                count,
                details,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (err) {
            return {
                task: 'Send Low Balance Warnings',
                success: false,
                count: 0,
                errors: [`Task failed: ${err}`],
            };
        }
    }

    /**
     * Send suspension notification
     */
    private async sendSuspensionNotification(
        merchantId: bigint,
        email: string,
        name: string,
        type: NotificationType,
        reason: string
    ): Promise<void> {
        const success = await emailService.sendEmail({
            to: email,
            subject: `Langganan Ditangguhkan - Genfity`,
            html: this.getSuspensionEmailHtml(name, reason),
        });

        await notificationRepository.logNotification(
            merchantId,
            type,
            email,
            success,
            undefined,
            { reason }
        );
    }

    /**
     * Get trial ending email HTML
     */
    private getTrialEndingEmailHtml(
        merchantName: string,
        daysRemaining: number,
        trialEndsAt: Date
    ): string {
        const formattedDate = trialEndsAt.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const urgencyColor = daysRemaining <= 1 ? '#ef4444' : daysRemaining <= 3 ? '#f97316' : '#eab308';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, ${urgencyColor}, #f59e0b); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Masa Trial Hampir Berakhir</h1>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Halo <strong>${merchantName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Masa trial Anda akan berakhir dalam <strong style="color: ${urgencyColor};">${daysRemaining} hari</strong> pada tanggal <strong>${formattedDate}</strong>.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Untuk melanjutkan menggunakan layanan Genfity, silakan upgrade ke salah satu paket berbayar:
            </p>
            <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
                <li><strong>Mode Deposit</strong> - Deposit saldo, bayar per pesanan</li>
                <li><strong>Mode Bulanan</strong> - Langganan tetap per bulan</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription/topup" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Upgrade Sekarang
                </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.
            </p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get low balance email HTML
     */
    private getLowBalanceEmailHtml(
        merchantName: string,
        balance: number,
        estimatedOrders: number
    ): string {
        const formattedBalance = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(balance);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 Saldo Rendah</h1>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Halo <strong>${merchantName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Saldo deposit Anda saat ini adalah <strong style="color: #f97316;">${formattedBalance}</strong>, 
                yang hanya cukup untuk sekitar <strong>${estimatedOrders} pesanan</strong> lagi.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Segera lakukan top up untuk menghindari gangguan layanan. Jika saldo habis, toko Anda akan otomatis ditangguhkan.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription/topup" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Top Up Sekarang
                </a>
            </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get suspension email HTML
     */
    private getSuspensionEmailHtml(merchantName: string, reason: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Langganan Ditangguhkan</h1>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Halo <strong>${merchantName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Langganan Genfity Anda telah ditangguhkan karena: <strong style="color: #ef4444;">${reason}</strong>
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Selama ditangguhkan, toko Anda tidak akan dapat menerima pesanan. Untuk mengaktifkan kembali, silakan lakukan pembayaran.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription/topup" 
                   style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Aktifkan Kembali
                </a>
            </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
    }
}

const subscriptionCronService = new SubscriptionCronService();
export default subscriptionCronService;
