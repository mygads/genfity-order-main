/**
 * Influencer Commission Service
 * Business logic for calculating and crediting commissions to influencers
 * when merchants make payments (deposits or subscriptions)
 */

import prisma from '@/lib/db/client';
import emailService from '@/lib/services/EmailService';

interface CommissionResult {
  success: boolean;
  influencerId?: bigint;
  commissionAmount?: number;
  commissionRate?: number;
  isFirstPayment?: boolean;
  currency?: string;
  transactionId?: bigint;
  error?: string;
}

class InfluencerCommissionService {
  /**
   * Process commission for a verified payment
   * Called when super admin verifies a payment request
   */
  async processPaymentCommission(
    merchantId: bigint,
    paymentAmount: number,
    currency: string,
    paymentRequestId: bigint
  ): Promise<CommissionResult> {
    try {
      // 1. Check if merchant was referred by an influencer
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          code: true,
          referredByInfluencerId: true,
        },
      });

      if (!merchant?.referredByInfluencerId) {
        // Merchant not referred by any influencer
        return { success: true, error: 'Merchant has no referrer' };
      }

      // Get influencer details
      const influencer = await prisma.influencer.findUnique({
        where: { id: merchant.referredByInfluencerId },
        select: {
          id: true,
          name: true,
          email: true,
          isApproved: true,
          isActive: true,
        },
      });

      if (!influencer) {
        return { success: false, error: 'Influencer not found' };
      }

      // Only process for APPROVED and ACTIVE influencers
      if (!influencer.isApproved || !influencer.isActive) {
        return { success: false, error: 'Influencer is not approved or inactive' };
      }

      // 2. Check if this is the first payment from this merchant to this influencer
      const existingTransaction = await prisma.influencerTransaction.findFirst({
        where: {
          influencerId: influencer.id,
          merchantId: merchantId,
          type: {
            in: ['COMMISSION_FIRST', 'COMMISSION_RECURRING'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const isFirstPayment = !existingTransaction;

      // 3. Get commission rates from subscription plan
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        select: {
          influencerFirstCommissionPercent: true,
          influencerRecurringCommissionPercent: true,
        },
      });

      if (!plan) {
        return { success: false, error: 'No active subscription plan found' };
      }

      // 4. Calculate commission
      const commissionRate = isFirstPayment
        ? Number(plan.influencerFirstCommissionPercent)
        : Number(plan.influencerRecurringCommissionPercent);

      const commissionAmount = (paymentAmount * commissionRate) / 100;

      if (commissionAmount <= 0) {
        return { success: true, error: 'Commission amount is zero' };
      }

      // 5. Get or create influencer balance for this currency
      let balance = await prisma.influencerBalance.findFirst({
        where: {
          influencerId: influencer.id,
          currency: currency,
        },
      });

      if (!balance) {
        // Create balance for this currency
        balance = await prisma.influencerBalance.create({
          data: {
            influencerId: influencer.id,
            currency: currency,
            balance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
          },
        });
      }

      const balanceBefore = Number(balance.balance);
      const balanceAfter = balanceBefore + commissionAmount;

      // 6. Create transaction and update balance in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update balance
        await tx.influencerBalance.update({
          where: { id: balance.id },
          data: {
            balance: balanceAfter,
            totalEarned: { increment: commissionAmount },
          },
        });

        // Create transaction record
        const transaction = await tx.influencerTransaction.create({
          data: {
            influencerId: influencer.id,
            merchantId: merchantId,
            type: isFirstPayment ? 'COMMISSION_FIRST' : 'COMMISSION_RECURRING',
            currency: currency,
            amount: commissionAmount,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            description: `${isFirstPayment ? 'First' : 'Recurring'} commission from ${merchant.name} (${merchant.code})`,
            paymentRequestId: paymentRequestId,
            isFirstPayment: isFirstPayment,
            commissionRate: commissionRate,
          },
        });

        return transaction;
      });

      console.log(`✅ Influencer commission processed: ${currency} ${commissionAmount.toFixed(2)} to ${influencer.name} (${commissionRate}% ${isFirstPayment ? 'first' : 'recurring'})`);

      // Send email notification to influencer
      try {
        const formattedAmount = this.formatCurrency(commissionAmount, currency);
        const formattedBalance = this.formatCurrency(balanceAfter, currency);
        
        await emailService.sendEmail({
          to: influencer.email,
          subject: `💰 New Commission Received - ${formattedAmount}`,
          html: this.getCommissionEmailHtml(
            influencer.name,
            merchant.name,
            merchant.code,
            formattedAmount,
            commissionRate,
            isFirstPayment,
            formattedBalance
          ),
        });
        console.log(`📧 Commission notification email sent to ${influencer.email}`);
      } catch (emailError) {
        console.error('Failed to send commission notification email:', emailError);
        // Don't fail the commission if email fails
      }

      return {
        success: true,
        influencerId: influencer.id,
        commissionAmount: commissionAmount,
        commissionRate: commissionRate,
        isFirstPayment: isFirstPayment,
        currency: currency,
        transactionId: result.id,
      };
    } catch (error) {
      console.error('Failed to process influencer commission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get commission summary for a merchant
   * Shows total commissions earned by the referrer from this merchant
   */
  async getMerchantCommissionSummary(merchantId: bigint) {
    const transactions = await prisma.influencerTransaction.findMany({
      where: {
        merchantId: merchantId,
        type: {
          in: ['COMMISSION_FIRST', 'COMMISSION_RECURRING'],
        },
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const summary = {
      totalCommissionsPaid: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
      transactionCount: transactions.length,
      influencer: transactions[0]?.influencer || null,
      byCurrency: {} as Record<string, number>,
    };

    for (const t of transactions) {
      summary.byCurrency[t.currency] = (summary.byCurrency[t.currency] || 0) + Number(t.amount);
    }

    return summary;
  }

  /**
   * Recalculate commission (for adjustments)
   * Note: This is for future use if we need to adjust commissions
   */
  async createManualAdjustment(
    influencerId: bigint,
    currency: string,
    amount: number,
    description: string
  ) {
    const balance = await prisma.influencerBalance.findFirst({
      where: { influencerId, currency },
    });

    if (!balance) {
      throw new Error(`No ${currency} balance found for influencer`);
    }

    const balanceBefore = Number(balance.balance);
    const balanceAfter = balanceBefore + amount;

    if (balanceAfter < 0) {
      throw new Error('Adjustment would result in negative balance');
    }

    return prisma.$transaction(async (tx) => {
      await tx.influencerBalance.update({
        where: { id: balance.id },
        data: {
          balance: balanceAfter,
          totalEarned: amount > 0 ? { increment: amount } : undefined,
        },
      });

      return tx.influencerTransaction.create({
        data: {
          influencerId,
          type: 'ADJUSTMENT',
          currency,
          amount: Math.abs(amount),
          balanceBefore,
          balanceAfter,
          description,
        },
      });
    });
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(amount);
  }

  /**
   * Generate commission notification email HTML
   */
  private getCommissionEmailHtml(
    influencerName: string,
    merchantName: string,
    merchantCode: string,
    formattedAmount: string,
    commissionRate: number,
    isFirstPayment: boolean,
    formattedBalance: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 New Commission Received!</h1>
          </div>
          <div style="background: white; border-radius: 0 0 16px 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">
              Hi <strong>${influencerName}</strong>,
            </p>
            <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">
              Great news! You've earned a ${isFirstPayment ? '<strong style="color: #16a34a;">first-time</strong>' : 'recurring'} commission from your referral.
            </p>
            
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <div style="text-align: center;">
                <p style="color: #9a3412; font-size: 14px; margin: 0 0 8px 0;">Commission Amount</p>
                <p style="color: #c2410c; font-size: 32px; font-weight: bold; margin: 0;">${formattedAmount}</p>
                <p style="color: #9a3412; font-size: 12px; margin: 8px 0 0 0;">${commissionRate}% commission rate</p>
              </div>
            </div>
            
            <div style="background: #f1f5f9; border-radius: 12px; padding: 15px; margin: 20px 0;">
              <p style="color: #475569; font-size: 14px; margin: 0;">
                <strong>Merchant:</strong> ${merchantName} (${merchantCode})
              </p>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 15px; margin: 20px 0;">
              <p style="color: #065f46; font-size: 14px; margin: 0;">
                <strong>Your New Balance:</strong> ${formattedBalance}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://genfity.com'}/influencer/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Keep referring more merchants to earn more commissions!<br>
              Thank you for being our partner.
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} Genfity. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

const influencerCommissionService = new InfluencerCommissionService();
export default influencerCommissionService;
