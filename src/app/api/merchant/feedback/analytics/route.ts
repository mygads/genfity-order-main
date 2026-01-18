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
import { formatInTimeZone } from 'date-fns-tz';

const POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'love', 'friendly', 'fast', 'quick',
    'tasty', 'delicious', 'nice', 'satisfied', 'mantap', 'enak', 'lezat', 'ramah',
    'cepat', 'bagus', 'puas', 'mantul', 'recommended', 'recommend'
];
const NEGATIVE_WORDS = [
    'bad', 'slow', 'late', 'cold', 'rude', 'burnt', 'dirty', 'expensive', 'small',
    'poor', 'not good', 'delay', 'overpriced', 'mahal', 'lama', 'dingin', 'kurang',
    'kecewa', 'jelek', 'kotor', 'asin', 'gosong'
];
const TAG_KEYWORDS: Record<string, string[]> = {
    service: ['service', 'staff', 'waiter', 'cashier', 'ramah', 'pelayanan', 'kasir'],
    food: ['food', 'taste', 'flavor', 'tasty', 'delicious', 'enak', 'lezat', 'rasa', 'makanan'],
    delivery: ['delivery', 'driver', 'courier', 'antar', 'pengantaran'],
    price: ['price', 'expensive', 'cheap', 'mahal', 'murah', 'value'],
    portion: ['portion', 'portion size', 'small', 'besar', 'porsi', 'portion'],
    cleanliness: ['clean', 'dirty', 'kotor', 'bersih'],
    packaging: ['packaging', 'package', 'kemasan', 'bungkus'],
    speed: ['fast', 'quick', 'slow', 'late', 'cepat', 'lama'],
};

const normalizeText = (value?: string | null) => (value || '').toLowerCase();

const getSentiment = (comment: string | null | undefined, rating: number) => {
    const text = normalizeText(comment);
    const hasPositive = POSITIVE_WORDS.some((word) => text.includes(word));
    const hasNegative = NEGATIVE_WORDS.some((word) => text.includes(word));

    if (rating >= 4 && hasPositive && !hasNegative) return 'positive';
    if (rating <= 2 || hasNegative) return 'negative';
    return 'neutral';
};

const getTags = (comment: string | null | undefined) => {
    const text = normalizeText(comment);
    return Object.entries(TAG_KEYWORDS)
        .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
        .map(([tag]) => tag);
};

interface FeedbackAnalytics {
    summary: {
        totalFeedback: number;
        averageOverallRating: number;
        averageServiceRating: number | null;
        averageFoodRating: number | null;
        averageCompletionTime: number | null;
    };
    sentimentDistribution: Array<{
        sentiment: 'positive' | 'neutral' | 'negative';
        count: number;
        percentage: number;
    }>;
    topTags: Array<{
        tag: string;
        count: number;
        percentage: number;
    }>;
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

        const merchant = await prisma.merchant.findUnique({
            where: { id: context.merchantId },
            select: { timezone: true },
        });

        const timezone = merchant?.timezone || 'Asia/Jakarta';

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

        // Sentiment distribution
        const sentimentMap = new Map<'positive' | 'neutral' | 'negative', number>([
            ['positive', 0],
            ['neutral', 0],
            ['negative', 0],
        ]);

        const tagMap = new Map<string, number>();

        feedback.forEach((item) => {
            const sentiment = getSentiment(item.comment, item.overallRating);
            sentimentMap.set(sentiment, (sentimentMap.get(sentiment) || 0) + 1);

            const tags = getTags(item.comment);
            tags.forEach((tag) => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        });

        const sentimentDistribution = Array.from(sentimentMap.entries()).map(([sentiment, count]) => ({
            sentiment,
            count,
            percentage: totalFeedback > 0 ? (count / totalFeedback) * 100 : 0,
        }));

        const topTags = Array.from(tagMap.entries())
            .map(([tag, count]) => ({
                tag,
                count,
                percentage: totalFeedback > 0 ? (count / totalFeedback) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

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
            const date = formatInTimeZone(f.createdAt, timezone, 'yyyy-MM-dd');
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
            sentimentDistribution,
            topTags,
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
                timezone,
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
