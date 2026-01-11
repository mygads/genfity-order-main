/**
 * Customer Feedback Analytics Page
 * Route: /admin/dashboard/customer-feedback
 * 
 * Features:
 * - Average rating summary cards
 * - Rating distribution chart
 * - Feedback trend chart
 * - Feedback list with filters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { FaStar, FaClock, FaConciergeBell, FaUtensils, FaCommentAlt, FaFilter } from 'react-icons/fa';
import { useMerchant } from '@/context/MerchantContext';
import { formatFullOrderNumber } from '@/lib/utils/format';

// Dynamic import for ApexCharts (SSR safe)
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
    loading: () => <div className="h-62.5 animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />,
});

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

interface FeedbackItem {
    id: string;
    orderNumber: string;
    overallRating: number;
    serviceRating: number | null;
    foodRating: number | null;
    comment: string | null;
    orderCompletionMinutes: number | null;
    createdAt: string;
}

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export default function CustomerFeedbackPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { merchant } = useMerchant();

    const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodType>('month');
    const [listPage, setListPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [ratingFilter, setRatingFilter] = useState<number | null>(null);

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/admin/login');
                return;
            }

            const response = await fetch(`/api/merchant/feedback/analytics?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAnalytics(data.data);
                }
            }
        } catch (error) {
            console.error('Error fetching feedback analytics:', error);
        }
    }, [period, router]);

    // Fetch feedback list
    const fetchFeedbackList = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const params = new URLSearchParams({
                page: listPage.toString(),
                limit: '10',
            });
            if (ratingFilter) {
                params.append('minRating', ratingFilter.toString());
                params.append('maxRating', ratingFilter.toString());
            }

            const response = await fetch(`/api/merchant/feedback?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFeedbackList(data.data);
                    setTotalPages(data.meta.totalPages);
                }
            }
        } catch (error) {
            console.error('Error fetching feedback list:', error);
        }
    }, [listPage, ratingFilter]);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchAnalytics(), fetchFeedbackList()]);
            setIsLoading(false);
        };
        loadData();
    }, [fetchAnalytics, fetchFeedbackList]);

    // Star rating display component
    const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
        const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`${sizeClass} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Rating Distribution Chart Options
    const ratingDistributionOptions: ApexOptions = {
        chart: {
            type: 'donut',
            fontFamily: 'Outfit, sans-serif',
        },
        colors: ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'],
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        legend: {
            position: 'bottom',
            fontSize: '12px',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: () => analytics?.summary.totalFeedback.toString() || '0',
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
    };

    // Trend Chart Options
    const trendChartOptions: ApexOptions = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            fontFamily: 'Outfit, sans-serif',
        },
        colors: ['#f97316'],
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: analytics?.recentTrends.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
            }) || [],
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            max: 5,
            labels: {
                formatter: (val: number) => val.toFixed(1),
            },
        },
        grid: {
            borderColor: '#e5e7eb',
            strokeDashArray: 4,
        },
        tooltip: {
            y: {
                formatter: (val: number) => `${val.toFixed(1)} stars`,
            },
        },
    };

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="h-75 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-75 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle={t('admin.nav.customerFeedback') || 'Customer Feedback'} />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('admin.nav.customerFeedback') || 'Customer Feedback'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        View and analyze customer ratings and reviews
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex gap-2">
                    {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${period === p
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Average Overall Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaStar className="text-yellow-400" />
                        <span>Average Rating</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.averageOverallRating?.toFixed(1) || '0.0'}
                    </div>
                    <StarDisplay rating={Math.round(analytics?.summary.averageOverallRating || 0)} />
                </div>

                {/* Total Feedback */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaCommentAlt className="text-blue-500" />
                        <span>Total Feedback</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.totalFeedback || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        In selected period
                    </div>
                </div>

                {/* Service Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaConciergeBell className="text-purple-500" />
                        <span>Service Rating</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.averageServiceRating?.toFixed(1) || 'N/A'}
                    </div>
                    {analytics?.summary.averageServiceRating && (
                        <StarDisplay rating={Math.round(analytics.summary.averageServiceRating)} />
                    )}
                </div>

                {/* Average Completion Time */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaClock className="text-green-500" />
                        <span>Avg. Completion</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.averageCompletionTime
                            ? `${analytics.summary.averageCompletionTime} min`
                            : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Order to completion
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Rating Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Rating Distribution
                    </h3>
                    {analytics?.summary.totalFeedback && analytics.summary.totalFeedback > 0 ? (
                        <ReactApexChart
                            options={ratingDistributionOptions}
                            series={analytics.ratingDistribution.map(r => r.count)}
                            type="donut"
                            height={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-62.5">
                            <p className="text-sm text-gray-500">No feedback data yet</p>
                        </div>
                    )}
                </div>

                {/* Rating Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Rating Trend
                    </h3>
                    {analytics?.recentTrends && analytics.recentTrends.length > 0 ? (
                        <ReactApexChart
                            options={trendChartOptions}
                            series={[{
                                name: 'Rating',
                                data: analytics.recentTrends.map(d => d.averageRating),
                            }]}
                            type="area"
                            height={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-62.5">
                            <p className="text-sm text-gray-500">No trend data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Feedback
                    </h3>

                    {/* Rating Filter */}
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400 w-4 h-4" />
                        <select
                            value={ratingFilter || ''}
                            onChange={(e) => {
                                setRatingFilter(e.target.value ? parseInt(e.target.value) : null);
                                setListPage(1);
                            }}
                            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">All Ratings</option>
                            {[5, 4, 3, 2, 1].map(r => (
                                <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {feedbackList.length > 0 ? (
                    <>
                        <div className="space-y-4">
                            {feedbackList.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    className="border border-gray-100 dark:border-gray-700 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <StarDisplay rating={feedback.overallRating} size="lg" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Order #{formatFullOrderNumber(feedback.orderNumber, merchant?.code)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(feedback.createdAt)}
                                                {feedback.orderCompletionMinutes && (
                                                    <span className="ml-2">
                                                        • Completed in {feedback.orderCompletionMinutes} min
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex gap-3 text-xs text-gray-500">
                                            {feedback.serviceRating && (
                                                <span className="flex items-center gap-1">
                                                    <FaConciergeBell className="text-purple-400" />
                                                    {feedback.serviceRating}
                                                </span>
                                            )}
                                            {feedback.foodRating && (
                                                <span className="flex items-center gap-1">
                                                    <FaUtensils className="text-orange-400" />
                                                    {feedback.foodRating}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {feedback.comment && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                            &quot;{feedback.comment}&quot;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                                <button
                                    onClick={() => setListPage(p => Math.max(1, p - 1))}
                                    disabled={listPage === 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1.5 text-sm text-gray-500">
                                    Page {listPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setListPage(p => Math.min(totalPages, p + 1))}
                                    disabled={listPage === totalPages}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8">
                        <FaCommentAlt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No feedback received yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Feedback will appear here when customers rate their orders
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
