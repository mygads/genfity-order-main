/**
 * Subscription Analytics API
 * Super Admin endpoint for subscription metrics
 * GET /api/admin/analytics/subscription
 */

import { NextResponse } from 'next/server';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';

interface SubscriptionMetrics {
    overview: {
        totalMerchants: number;
        activeMerchants: number;
        trialMerchants: number;
        depositMerchants: number;
        monthlyMerchants: number;
        suspendedMerchants: number;
        inGracePeriod: number;
    };
    conversion: {
        trialToDeposit: number;
        trialToMonthly: number;
        trialChurnRate: number;
        overallConversionRate: number;
    };
    revenue: {
        mrr: number;  // Monthly Recurring Revenue
        arr: number;  // Annual Recurring Revenue
        totalDeposits: number;
        avgDepositAmount: number;
        totalOrderFees: number;  // Total order fees collected
        currency: string;
    };
    revenueTrends: Array<{
        month: string;
        deposits: number;
        orderFees: number;
        monthlySubscriptions: number;
        totalRevenue: number;
    }>;
    trends: {
        newTrialsThisMonth: number;
        conversionsThisMonth: number;
        churnsThisMonth: number;
        netGrowth: number;
    };
    timeline: Array<{
        month: string;
        newTrials: number;
        conversions: number;
        churns: number;
        activeEnd: number;
    }>;
    eventHistory: {
        eventCounts: Record<string, number>;
        dailyEvents: Record<string, Record<string, number>>;
        recentEvents: Array<{
            id: string;
            merchantId: string;
            eventType: string;
            previousType: string | null;
            newType: string | null;
            reason: string | null;
            createdAt: Date;
        }>;
    };
}

export const GET = withSuperAdmin(async (
    request: Request,
    authContext: AuthContext
) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Get grace period from subscription plan
        const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
            where: { planKey: 'MONTHLY_BASIC' },
        });
        const gracePeriodDays = (subscriptionPlan as { gracePeriodDays?: number })?.gracePeriodDays || 3;
        const graceThreshold = new Date(now.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000);

        // Get all merchants with subscriptions
        const allSubscriptions = await prisma.merchantSubscription.findMany({
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        currency: true,
                        createdAt: true,
                    },
                },
            },
        });

        // Count merchants in grace period
        const inGracePeriod = allSubscriptions.filter(sub => {
            if (sub.status !== 'ACTIVE') return false;
            
            if (sub.type === 'TRIAL' && sub.trialEndsAt) {
                return sub.trialEndsAt < now && sub.trialEndsAt >= graceThreshold;
            }
            if (sub.type === 'MONTHLY' && sub.currentPeriodEnd) {
                return sub.currentPeriodEnd < now && sub.currentPeriodEnd >= graceThreshold;
            }
            return false;
        }).length;

        // Overview metrics
        const overview = {
            totalMerchants: allSubscriptions.length,
            activeMerchants: allSubscriptions.filter(s => s.status === 'ACTIVE').length,
            trialMerchants: allSubscriptions.filter(s => s.type === 'TRIAL' && s.status === 'ACTIVE').length,
            depositMerchants: allSubscriptions.filter(s => s.type === 'DEPOSIT' && s.status === 'ACTIVE').length,
            monthlyMerchants: allSubscriptions.filter(s => s.type === 'MONTHLY' && s.status === 'ACTIVE').length,
            suspendedMerchants: allSubscriptions.filter(s => s.status === 'SUSPENDED').length,
            inGracePeriod,
        };

        // Conversion metrics - check historical conversions
        const merchantsWithHistory = await prisma.merchantSubscription.findMany({
            where: {
                type: { in: ['DEPOSIT', 'MONTHLY'] },
            },
        });

        // Merchants who started with trial and converted
        const trialToDeposit = merchantsWithHistory.filter(s => 
            s.type === 'DEPOSIT' && s.trialStartedAt
        ).length;
        
        const trialToMonthly = merchantsWithHistory.filter(s => 
            s.type === 'MONTHLY' && s.trialStartedAt
        ).length;

        // Total who ever had trial
        const totalTrialStarters = allSubscriptions.filter(s => 
            s.trialStartedAt !== null
        ).length;

        // Churned = suspended or cancelled who had trial
        const churned = allSubscriptions.filter(s => 
            (s.status === 'SUSPENDED' || s.status === 'CANCELLED') && s.trialStartedAt
        ).length;

        const conversion = {
            trialToDeposit,
            trialToMonthly,
            trialChurnRate: totalTrialStarters > 0 
                ? Math.round((churned / totalTrialStarters) * 100) 
                : 0,
            overallConversionRate: totalTrialStarters > 0 
                ? Math.round(((trialToDeposit + trialToMonthly) / totalTrialStarters) * 100) 
                : 0,
        };

        // Revenue metrics
        const monthlyPlan = await prisma.subscriptionPlan.findUnique({
            where: { planKey: 'MONTHLY_BASIC' },
        });

        const monthlyPrice = monthlyPlan ? Number(monthlyPlan.monthlyPriceIdr) : 149000; // Default IDR
        const activeMonthly = overview.monthlyMerchants;
        const mrr = activeMonthly * monthlyPrice;
        const arr = mrr * 12;

        // Get total deposits from balance transactions
        const totalDeposits = await prisma.balanceTransaction.aggregate({
            where: {
                type: 'DEPOSIT',
            },
            _sum: {
                amount: true,
            },
            _avg: {
                amount: true,
            },
        });

        // Get total order fees from balance transactions
        const totalOrderFees = await prisma.balanceTransaction.aggregate({
            where: {
                type: 'ORDER_FEE',
            },
            _sum: {
                amount: true,
            },
        });

        const revenue = {
            mrr,
            arr,
            totalDeposits: Number(totalDeposits._sum?.amount || 0),
            avgDepositAmount: Number(totalDeposits._avg?.amount || 0),
            totalOrderFees: Math.abs(Number(totalOrderFees._sum?.amount || 0)),
            currency: 'IDR',  // Primary currency
        };

        // Generate 6-month revenue trends
        const revenueTrends: SubscriptionMetrics['revenueTrends'] = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            // Deposits this month
            const monthlyDeposits = await prisma.balanceTransaction.aggregate({
                where: {
                    type: 'DEPOSIT',
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
                _sum: { amount: true },
            });

            // Order fees this month (deductions are negative, so we use absolute value)
            const monthlyOrderFees = await prisma.balanceTransaction.aggregate({
                where: {
                    type: 'ORDER_FEE',
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
                _sum: { amount: true },
            });

            // Monthly subscription payments (from payment requests)
            const monthlySubPayments = await prisma.paymentRequest.aggregate({
                where: {
                    status: 'VERIFIED',
                    type: 'MONTHLY_SUBSCRIPTION',
                    verifiedAt: { gte: monthStart, lte: monthEnd },
                },
                _sum: { amount: true },
            });

            const deposits = Number(monthlyDeposits._sum?.amount || 0);
            const orderFees = Math.abs(Number(monthlyOrderFees._sum?.amount || 0));
            const monthlySubscriptions = Number(monthlySubPayments._sum?.amount || 0);

            revenueTrends.push({
                month: monthLabel,
                deposits,
                orderFees,
                monthlySubscriptions,
                totalRevenue: deposits + orderFees + monthlySubscriptions,
            });
        }

        // Trends this month
        const newTrialsThisMonth = allSubscriptions.filter(s => 
            s.trialStartedAt && s.trialStartedAt >= startOfMonth
        ).length;

        // Conversions this month (subscriptions that changed from trial to paid)
        const conversionsThisMonth = await prisma.merchantSubscription.count({
            where: {
                type: { in: ['DEPOSIT', 'MONTHLY'] },
                trialStartedAt: { not: null },
                updatedAt: { gte: startOfMonth },
            },
        });

        // Churns this month
        const churnsThisMonth = await prisma.merchantSubscription.count({
            where: {
                status: 'SUSPENDED',
                suspendedAt: { gte: startOfMonth },
            },
        });

        const trends = {
            newTrialsThisMonth,
            conversionsThisMonth,
            churnsThisMonth,
            netGrowth: newTrialsThisMonth + conversionsThisMonth - churnsThisMonth,
        };

        // Generate 6-month timeline
        const timeline: SubscriptionMetrics['timeline'] = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            // New trials in this month
            const newTrials = allSubscriptions.filter(s => 
                s.trialStartedAt && 
                s.trialStartedAt >= monthStart && 
                s.trialStartedAt <= monthEnd
            ).length;

            // This is approximate - would need subscription history table for accuracy
            const monthConversions = await prisma.merchantSubscription.count({
                where: {
                    type: { in: ['DEPOSIT', 'MONTHLY'] },
                    trialStartedAt: { not: null },
                    updatedAt: { gte: monthStart, lte: monthEnd },
                },
            });

            const monthChurns = await prisma.merchantSubscription.count({
                where: {
                    status: 'SUSPENDED',
                    suspendedAt: { gte: monthStart, lte: monthEnd },
                },
            });

            // Active at end of month (approximate)
            const activeEnd = allSubscriptions.filter(s => 
                s.status === 'ACTIVE' && 
                (!s.suspendedAt || s.suspendedAt > monthEnd)
            ).length;

            timeline.push({
                month: monthLabel,
                newTrials,
                conversions: monthConversions,
                churns: monthChurns,
                activeEnd,
            });
        }

        // Get event history from SubscriptionHistory table
        const [eventCounts, dailyEvents, recentEventsData] = await Promise.all([
            subscriptionHistoryService.getEventCounts({
                startDate: thirtyDaysAgo,
                endDate: now,
            }),
            subscriptionHistoryService.getDailyEventCounts({
                startDate: thirtyDaysAgo,
                endDate: now,
            }),
            subscriptionHistoryService.getAnalyticsData({
                startDate: thirtyDaysAgo,
                endDate: now,
                limit: 50,
            }),
        ]);

        const eventHistory = {
            eventCounts,
            dailyEvents,
            recentEvents: recentEventsData.events.map((e: {
                id: bigint;
                merchantId: bigint;
                eventType: string;
                previousType: string | null;
                newType: string | null;
                reason: string | null;
                createdAt: Date;
            }) => ({
                id: e.id.toString(),
                merchantId: e.merchantId.toString(),
                eventType: e.eventType,
                previousType: e.previousType,
                newType: e.newType,
                reason: e.reason,
                createdAt: e.createdAt,
            })),
        };

        const metrics: SubscriptionMetrics = {
            overview,
            conversion,
            revenue,
            revenueTrends,
            trends,
            timeline,
            eventHistory,
        };

        return NextResponse.json({
            success: true,
            data: serializeBigInt(metrics),
        });
    } catch (error) {
        console.error('Subscription analytics error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch subscription analytics' },
            { status: 500 }
        );
    }
});
