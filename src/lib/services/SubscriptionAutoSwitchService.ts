/**
 * Subscription Auto-Switch Service
 * Handles automatic switching of subscription modes based on various conditions
 * 
 * Auto-switch Rules:
 * 1. If TRIAL expired + has balance → switch to DEPOSIT
 * 2. If TRIAL expired + has MONTHLY subscription → switch to MONTHLY
 * 3. If MONTHLY expired + has balance → switch to DEPOSIT
 * 4. If DEPOSIT with zero balance + has active MONTHLY → switch to MONTHLY
 * 5. On payment verification: activate appropriate mode
 * 6. Auto-open store when subscription becomes active
 * 
 * Note: Manual switch between DEPOSIT/MONTHLY only allowed via UI button
 *       when both are available (balance > 0 AND monthly period active)
 */

import prisma from '@/lib/db/client';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import userNotificationService from '@/lib/services/UserNotificationService';

export interface SubscriptionCheckResult {
  merchantId: bigint;
  merchantCode: string;
  merchantName: string;
  previousType: string;
  previousStatus: string;
  newType: string;
  newStatus: string;
  action: 'NO_CHANGE' | 'AUTO_SWITCHED' | 'SUSPENDED' | 'REACTIVATED';
  reason: string;
  storeOpened: boolean;
}

// Default grace period (will be overridden by plan settings)
const DEFAULT_GRACE_PERIOD_DAYS = 3;
// Default monthly subscription days
const DEFAULT_MONTHLY_DAYS = 31;

class SubscriptionAutoSwitchService {
  /**
   * Get grace period days from subscription plan
   */
  private async getGracePeriodDays(): Promise<number> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      select: { gracePeriodDays: true },
    });
    return plan?.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  }

  /**
   * Get monthly subscription days from plan
   */
  async getMonthlyDays(): Promise<number> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      select: { monthlyDays: true },
    });
    return plan?.monthlyDays ?? DEFAULT_MONTHLY_DAYS;
  }

  /**
   * Check and auto-switch subscription for a merchant
   * Called on:
   * - Merchant owner/staff login
   * - Customer accessing store
   * - Admin dashboard access
   * - After payment verification
   */
  async checkAndAutoSwitch(merchantId: bigint): Promise<SubscriptionCheckResult> {
    const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
    const balanceRecord = await balanceRepository.getMerchantBalance(merchantId);
    
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, code: true, name: true, isOpen: true, isActive: true },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!subscription) {
      // No subscription at all - create trial
      await this.createTrialSubscription(merchantId);
      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: 'NONE',
        previousStatus: 'NONE',
        newType: 'TRIAL',
        newStatus: 'ACTIVE',
        action: 'AUTO_SWITCHED',
        reason: 'No subscription found, created trial',
        storeOpened: false,
      };
    }

    const balance = balanceRecord ? Number(balanceRecord.balance) : 0;

    // If already SUSPENDED or CANCELLED, check if we can reactivate
    if (subscription.status === 'SUSPENDED') {
      const reactivateResult = await this.tryReactivateSuspended(
        merchantId, 
        subscription, 
        balance, 
        merchant
      );
      if (reactivateResult) {
        return reactivateResult;
      }
    }

    // Check based on current subscription type
    switch (subscription.type) {
      case 'TRIAL':
        return await this.handleTrialSubscription(merchantId, subscription, balance, merchant);
      
      case 'MONTHLY':
        return await this.handleMonthlySubscription(merchantId, subscription, balance, merchant);
      
      case 'DEPOSIT':
        return await this.handleDepositSubscription(merchantId, subscription, balance, merchant);
      
      default:
        return this.noChangeResult(merchantId, merchant, subscription, 'Unknown subscription type');
    }
  }

  /**
   * Handle TRIAL subscription checks
   */
  private async handleTrialSubscription(
    merchantId: bigint,
    subscription: { type: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
    balance: number,
    merchant: { id: bigint; code: string; name: string; isOpen: boolean; isActive: boolean }
  ): Promise<SubscriptionCheckResult> {
    const now = new Date();
    const trialEndsAt = subscription.trialEndsAt;

    if (!trialEndsAt) {
      return this.noChangeResult(merchantId, merchant, subscription, 'Trial has no end date');
    }

    // Check if trial is expired (including grace period)
    const gracePeriodDays = await this.getGracePeriodDays();
    const graceEndDate = new Date(trialEndsAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
    const isExpired = now > graceEndDate;

    if (!isExpired) {
      // Trial still valid
      return this.noChangeResult(merchantId, merchant, subscription, 'Trial still valid');
    }

    // Trial expired - try to switch to available mode
    // Priority: MONTHLY first (if has active period), then DEPOSIT (if has balance)

    // Check if there's an active monthly period
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
      // Has active monthly - switch to MONTHLY
      await subscriptionRepository.updateMerchantSubscription(merchantId, {
        type: 'MONTHLY',
        status: 'ACTIVE',
        trialEndsAt: null,
        suspendedAt: null,
        suspendReason: null,
      });

      // Record history
      await subscriptionHistoryService.recordAutoSwitch(
        merchantId,
        'TRIAL',
        subscription.status,
        'MONTHLY',
        'ACTIVE',
        'Trial expired, switched to Monthly (has active period)',
        balance,
        subscription.currentPeriodEnd
      );

      // Send notification
      await this.sendAutoSwitchNotification(
        merchantId,
        merchant.name,
        'TRIAL',
        'MONTHLY',
        'Trial expired, switched to Monthly subscription'
      );

      // Auto-open store
      const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: 'TRIAL',
        previousStatus: subscription.status,
        newType: 'MONTHLY',
        newStatus: 'ACTIVE',
        action: 'AUTO_SWITCHED',
        reason: 'Trial expired, switched to Monthly (has active period)',
        storeOpened,
      };
    }

    // Check if has balance
    if (balance > 0) {
      // Has balance - switch to DEPOSIT
      await subscriptionRepository.upgradeToDeposit(merchantId);

      // Record history
      await subscriptionHistoryService.recordAutoSwitch(
        merchantId,
        'TRIAL',
        subscription.status,
        'DEPOSIT',
        'ACTIVE',
        'Trial expired, switched to Deposit (has balance)',
        balance,
        null
      );

      // Send notification
      await this.sendAutoSwitchNotification(
        merchantId,
        merchant.name,
        'TRIAL',
        'DEPOSIT',
        'Trial expired, switched to Deposit mode'
      );

      // Auto-open store
      const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: 'TRIAL',
        previousStatus: subscription.status,
        newType: 'DEPOSIT',
        newStatus: 'ACTIVE',
        action: 'AUTO_SWITCHED',
        reason: 'Trial expired, switched to Deposit (has balance)',
        storeOpened,
      };
    }

    // No fallback available - suspend subscription
    await subscriptionRepository.suspendSubscription(merchantId, 'Trial expired - no payment method available');

    // Record history
    await subscriptionHistoryService.recordSuspension(
      merchantId,
      'TRIAL',
      'Trial expired with no balance or monthly subscription',
      balance
    );

    // Record trial expired event
    await subscriptionHistoryService.recordTrialExpired(
      merchantId,
      'Trial period ended with no payment method'
    );

    // Send suspension notification
    await this.sendSuspensionNotification(
      merchantId,
      merchant.name,
      'Trial expired with no balance or monthly subscription'
    );

    return {
      merchantId,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      previousType: 'TRIAL',
      previousStatus: subscription.status,
      newType: 'TRIAL',
      newStatus: 'SUSPENDED',
      action: 'SUSPENDED',
      reason: 'Trial expired with no balance or monthly subscription',
      storeOpened: false,
    };
  }

  /**
   * Handle MONTHLY subscription checks
   */
  private async handleMonthlySubscription(
    merchantId: bigint,
    subscription: { type: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
    balance: number,
    merchant: { id: bigint; code: string; name: string; isOpen: boolean; isActive: boolean }
  ): Promise<SubscriptionCheckResult> {
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd;

    if (!periodEnd) {
      return this.noChangeResult(merchantId, merchant, subscription, 'Monthly has no period end');
    }

    // Check if monthly is expired (including grace period)
    const gracePeriodDays = await this.getGracePeriodDays();
    const graceEndDate = new Date(periodEnd.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
    const isExpired = now > graceEndDate;

    if (!isExpired) {
      // Monthly still valid
      return this.noChangeResult(merchantId, merchant, subscription, 'Monthly subscription still valid');
    }

    // Monthly expired - check if has balance to fallback to DEPOSIT
    if (balance > 0) {
      // Has balance - switch to DEPOSIT
      await subscriptionRepository.upgradeToDeposit(merchantId);

      // Record history
      await subscriptionHistoryService.recordAutoSwitch(
        merchantId,
        'MONTHLY',
        subscription.status,
        'DEPOSIT',
        'ACTIVE',
        'Monthly expired, switched to Deposit (has balance)',
        balance,
        null
      );

      // Send notification
      await this.sendAutoSwitchNotification(
        merchantId,
        merchant.name,
        'MONTHLY',
        'DEPOSIT',
        'Monthly subscription expired, switched to Deposit mode'
      );

      // Auto-open store
      const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: 'MONTHLY',
        previousStatus: subscription.status,
        newType: 'DEPOSIT',
        newStatus: 'ACTIVE',
        action: 'AUTO_SWITCHED',
        reason: 'Monthly expired, switched to Deposit (has balance)',
        storeOpened,
      };
    }

    // No balance - suspend subscription
    await subscriptionRepository.suspendSubscription(merchantId, 'Monthly subscription expired - insufficient balance');

    // Record history
    await subscriptionHistoryService.recordSuspension(
      merchantId,
      'MONTHLY',
      'Monthly subscription expired with no balance',
      balance
    );

    // Send suspension notification
    await this.sendSuspensionNotification(
      merchantId,
      merchant.name,
      'Monthly subscription expired with no balance'
    );

    return {
      merchantId,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      previousType: 'MONTHLY',
      previousStatus: subscription.status,
      newType: 'MONTHLY',
      newStatus: 'SUSPENDED',
      action: 'SUSPENDED',
      reason: 'Monthly expired with no balance',
      storeOpened: false,
    };
  }

  /**
   * Handle DEPOSIT subscription checks
   */
  private async handleDepositSubscription(
    merchantId: bigint,
    subscription: { type: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
    balance: number,
    merchant: { id: bigint; code: string; name: string; isOpen: boolean; isActive: boolean }
  ): Promise<SubscriptionCheckResult> {
    const now = new Date();

    // Check if balance is zero or negative
    if (balance <= 0) {
      // Check if has active monthly to fallback
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
        // Has active monthly - switch to MONTHLY
        await subscriptionRepository.updateMerchantSubscription(merchantId, {
          type: 'MONTHLY',
          status: 'ACTIVE',
          suspendedAt: null,
          suspendReason: null,
        });

        // Record history
        await subscriptionHistoryService.recordAutoSwitch(
          merchantId,
          'DEPOSIT',
          subscription.status,
          'MONTHLY',
          'ACTIVE',
          'Deposit balance exhausted, switched to Monthly (has active period)',
          balance,
          subscription.currentPeriodEnd
        );

        // Send notification
        await this.sendAutoSwitchNotification(
          merchantId,
          merchant.name,
          'DEPOSIT',
          'MONTHLY',
          'Deposit balance exhausted, switched to Monthly subscription'
        );

        // Auto-open store
        const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

        return {
          merchantId,
          merchantCode: merchant.code,
          merchantName: merchant.name,
          previousType: 'DEPOSIT',
          previousStatus: subscription.status,
          newType: 'MONTHLY',
          newStatus: 'ACTIVE',
          action: 'AUTO_SWITCHED',
          reason: 'Deposit balance exhausted, switched to Monthly (has active period)',
          storeOpened,
        };
      }

      // No monthly fallback - suspend
      await subscriptionRepository.suspendSubscription(merchantId, 'Deposit balance exhausted');

      // Record history
      await subscriptionHistoryService.recordSuspension(
        merchantId,
        'DEPOSIT',
        'Deposit balance exhausted with no monthly subscription',
        balance
      );

      // Send suspension notification
      await this.sendSuspensionNotification(
        merchantId,
        merchant.name,
        'Deposit balance exhausted with no active monthly subscription'
      );

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: 'DEPOSIT',
        previousStatus: subscription.status,
        newType: 'DEPOSIT',
        newStatus: 'SUSPENDED',
        action: 'SUSPENDED',
        reason: 'Deposit balance exhausted with no monthly subscription',
        storeOpened: false,
      };
    }

    // Balance is positive - subscription is valid
    return this.noChangeResult(merchantId, merchant, subscription, 'Deposit balance available');
  }

  /**
   * Try to reactivate a suspended subscription
   */
  private async tryReactivateSuspended(
    merchantId: bigint,
    subscription: { type: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
    balance: number,
    merchant: { id: bigint; code: string; name: string; isOpen: boolean; isActive: boolean }
  ): Promise<SubscriptionCheckResult | null> {
    const now = new Date();

    // Check if has active monthly period
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
      // Reactivate as MONTHLY
      await subscriptionRepository.updateMerchantSubscription(merchantId, {
        type: 'MONTHLY',
        status: 'ACTIVE',
        suspendedAt: null,
        suspendReason: null,
      });

      // Record history
      await subscriptionHistoryService.recordReactivation(
        merchantId,
        subscription.type,
        'MONTHLY',
        'Reactivated as Monthly (has active period)',
        balance,
        subscription.currentPeriodEnd
      );

      // Send reactivation notification
      await this.sendReactivationNotification(
        merchantId,
        merchant.name,
        'MONTHLY',
        'Subscription reactivated with Monthly mode'
      );

      const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: subscription.type,
        previousStatus: 'SUSPENDED',
        newType: 'MONTHLY',
        newStatus: 'ACTIVE',
        action: 'REACTIVATED',
        reason: 'Reactivated as Monthly (has active period)',
        storeOpened,
      };
    }

    // Check if has balance
    if (balance > 0) {
      // Reactivate as DEPOSIT
      await subscriptionRepository.upgradeToDeposit(merchantId);

      // Record history
      await subscriptionHistoryService.recordReactivation(
        merchantId,
        subscription.type,
        'DEPOSIT',
        'Reactivated as Deposit (has balance)',
        balance,
        null
      );

      // Send reactivation notification
      await this.sendReactivationNotification(
        merchantId,
        merchant.name,
        'DEPOSIT',
        'Subscription reactivated with Deposit mode'
      );

      const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

      return {
        merchantId,
        merchantCode: merchant.code,
        merchantName: merchant.name,
        previousType: subscription.type,
        previousStatus: 'SUSPENDED',
        newType: 'DEPOSIT',
        newStatus: 'ACTIVE',
        action: 'REACTIVATED',
        reason: 'Reactivated as Deposit (has balance)',
        storeOpened,
      };
    }

    // Cannot reactivate
    return null;
  }

  /**
   * Handle payment verification - auto-switch and activate
   * Called after admin verifies a payment
   * 
   * NOTE: Balance addition and subscription period extension are ALREADY DONE
   * by PaymentRequestService before calling this method.
   * This method only handles:
   * - Mode switching (TRIAL/DEPOSIT/MONTHLY)
   * - Reactivating suspended subscriptions
   * - Auto-opening the store
   */
  async handlePaymentVerified(
    merchantId: bigint,
    paymentType: 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
    _amount: number,
    _months?: number
  ): Promise<SubscriptionCheckResult> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, code: true, name: true, isOpen: true, isActive: true },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
    const balanceRecord = await balanceRepository.getMerchantBalance(merchantId);
    const balance = balanceRecord ? Number(balanceRecord.balance) : 0;

    const previousType = subscription?.type || 'NONE';
    const previousStatus = subscription?.status || 'NONE';

    // Determine what mode to switch to
    let newType: 'DEPOSIT' | 'MONTHLY';
    let switchReason: string;

    if (paymentType === 'DEPOSIT_TOPUP') {
      // For deposit top-up:
      // - If currently on TRIAL or SUSPENDED, switch to DEPOSIT
      // - If currently on MONTHLY (active), stay on MONTHLY (balance is backup)
      // - If currently on DEPOSIT, stay on DEPOSIT
      
      if (!subscription || subscription.type === 'TRIAL' || subscription.status === 'SUSPENDED') {
        newType = 'DEPOSIT';
        switchReason = 'Deposit top-up verified, activated Deposit mode';
        
        await subscriptionRepository.updateMerchantSubscription(merchantId, {
          type: 'DEPOSIT',
          status: 'ACTIVE',
          trialEndsAt: null,
          suspendedAt: null,
          suspendReason: null,
        });
      } else if (subscription.type === 'MONTHLY' && subscription.status === 'ACTIVE') {
        // Keep monthly, balance is just backup
        newType = 'MONTHLY';
        switchReason = 'Deposit top-up verified, staying on Monthly (balance is backup)';
      } else {
        // Currently on DEPOSIT, just reactivate if needed
        newType = 'DEPOSIT';
        switchReason = 'Deposit top-up verified, reactivated Deposit mode';
        
        await subscriptionRepository.updateMerchantSubscription(merchantId, {
          status: 'ACTIVE',
          suspendedAt: null,
          suspendReason: null,
        });
      }
    } else {
      // For monthly subscription:
      // - If currently on TRIAL or SUSPENDED, switch to MONTHLY
      // - If currently on DEPOSIT (active with balance), stay on DEPOSIT (monthly is backup)
      // - If currently on MONTHLY, just ensure it's active
      
      // NOTE: Period extension is already done by PaymentRequestService
      // Here we only handle mode switching
      
      if (!subscription || subscription.type === 'TRIAL' || subscription.status === 'SUSPENDED') {
        newType = 'MONTHLY';
        switchReason = 'Monthly subscription verified, activated Monthly mode';
        
        // Just switch type and activate, period is already set
        await subscriptionRepository.updateMerchantSubscription(merchantId, {
          type: 'MONTHLY',
          status: 'ACTIVE',
          trialEndsAt: null,
          suspendedAt: null,
          suspendReason: null,
        });
      } else if (subscription.type === 'DEPOSIT' && subscription.status === 'ACTIVE' && balance > 0) {
        // Keep deposit, monthly period is backup
        // Period is already extended by PaymentRequestService
        newType = 'DEPOSIT';
        switchReason = 'Monthly subscription verified, staying on Deposit (monthly is backup)';
      } else {
        // Switch to monthly or ensure monthly is active
        // Period is already set by PaymentRequestService
        newType = 'MONTHLY';
        switchReason = 'Monthly subscription verified, activated Monthly mode';
        
        await subscriptionRepository.updateMerchantSubscription(merchantId, {
          type: 'MONTHLY',
          status: 'ACTIVE',
          suspendedAt: null,
          suspendReason: null,
        });
      }
    }

    // Auto-open store after payment verification
    const storeOpened = await this.autoOpenStore(merchantId, merchant.isOpen);

    return {
      merchantId,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      previousType,
      previousStatus,
      newType,
      newStatus: 'ACTIVE',
      action: previousType === newType && previousStatus === 'ACTIVE' ? 'NO_CHANGE' : 'AUTO_SWITCHED',
      reason: switchReason,
      storeOpened,
    };
  }

  /**
   * Manual switch between DEPOSIT and MONTHLY
   * Only allowed when both are available
   */
  async manualSwitch(merchantId: bigint, targetType: 'DEPOSIT' | 'MONTHLY'): Promise<SubscriptionCheckResult> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, code: true, name: true, isOpen: true, isActive: true },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
    const balanceRecord = await balanceRepository.getMerchantBalance(merchantId);
    const balance = balanceRecord ? Number(balanceRecord.balance) : 0;
    const now = new Date();

    if (!subscription) {
      throw new Error('No subscription found');
    }

    const previousType = subscription.type;
    const previousStatus = subscription.status;

    // Validate switch is allowed
    if (targetType === 'DEPOSIT') {
      if (balance <= 0) {
        throw new Error('Cannot switch to Deposit mode: insufficient balance');
      }
    } else if (targetType === 'MONTHLY') {
      if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now) {
        throw new Error('Cannot switch to Monthly mode: no active monthly subscription');
      }
    }

    // Perform switch
    await subscriptionRepository.updateMerchantSubscription(merchantId, {
      type: targetType,
      status: 'ACTIVE',
      suspendedAt: null,
      suspendReason: null,
    });

    return {
      merchantId,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      previousType,
      previousStatus,
      newType: targetType,
      newStatus: 'ACTIVE',
      action: 'AUTO_SWITCHED',
      reason: `Manually switched to ${targetType} mode`,
      storeOpened: false,
    };
  }

  /**
   * Check if manual switch is available
   */
  async canManualSwitch(merchantId: bigint): Promise<{
    canSwitchToDeposit: boolean;
    canSwitchToMonthly: boolean;
    currentType: string;
    hasActiveMonthly: boolean;
    hasPositiveBalance: boolean;
    balance: number;
    monthlyEndsAt: Date | null;
  }> {
    const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
    const balanceRecord = await balanceRepository.getMerchantBalance(merchantId);
    const balance = balanceRecord ? Number(balanceRecord.balance) : 0;
    const now = new Date();

    const hasActiveMonthly = !!(subscription?.currentPeriodEnd && subscription.currentPeriodEnd > now);
    const hasPositiveBalance = balance > 0;

    return {
      canSwitchToDeposit: hasPositiveBalance && subscription?.type !== 'DEPOSIT',
      canSwitchToMonthly: hasActiveMonthly && subscription?.type !== 'MONTHLY',
      currentType: subscription?.type || 'NONE',
      hasActiveMonthly,
      hasPositiveBalance,
      balance,
      monthlyEndsAt: subscription?.currentPeriodEnd || null,
    };
  }

  /**
   * Auto-open store when subscription becomes active
   */
  private async autoOpenStore(merchantId: bigint, currentlyOpen: boolean): Promise<boolean> {
    if (currentlyOpen) {
      return false; // Already open
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: { isOpen: true },
    });

    console.log(`🏪 Auto-opened store for merchant ${merchantId}`);
    return true;
  }

  /**
   * Create trial subscription for merchant
   */
  private async createTrialSubscription(merchantId: bigint): Promise<void> {
    const { default: subscriptionService } = await import('@/lib/services/SubscriptionService');
    await subscriptionService.createTrialSubscription(merchantId);
  }

  /**
   * Helper to create no-change result
   */
  private noChangeResult(
    merchantId: bigint,
    merchant: { code: string; name: string },
    subscription: { type: string; status: string },
    reason: string
  ): SubscriptionCheckResult {
    return {
      merchantId,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      previousType: subscription.type,
      previousStatus: subscription.status,
      newType: subscription.type,
      newStatus: subscription.status,
      action: 'NO_CHANGE',
      reason,
      storeOpened: false,
    };
  }

  /**
   * Send auto-switch notification to merchant
   */
  private async sendAutoSwitchNotification(
    merchantId: bigint,
    merchantName: string,
    fromType: string,
    toType: string,
    reason: string
  ): Promise<void> {
    try {
      await userNotificationService.createForMerchant(
        merchantId,
        'SUBSCRIPTION',
        `Subscription Auto-Switched`,
        `Your subscription has been automatically switched from ${fromType} to ${toType} mode. ${reason}`,
        {
          metadata: { fromType, toType, reason },
          actionUrl: '/admin/dashboard/subscription',
        }
      );
    } catch (error) {
      console.error('Failed to send auto-switch notification:', error);
    }
  }

  /**
   * Send suspension notification to merchant
   */
  private async sendSuspensionNotification(
    merchantId: bigint,
    merchantName: string,
    reason: string
  ): Promise<void> {
    try {
      await userNotificationService.createForMerchant(
        merchantId,
        'SUBSCRIPTION',
        `Subscription Suspended`,
        `Your subscription has been suspended. ${reason}. Please top up your balance or renew your subscription to continue.`,
        {
          metadata: { reason },
          actionUrl: '/admin/dashboard/subscription/topup',
        }
      );
    } catch (error) {
      console.error('Failed to send suspension notification:', error);
    }
  }

  /**
   * Send reactivation notification to merchant
   */
  private async sendReactivationNotification(
    merchantId: bigint,
    merchantName: string,
    newType: string,
    reason: string
  ): Promise<void> {
    try {
      await userNotificationService.createForMerchant(
        merchantId,
        'SUBSCRIPTION',
        `Subscription Reactivated`,
        `Your subscription has been reactivated with ${newType} mode. ${reason}`,
        {
          metadata: { newType, reason },
          actionUrl: '/admin/dashboard/subscription',
        }
      );
    } catch (error) {
      console.error('Failed to send reactivation notification:', error);
    }
  }
}

const subscriptionAutoSwitchService = new SubscriptionAutoSwitchService();
export default subscriptionAutoSwitchService;
