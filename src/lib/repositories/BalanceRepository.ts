/**
 * Balance Repository
 * Data access layer for merchant balance operations
 */

import prisma from '@/lib/db/client';
import { Prisma, type BalanceTransactionType } from '@prisma/client';

class BalanceRepository {
    /**
     * Get merchant balance
     */
    async getMerchantBalance(merchantId: bigint) {
        return prisma.merchantBalance.findUnique({
            where: { merchantId },
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        currency: true,
                    },
                },
            },
        });
    }

    /**
     * Create merchant balance (for new merchants)
     */
    async createMerchantBalance(merchantId: bigint) {
        return prisma.merchantBalance.create({
            data: {
                merchantId,
                balance: 0,
            },
        });
    }

    /**
     * Get or create merchant balance
     */
    async getOrCreateBalance(merchantId: bigint) {
        let balance = await this.getMerchantBalance(merchantId);
        if (!balance) {
            balance = await prisma.merchantBalance.create({
                data: {
                    merchantId,
                    balance: 0,
                },
                include: {
                    merchant: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            currency: true,
                        },
                    },
                },
            });
        }
        return balance;
    }

    /**
     * Add balance (deposit/topup) - with transaction safety
     */
    async addBalance(
        merchantId: bigint,
        amount: number,
        type: BalanceTransactionType,
        description: string,
        paymentRequestId?: bigint,
        createdByUserId?: bigint
    ) {
        return prisma.$transaction(async (tx) => {
            // Get or create balance
            let balance = await tx.merchantBalance.findUnique({
                where: { merchantId },
            });

            if (!balance) {
                balance = await tx.merchantBalance.create({
                    data: {
                        merchantId,
                        balance: 0,
                    },
                });
            }

            const balanceBefore = Number(balance.balance);
            const balanceAfter = balanceBefore + amount;

            // Update balance
            const updatedBalance = await tx.merchantBalance.update({
                where: { merchantId },
                data: {
                    balance: balanceAfter,
                    lastTopupAt: type === 'DEPOSIT' ? new Date() : undefined,
                },
            });

            // Create transaction record
            await tx.balanceTransaction.create({
                data: {
                    balanceId: balance.id,
                    type,
                    amount,
                    balanceBefore,
                    balanceAfter,
                    description,
                    paymentRequestId,
                    createdByUserId,
                },
            });

            return updatedBalance;
        });
    }

    /**
     * Deduct balance (order fee) - with transaction safety
     * Now allows negative balance - will be handled by cron at midnight
     */
    async deductBalance(
        merchantId: bigint,
        amount: number,
        orderId: bigint,
        description: string
    ) {
        try {
            return await prisma.$transaction(async (tx) => {
                const balance = await tx.merchantBalance.findUnique({
                    where: { merchantId },
                });

                if (!balance) {
                    throw new Error('Balance not found');
                }

                const balanceBefore = Number(balance.balance);
                // Allow negative balance - cron job will handle at midnight
                const balanceAfter = balanceBefore - amount;

                // Best-effort idempotency guard (fully race-safe once @@unique([type, orderId]) is applied)
                const existing = await tx.balanceTransaction.findFirst({
                    where: { type: 'ORDER_FEE', orderId },
                    select: { id: true },
                });
                if (existing) {
                    console.warn('[BALANCE] Duplicate ORDER_FEE prevented', {
                        merchantId: merchantId.toString(),
                        orderId: orderId.toString(),
                        type: 'ORDER_FEE',
                        balanceTransactionId: existing.id.toString(),
                    });
                    return {
                        balance,
                        balanceBefore,
                        newBalance: balanceBefore,
                        isZero: balanceBefore <= 0,
                        isNegative: balanceBefore < 0,
                        wasDuplicate: true as const,
                    };
                }

                // Update balance
                const updatedBalance = await tx.merchantBalance.update({
                    where: { merchantId },
                    data: {
                        balance: balanceAfter,
                    },
                });

                // Create transaction record (unique(type, orderId) ensures idempotency)
                await tx.balanceTransaction.create({
                    data: {
                        balanceId: balance.id,
                        type: 'ORDER_FEE',
                        amount: -amount, // Negative for deductions
                        balanceBefore,
                        balanceAfter,
                        description,
                        orderId,
                    },
                });

                return {
                    balance: updatedBalance,
                    balanceBefore,
                    newBalance: balanceAfter,
                    isZero: balanceAfter <= 0,
                    isNegative: balanceAfter < 0,
                    wasDuplicate: false as const,
                };
            });
        } catch (error) {
            // If this deduction was already recorded (race/retry), treat as idempotent success.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                console.warn('[BALANCE] Duplicate ORDER_FEE prevented (unique constraint)', {
                    merchantId: merchantId.toString(),
                    orderId: orderId.toString(),
                    type: 'ORDER_FEE',
                });
                const current = await prisma.merchantBalance.findUnique({ where: { merchantId } });
                const currentBalance = current ? Number(current.balance) : 0;

                return {
                    balance: current,
                    balanceBefore: currentBalance,
                    newBalance: currentBalance,
                    isZero: currentBalance <= 0,
                    isNegative: currentBalance < 0,
                    wasDuplicate: true as const,
                };
            }

            throw error;
        }
    }

    /**
     * Deduct balance with a custom transaction type.
     * By default this enforces non-negative balances (used for paid add-ons like completed-order emails).
     */
    async deductBalanceWithType(
        merchantId: bigint,
        options: {
            amount: number;
            type: BalanceTransactionType;
            description: string;
            orderId?: bigint;
            allowNegative?: boolean;
        }
    ) {
        const { amount, type, description, orderId, allowNegative = false } = options;

        try {
            return await prisma.$transaction(async (tx) => {
                let balance = await tx.merchantBalance.findUnique({
                    where: { merchantId },
                });

                if (!balance) {
                    balance = await tx.merchantBalance.create({
                        data: {
                            merchantId,
                            balance: 0,
                        },
                    });
                }

                const balanceBefore = Number(balance.balance);
                const balanceAfter = balanceBefore - amount;

                // Best-effort idempotency guard (fully race-safe once @@unique([type, orderId]) is applied)
                if (typeof orderId !== 'undefined') {
                    const existing = await tx.balanceTransaction.findFirst({
                        where: { type, orderId },
                        select: { id: true },
                    });
                    if (existing) {
                        console.warn('[BALANCE] Duplicate transaction prevented', {
                            merchantId: merchantId.toString(),
                            orderId: orderId.toString(),
                            type,
                            balanceTransactionId: existing.id.toString(),
                        });
                        return {
                            balance,
                            balanceBefore,
                            newBalance: balanceBefore,
                            wasDuplicate: true as const,
                        };
                    }
                }

                if (!allowNegative && balanceAfter < 0) {
                    throw new Error('Insufficient balance');
                }

                const updatedBalance = await tx.merchantBalance.update({
                    where: { merchantId },
                    data: {
                        balance: balanceAfter,
                    },
                });

                // Create transaction record (unique(type, orderId) ensures idempotency)
                await tx.balanceTransaction.create({
                    data: {
                        balanceId: balance.id,
                        type,
                        amount: -amount,
                        balanceBefore,
                        balanceAfter,
                        description,
                        orderId,
                    },
                });

                return {
                    balance: updatedBalance,
                    balanceBefore,
                    newBalance: balanceAfter,
                    wasDuplicate: false as const,
                };
            });
        } catch (error) {
            // If this deduction was already recorded (race/retry), treat as idempotent success.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                console.warn('[BALANCE] Duplicate transaction prevented (unique constraint)', {
                    merchantId: merchantId.toString(),
                    orderId: typeof orderId === 'undefined' ? null : orderId.toString(),
                    type,
                });
                const current = await prisma.merchantBalance.findUnique({ where: { merchantId } });
                const currentBalance = current ? Number(current.balance) : 0;
                return {
                    balance: current,
                    balanceBefore: currentBalance,
                    newBalance: currentBalance,
                    wasDuplicate: true as const,
                };
            }

            throw error;
        }
    }

    /**
     * Adjust balance (admin manual adjustment)
     */
    async adjustBalance(
        merchantId: bigint,
        amount: number, // Can be positive or negative
        description: string,
        createdByUserId: bigint
    ) {
        return prisma.$transaction(async (tx) => {
            const balance = await tx.merchantBalance.findUnique({
                where: { merchantId },
            });

            if (!balance) {
                throw new Error('Balance not found');
            }

            const balanceBefore = Number(balance.balance);
            const balanceAfter = balanceBefore + amount;

            // Prevent negative balance
            if (balanceAfter < 0) {
                throw new Error('Cannot adjust to negative balance');
            }

            // Update balance
            const updatedBalance = await tx.merchantBalance.update({
                where: { merchantId },
                data: {
                    balance: balanceAfter,
                },
            });

            // Create transaction record
            await tx.balanceTransaction.create({
                data: {
                    balanceId: balance.id,
                    type: 'ADJUSTMENT',
                    amount,
                    balanceBefore,
                    balanceAfter,
                    description,
                    createdByUserId,
                },
            });

            return updatedBalance;
        });
    }

    /**
     * Get balance transactions
     */
    async getTransactions(
        merchantId: bigint,
        options: {
            limit?: number;
            offset?: number;
            type?: BalanceTransactionType;
        } = {}
    ) {
        const { limit = 50, offset = 0, type } = options;

        const balance = await prisma.merchantBalance.findUnique({
            where: { merchantId },
        });

        if (!balance) {
            return { transactions: [], total: 0 };
        }

        const where: Prisma.BalanceTransactionWhereInput = {
            balanceId: balance.id,
            ...(type && { type }),
        };

        const [transactions, total] = await Promise.all([
            prisma.balanceTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.balanceTransaction.count({ where }),
        ]);

        return { transactions, total };
    }

    /**
     * Get transactions within a date range (for billing summary)
     */
    async getTransactionsByDateRange(
        merchantId: bigint,
        startDate: Date,
        endDate: Date
    ) {
        const balance = await prisma.merchantBalance.findUnique({
            where: { merchantId },
        });

        if (!balance) {
            return [];
        }

        return prisma.balanceTransaction.findMany({
            where: {
                balanceId: balance.id,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}

const balanceRepository = new BalanceRepository();
export default balanceRepository;
