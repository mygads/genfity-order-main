/**
 * Merchant Feedback Analytics API
 * GET /api/merchant/feedback/analytics - Get feedback analytics for merchant
 * 
 * Features:
 * - Average ratings (overall, service, food)
 * - Rating distribution
 * - Trends over time
 * - Total feedback count
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';

interface FeedbackAnalytics {
    summary: {
        totalFeedback: number;
        averageOverallRating: number;
        averageServiceRating: number | null;
        averageFoodRating: number | null;
        averageCompletionTime: number | null;
    };
    ratingDistribution: Array<{
        rating: number;
        count: number;
        percentage: number;
    }>;
    recentTrends: Array<{
        date: string;
        count: number;
        averageRating: number;
    }>;
}

/**
 * GET /api/merchant/feedback/analytics
 * Get feedback analytics for merchant
 * 
 * Query params:
 * - period: 'week' | 'month' | 'quarter' | 'year' (default: month)
 */
export const GET = withMerchant(async (
    request: NextRequest,
    context: AuthContext
) => {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'month';

        // Calculate date range
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case 'month':
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get all feedback in period
        const feedback = await prisma.orderFeedback.findMany({
            where: {
                merchantId: context.merchantId,
                createdAt: { gte: startDate },
            },
            orderBy: { createdAt: 'asc' },
        });

        const totalFeedback = feedback.length;

        // Calculate averages
        const sumOverall = feedback.reduce((sum, f) => sum + f.overallRating, 0);
        const serviceRatings = feedback.filter(f => f.serviceRating !== null);
        const foodRatings = feedback.filter(f => f.foodRating !== null);
        const completionTimes = feedback.filter(f => f.orderCompletionMinutes !== null);

        const averageOverallRating = totalFeedback > 0 ? sumOverall / totalFeedback : 0;
        const averageServiceRating = serviceRatings.length > 0
            ? serviceRatings.reduce((sum, f) => sum + (f.serviceRating || 0), 0) / serviceRatings.length
            : null;
        const averageFoodRating = foodRatings.length > 0
            ? foodRatings.reduce((sum, f) => sum + (f.foodRating || 0), 0) / foodRatings.length
            : null;
        const averageCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((sum, f) => sum + (f.orderCompletionMinutes || 0), 0) / completionTimes.length
            : null;

        // Rating distribution (1-5 stars)
        const ratingCounts = new Map<number, number>();
        for (let i = 1; i <= 5; i++) {
            ratingCounts.set(i, 0);
        }
        feedback.forEach(f => {
            ratingCounts.set(f.overallRating, (ratingCounts.get(f.overallRating) || 0) + 1);
        });

        const ratingDistribution = Array.from(ratingCounts.entries()).map(([rating, count]) => ({
            rating,
            count,
            percentage: totalFeedback > 0 ? (count / totalFeedback) * 100 : 0,
        }));

        // Recent trends (group by day)
        const trendMap = new Map<string, { count: number; sumRating: number }>();
        feedback.forEach(f => {
            const date = f.createdAt.toISOString().split('T')[0];
            const current = trendMap.get(date) || { count: 0, sumRating: 0 };
            trendMap.set(date, {
                count: current.count + 1,
                sumRating: current.sumRating + f.overallRating,
            });
        });

        const recentTrends = Array.from(trendMap.entries())
            .map(([date, data]) => ({
                date,
                count: data.count,
                averageRating: data.count > 0 ? data.sumRating / data.count : 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const analytics: FeedbackAnalytics = {
            summary: {
                totalFeedback,
                averageOverallRating: Math.round(averageOverallRating * 10) / 10,
                averageServiceRating: averageServiceRating ? Math.round(averageServiceRating * 10) / 10 : null,
                averageFoodRating: averageFoodRating ? Math.round(averageFoodRating * 10) / 10 : null,
                averageCompletionTime: averageCompletionTime ? Math.round(averageCompletionTime) : null,
            },
            ratingDistribution,
            recentTrends,
        };

        return NextResponse.json({
            success: true,
            data: analytics,
            meta: {
                period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
            },
        });
    } catch (error) {
        console.error('[Feedback Analytics] Error:', error);
        return NextResponse.json(
            { success: false, error: 'ANALYTICS_ERROR', message: 'Failed to fetch feedback analytics' },
            { status: 500 }
        );
    }
});
