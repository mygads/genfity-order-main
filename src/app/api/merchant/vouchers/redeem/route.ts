/**
 * Merchant Voucher Redeem API
 * POST /api/merchant/vouchers/redeem - Redeem a voucher code
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';

/**
 * POST /api/merchant/vouchers/redeem
 * Redeem a voucher code for the current merchant
 */
async function handlePost(req: NextRequest, context: AuthContext) {
    const body = await req.json();
    const { code } = body;

    if (!code) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Voucher code is required' },
            { status: 400 }
        );
    }

    if (!context.merchantId) {
        return NextResponse.json(
            { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
            { status: 400 }
        );
    }

    const merchant = await prisma.merchant.findUnique({
        where: { id: context.merchantId },
        include: {
            subscription: true,
            merchantBalance: true,
        },
    });

    if (!merchant) {
        return NextResponse.json(
            { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
            { status: 404 }
        );
    }

    const merchantId = merchant.id;
    const merchantCurrency = merchant.currency;

    // Find the voucher
    const voucher = await prisma.voucher.findUnique({
        where: { code: code.toUpperCase() },
    });

    if (!voucher) {
        return NextResponse.json(
            { success: false, error: 'VOUCHER_NOT_FOUND', message: 'Voucher code not found' },
            { status: 404 }
        );
    }

    // Check if voucher is active
    if (!voucher.isActive) {
        return NextResponse.json(
            { success: false, error: 'VOUCHER_INACTIVE', message: 'This voucher is no longer active' },
            { status: 400 }
        );
    }

    // Check currency restriction
    if (voucher.currency && voucher.currency !== merchantCurrency) {
        return NextResponse.json(
            { 
                success: false, 
                error: 'CURRENCY_MISMATCH', 
                message: `This voucher is only valid for ${voucher.currency} merchants` 
            },
            { status: 400 }
        );
    }

    // Check validity period
    const now = new Date();
    if (voucher.validFrom && now < voucher.validFrom) {
        return NextResponse.json(
            { success: false, error: 'VOUCHER_NOT_STARTED', message: 'This voucher is not yet valid' },
            { status: 400 }
        );
    }

    if (voucher.validUntil && now > voucher.validUntil) {
        return NextResponse.json(
            { success: false, error: 'VOUCHER_EXPIRED', message: 'This voucher has expired' },
            { status: 400 }
        );
    }

    // Check usage limit
    if (voucher.maxUsage !== null && voucher.currentUsage >= voucher.maxUsage) {
        return NextResponse.json(
            { success: false, error: 'VOUCHER_LIMIT_REACHED', message: 'This voucher has reached its usage limit' },
            { status: 400 }
        );
    }

    // Check if merchant already used this voucher
    const existingRedemption = await prisma.voucherRedemption.findFirst({
        where: {
            voucherId: voucher.id,
            merchantId: merchantId,
        },
    });

    if (existingRedemption) {
        return NextResponse.json(
            { success: false, error: 'ALREADY_REDEEMED', message: 'You have already used this voucher' },
            { status: 400 }
        );
    }

    // Get current subscription and balance state for logging
    const currentSubscription = merchant.subscription;
    const currentBalance = merchant.merchantBalance;

    // Prepare redemption data
    const redemptionData: {
        voucherId: bigint;
        merchantId: bigint;
        redeemedByUserId: bigint;
        voucherCode: string;
        voucherType: 'BALANCE' | 'SUBSCRIPTION_DAYS';
        valueApplied: number;
        currency: string;
        balanceBefore?: number;
        balanceAfter?: number;
        subscriptionEndBefore?: Date;
        subscriptionEndAfter?: Date;
        triggeredAutoSwitch: boolean;
        previousSubType?: string;
        newSubType?: string;
    } = {
        voucherId: voucher.id,
        merchantId: merchantId,
        redeemedByUserId: context.userId,
        voucherCode: voucher.code,
        voucherType: voucher.type,
        valueApplied: Number(voucher.value),
        currency: merchantCurrency,
        triggeredAutoSwitch: false,
    };

    let resultMessage = '';
    let autoSwitchTriggered = false;
    const previousSubType = currentSubscription?.type || 'NONE';
    let newSubType = previousSubType;

    // Handle based on voucher type
    if (voucher.type === 'BALANCE') {
        // Add balance to merchant
        const currentBalanceAmount = currentBalance ? Number(currentBalance.balance) : 0;
        const newBalanceAmount = currentBalanceAmount + Number(voucher.value);

        // Update or create merchant balance
        if (currentBalance) {
            await prisma.merchantBalance.update({
                where: { id: currentBalance.id },
                data: { balance: newBalanceAmount },
            });
        } else {
            await prisma.merchantBalance.create({
                data: {
                    merchantId: merchantId,
                    balance: newBalanceAmount,
                },
            });
        }

        // Create balance transaction record
        await prisma.balanceTransaction.create({
            data: {
                balanceId: currentBalance?.id || (await prisma.merchantBalance.findUnique({ where: { merchantId } }))!.id,
                type: 'DEPOSIT',
                amount: Number(voucher.value),
                balanceBefore: currentBalanceAmount,
                balanceAfter: newBalanceAmount,
                description: `Voucher redemption: ${voucher.code}`,
                createdByUserId: context.userId,
            },
        });

        redemptionData.balanceBefore = currentBalanceAmount;
        redemptionData.balanceAfter = newBalanceAmount;

        try {
            await subscriptionHistoryService.recordBalanceAdjusted(
                merchantId,
                Number(voucher.value),
                currentBalanceAmount,
                newBalanceAmount,
                `Voucher ${voucher.code} redeemed (+${formatCurrency(Number(voucher.value), merchantCurrency)})`,
                'MERCHANT',
                context.userId,
                {
                    source: 'VOUCHER_REDEEM',
                    voucherCode: voucher.code,
                    currency: merchantCurrency,
                    flowId: `voucher-${voucher.code}`,
                    flowType: 'VOUCHER_REDEMPTION',
                }
            );
        } catch (historyError) {
            console.error('Failed to record voucher balance history:', historyError);
        }

        // Check if we should auto-switch from TRIAL to DEPOSIT
        if (currentSubscription?.type === 'TRIAL') {
            const switchResult = await subscriptionAutoSwitchService.checkAndAutoSwitch(merchantId);
            if (switchResult.action === 'AUTO_SWITCHED') {
                autoSwitchTriggered = true;
                newSubType = switchResult.newType;
            }
        }

        resultMessage = `Successfully added ${formatCurrency(Number(voucher.value), merchantCurrency)} to your balance`;

    } else if (voucher.type === 'SUBSCRIPTION_DAYS') {
        // Add subscription days
        const daysToAdd = Math.floor(Number(voucher.value));
        const currentPeriodEnd = currentSubscription?.currentPeriodEnd || null;
        
        // Calculate new period end
        let newPeriodEnd: Date;
        if (currentPeriodEnd && currentPeriodEnd > now) {
            // Extend from current end date
            newPeriodEnd = new Date(currentPeriodEnd);
            newPeriodEnd.setDate(newPeriodEnd.getDate() + daysToAdd);
        } else {
            // Start from today
            newPeriodEnd = new Date();
            newPeriodEnd.setDate(newPeriodEnd.getDate() + daysToAdd);
        }

        redemptionData.subscriptionEndBefore = currentPeriodEnd || undefined;
        redemptionData.subscriptionEndAfter = newPeriodEnd;

        // Update subscription
        if (currentSubscription) {
            // If currently TRIAL, switch to MONTHLY
            const shouldSwitch = currentSubscription.type === 'TRIAL';
            
            await prisma.merchantSubscription.update({
                where: { id: currentSubscription.id },
                data: {
                    type: shouldSwitch ? 'MONTHLY' : currentSubscription.type,
                    status: 'ACTIVE',
                    currentPeriodStart: shouldSwitch ? now : (currentSubscription.currentPeriodStart || now),
                    currentPeriodEnd: newPeriodEnd,
                    suspendedAt: null,
                    suspendReason: null,
                },
            });

            if (shouldSwitch) {
                autoSwitchTriggered = true;
                newSubType = 'MONTHLY';
            }
        } else {
            // Create new subscription as MONTHLY
            await prisma.merchantSubscription.create({
                data: {
                    merchantId: merchantId,
                    type: 'MONTHLY',
                    status: 'ACTIVE',
                    currentPeriodStart: now,
                    currentPeriodEnd: newPeriodEnd,
                },
            });
            autoSwitchTriggered = true;
            newSubType = 'MONTHLY';
        }

        // Re-open store if it was closed
        if (!merchant.isOpen) {
            await prisma.merchant.update({
                where: { id: merchantId },
                data: { isOpen: true },
            });
        }

        try {
            await subscriptionHistoryService.recordPeriodAdjusted(
                merchantId,
                currentPeriodEnd,
                newPeriodEnd,
                daysToAdd,
                `Voucher ${voucher.code} redeemed (+${daysToAdd} days subscription)`,
                'MERCHANT',
                context.userId,
                currentSubscription?.type || null,
                newSubType,
                {
                    source: 'VOUCHER_REDEMPTION',
                    voucherCode: voucher.code,
                    flowId: `voucher-${voucher.code}`,
                    flowType: 'VOUCHER_REDEMPTION',
                }
            );
        } catch (historyError) {
            console.error('Failed to record voucher subscription history:', historyError);
        }

        resultMessage = `Successfully added ${daysToAdd} days to your subscription (valid until ${newPeriodEnd.toLocaleDateString()})`;
    }

    // Update redemption data with auto-switch info
    redemptionData.triggeredAutoSwitch = autoSwitchTriggered;
    if (autoSwitchTriggered) {
        redemptionData.previousSubType = previousSubType;
        redemptionData.newSubType = newSubType;
    }

    // Create redemption record
    await prisma.voucherRedemption.create({
        data: redemptionData,
    });

    // Increment voucher usage count
    await prisma.voucher.update({
        where: { id: voucher.id },
        data: { currentUsage: { increment: 1 } },
    });

    // Re-fetch updated subscription status
    const updatedSubscription = await prisma.merchantSubscription.findUnique({
        where: { merchantId: merchantId },
    });

    const updatedBalance = await prisma.merchantBalance.findUnique({
        where: { merchantId: merchantId },
    });

    return NextResponse.json({
        success: true,
        message: resultMessage,
        data: {
            voucherType: voucher.type,
            valueApplied: Number(voucher.value),
            autoSwitchTriggered,
            previousSubType: autoSwitchTriggered ? previousSubType : null,
            newSubType: autoSwitchTriggered ? newSubType : null,
            subscription: serializeBigInt(updatedSubscription),
            balance: updatedBalance ? Number(updatedBalance.balance) : 0,
        },
    });
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
    if (currency === 'AUD') {
        return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export const POST = withMerchant(handlePost);
