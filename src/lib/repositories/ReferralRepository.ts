/**
 * Referral Repository
 * Database operations for referral codes and usage tracking
 */

import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';

// Define types locally until prisma generate is run
type ReferralDiscountType = 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BONUS_DAYS';
type ReferralUsageType = 'REGISTRATION' | 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIBE';

export interface CreateReferralCodeInput {
    code: string;
    description?: string;
    discountType?: ReferralDiscountType;
    discountValue?: number;
    maxUsage?: number;
    validFrom?: Date;
    validUntil?: Date;
    createdByUserId: bigint;
}

export interface UpdateReferralCodeInput {
    description?: string;
    discountType?: ReferralDiscountType;
    discountValue?: number;
    maxUsage?: number;
    validFrom?: Date | null;
    validUntil?: Date | null;
    isActive?: boolean;
}

interface UsageRecord {
    merchantId: bigint;
    createdAt: Date;
}

interface MerchantWithSubscription {
    id: bigint;
    code: string;
    name: string;
    referralCodeUsed: string | null;
    subscription: {
        type: string;
        status: string;
    } | null;
}

class ReferralRepository {
    /**
     * Create a new referral code
     */
    async createCode(input: CreateReferralCodeInput) {
        return prisma.referralCode.create({
            data: {
                code: input.code.toUpperCase(),
                description: input.description,
                discountType: input.discountType || 'NONE',
                discountValue: input.discountValue,
                maxUsage: input.maxUsage,
                validFrom: input.validFrom,
                validUntil: input.validUntil,
                createdByUserId: input.createdByUserId,
            },
        });
    }

    /**
     * Update a referral code
     */
    async updateCode(id: bigint, input: UpdateReferralCodeInput) {
        return prisma.referralCode.update({
            where: { id },
            data: input,
        });
    }

    /**
     * Get a referral code by ID
     */
    async getCodeById(id: bigint) {
        return prisma.referralCode.findUnique({
            where: { id },
            include: {
                usages: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    /**
     * Get a referral code by code string
     */
    async getCodeByCode(code: string) {
        return prisma.referralCode.findUnique({
            where: { code: code.toUpperCase() },
        });
    }

    /**
     * Get all referral codes with pagination
     */
    async getAllCodes(options: {
        limit?: number;
        offset?: number;
        includeInactive?: boolean;
    } = {}) {
        const { limit = 50, offset = 0, includeInactive = false } = options;

        const where = includeInactive ? {} : { isActive: true };

        const [codes, total] = await Promise.all([
            prisma.referralCode.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    _count: {
                        select: { usages: true },
                    },
                },
            }),
            prisma.referralCode.count({ where }),
        ]);

        return { codes, total };
    }

    /**
     * Deactivate a referral code
     */
    async deactivateCode(id: bigint) {
        return prisma.referralCode.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Record a referral usage
     */
    async recordUsage(
        codeId: bigint,
        merchantId: bigint,
        usageType: ReferralUsageType,
        paymentRequestId?: bigint,
        discountApplied?: number
    ) {
        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Create usage record
            const usage = await tx.referralUsage.create({
                data: {
                    referralCodeId: codeId,
                    merchantId,
                    usageType,
                    paymentRequestId,
                    discountApplied,
                },
            });

            // Increment usage count
            await tx.referralCode.update({
                where: { id: codeId },
                data: {
                    currentUsage: { increment: 1 },
                },
            });

            return usage;
        });
    }

    /**
     * Get usage history for a code
     */
    async getCodeUsage(
        codeId: bigint,
        options: { limit?: number; offset?: number } = {}
    ) {
        const { limit = 50, offset = 0 } = options;

        const [usages, total] = await Promise.all([
            prisma.referralUsage.findMany({
                where: { referralCodeId: codeId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.referralUsage.count({ where: { referralCodeId: codeId } }),
        ]);

        return { usages, total };
    }

    /**
     * Get statistics for a referral code
     */
    async getCodeStats(codeId: bigint) {
        const [totalUsages, usagesByType, uniqueMerchants] = await Promise.all([
            prisma.referralUsage.count({ where: { referralCodeId: codeId } }),
            prisma.referralUsage.groupBy({
                by: ['usageType'],
                where: { referralCodeId: codeId },
                _count: true,
            }),
            prisma.referralUsage.findMany({
                where: { referralCodeId: codeId },
                select: { merchantId: true },
                distinct: ['merchantId'],
            }),
        ]);

        type UsageByType = { usageType: ReferralUsageType; _count: number };
        return {
            totalUsages,
            uniqueMerchants: uniqueMerchants.length,
            registrations: usagesByType.find((u: UsageByType) => u.usageType === 'REGISTRATION')?._count || 0,
            depositTopups: usagesByType.find((u: UsageByType) => u.usageType === 'DEPOSIT_TOPUP')?._count || 0,
            monthlySubscribes: usagesByType.find((u: UsageByType) => u.usageType === 'MONTHLY_SUBSCRIBE')?._count || 0,
        };
    }

    /**
     * Check if a merchant has used a specific referral code for a specific usage type
     */
    async hasUsedCode(merchantId: bigint, codeId: bigint, usageType: ReferralUsageType) {
        const usage = await prisma.referralUsage.findFirst({
            where: {
                merchantId,
                referralCodeId: codeId,
                usageType,
            },
        });
        return !!usage;
    }

    /**
     * Get merchants who used a specific referral code with their subscription info
     */
    async getMerchantsUsingCode(codeId: bigint, options: { limit?: number; offset?: number } = {}) {
        const { limit = 50, offset = 0 } = options;

        const usages = await prisma.referralUsage.findMany({
            where: { referralCodeId: codeId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            distinct: ['merchantId'],
        });

        // Get merchant details with subscription status
        type UsageRecord = { merchantId: bigint; createdAt: Date };
        const merchantIds = usages.map((u: UsageRecord) => u.merchantId);

        const merchants = await prisma.merchant.findMany({
            where: { id: { in: merchantIds } },
            include: {
                subscription: {
                    select: {
                        type: true,
                        status: true,
                    },
                },
            },
        });

        type MerchantWithSubscription = typeof merchants[number];
        return merchants.map((m: MerchantWithSubscription) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            referralCodeUsed: m.referralCodeUsed,
            subscription: m.subscription ? {
                type: m.subscription.type,
                status: m.subscription.status,
            } : null,
            usedAt: usages.find((u: UsageRecord) => u.merchantId === m.id)?.createdAt,
        }));
    }
}

const referralRepository = new ReferralRepository();
export default referralRepository;
