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
import { formatInTimeZone } from 'date-fns-tz';
import { buildOrderApiUrl } from '@/lib/utils/orderApiClient';

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

interface FeedbackItem {
    id: string;
    orderNumber: string;
    overallRating: number;
    serviceRating: number | null;
    foodRating: number | null;
    comment: string | null;
    orderCompletionMinutes: number | null;
    createdAt: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    tags?: string[];
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
    const [sentimentFilter, setSentimentFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const buildFeedbackParams = (page: number, limit: number) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (ratingFilter) {
            params.append('minRating', ratingFilter.toString());
            params.append('maxRating', ratingFilter.toString());
        }
        if (sentimentFilter) params.append('sentiment', sentimentFilter);
        if (tagFilter) params.append('tag', tagFilter);
        if (searchTerm) params.append('search', searchTerm);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return params;
    };

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/admin/login');
                return;
            }

            const response = await fetch(buildOrderApiUrl(`/api/merchant/feedback/analytics?period=${period}`), {
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

            const params = buildFeedbackParams(listPage, 10);

            const response = await fetch(buildOrderApiUrl(`/api/merchant/feedback?${params}`), {
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
    }, [listPage, ratingFilter, sentimentFilter, tagFilter, searchTerm, startDate, endDate]);

    const handleExport = async (format: 'csv' | 'xlsx') => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const limit = 100;
            let currentPage = 1;
            let totalPagesLocal = 1;
            const allRows: FeedbackItem[] = [];

            while (currentPage <= totalPagesLocal) {
                const params = buildFeedbackParams(currentPage, limit);
                const response = await fetch(buildOrderApiUrl(`/api/merchant/feedback?${params}`), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) break;
                const result = await response.json();
                if (!result.success) break;

                allRows.push(...result.data);
                totalPagesLocal = result.meta.totalPages || 1;
                currentPage += 1;
            }

            const XLSX = await import('xlsx');
            const rows = allRows.map((item) => ({
                orderNumber: item.orderNumber,
                overallRating: item.overallRating,
                serviceRating: item.serviceRating ?? '',
                foodRating: item.foodRating ?? '',
                sentiment: item.sentiment ?? '',
                tags: item.tags?.join(', ') ?? '',
                comment: item.comment ?? '',
                completionMinutes: item.orderCompletionMinutes ?? '',
                createdAt: item.createdAt,
            }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Feedback');
            const filename = `feedback_${startDate}_${endDate}.${format}`;

            if (format === 'xlsx') {
                XLSX.writeFile(wb, filename);
                return;
            }

            const csv = XLSX.utils.sheet_to_csv(wb.Sheets.Feedback);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Feedback export error:', error);
        }
    };

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
        const timezone = merchant?.timezone || 'Asia/Jakarta';
        return formatInTimeZone(new Date(dateString), timezone, 'dd MMM yyyy, HH:mm');
    };

    // Rating Distribution Chart Options
    const ratingDistributionOptions: ApexOptions = {
        chart: {
            type: 'donut',
            fontFamily: 'Outfit, sans-serif',
        },
        colors: ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'],
        labels: [
            t('admin.feedback.star1'),
            t('admin.feedback.star2'),
            t('admin.feedback.star3'),
            t('admin.feedback.star4'),
            t('admin.feedback.star5'),
        ],
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
                            label: t('admin.feedback.totalLabel'),
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
            categories: analytics?.recentTrends.map(d => d.date) || [],
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
                formatter: (val: number) => t('admin.feedback.starsTooltip', { value: val.toFixed(1) }),
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
                        {t('admin.feedback.subtitle')}
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex gap-2">
                    {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${period === p
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {t(`admin.feedback.period.${p}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setListPage(1);
                        }}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                    <span className="text-sm text-gray-400">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setListPage(1);
                        }}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                </div>

                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setListPage(1);
                    }}
                    placeholder={t('admin.feedback.searchPlaceholder')}
                    className="h-10 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />

                <select
                    value={sentimentFilter}
                    onChange={(e) => {
                        setSentimentFilter(e.target.value);
                        setListPage(1);
                    }}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                    <option value="">{t('admin.feedback.allSentiments')}</option>
                    <option value="positive">{t('admin.feedback.sentimentPositive')}</option>
                    <option value="neutral">{t('admin.feedback.sentimentNeutral')}</option>
                    <option value="negative">{t('admin.feedback.sentimentNegative')}</option>
                </select>

                <select
                    value={tagFilter}
                    onChange={(e) => {
                        setTagFilter(e.target.value);
                        setListPage(1);
                    }}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                    <option value="">{t('admin.feedback.allTags')}</option>
                    {analytics?.topTags?.map((tag) => (
                        <option key={tag.tag} value={tag.tag}>
                            {t(`admin.feedback.tag.${tag.tag}`) || tag.tag}
                        </option>
                    ))}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Average Overall Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaStar className="text-yellow-400" />
                        <span>{t('admin.feedback.averageRating')}</span>
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
                        <span>{t('admin.feedback.totalFeedback')}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.totalFeedback || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {t('admin.feedback.inSelectedPeriod')}
                    </div>
                </div>

                {/* Service Rating */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <FaConciergeBell className="text-purple-500" />
                        <span>{t('admin.feedback.serviceRating')}</span>
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
                        <span>{t('admin.feedback.avgCompletion')}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics?.summary.averageCompletionTime
                            ? `${analytics.summary.averageCompletionTime} min`
                            : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {t('admin.feedback.orderToCompletion')}
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Rating Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('admin.feedback.ratingDistribution')}
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
                            <p className="text-sm text-gray-500">{t('admin.feedback.noFeedbackData')}</p>
                        </div>
                    )}
                </div>

                {/* Sentiment Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('admin.feedback.sentimentDistribution')}
                    </h3>
                    {analytics?.sentimentDistribution?.length ? (
                        <ReactApexChart
                            options={{
                                chart: { type: 'donut', fontFamily: 'Outfit, sans-serif' },
                                colors: ['#22c55e', '#facc15', '#ef4444'],
                                labels: analytics.sentimentDistribution.map((item) => item.sentiment),
                                legend: { position: 'bottom', fontSize: '12px' },
                                dataLabels: { enabled: false },
                            }}
                            series={analytics.sentimentDistribution.map((item) => item.count)}
                            type="donut"
                            height={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-62.5">
                            <p className="text-sm text-gray-500">{t('admin.feedback.noSentimentData')}</p>
                        </div>
                    )}
                </div>

                {/* Rating Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('admin.feedback.ratingTrend')}
                        </h3>
                        <p className="text-xs text-gray-500">{t('admin.feedback.timezoneLabel', { timezone: merchant?.timezone || 'Asia/Jakarta' })}</p>
                    </div>
                    {analytics?.recentTrends && analytics.recentTrends.length > 0 ? (
                        <ReactApexChart
                            options={trendChartOptions}
                            series={[{
                                name: t('admin.feedback.ratingSeries'),
                                data: analytics.recentTrends.map(d => d.averageRating),
                            }]}
                            type="area"
                            height={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-62.5">
                            <p className="text-sm text-gray-500">{t('admin.feedback.noTrendData')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Tags */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('admin.feedback.topTags')}
                </h3>
                {analytics?.topTags?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {analytics.topTags.map((tag) => (
                            <span
                                key={tag.tag}
                                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                                {t(`admin.feedback.tag.${tag.tag}`) || tag.tag} · {tag.count}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">{t('admin.feedback.noTags')}</p>
                )}
            </div>

            {/* Feedback List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('admin.feedback.recentFeedback')}
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
                            <option value="">{t('admin.feedback.allRatings')}</option>
                            {[5, 4, 3, 2, 1].map(r => (
                                <option key={r} value={r}>
                                    {t('admin.feedback.ratingOption', { rating: r })}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleExport('csv')}
                            className="ml-2 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            {t('admin.feedback.exportCsv')}
                        </button>
                        <button
                            onClick={() => handleExport('xlsx')}
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            {t('admin.feedback.exportXlsx')}
                        </button>
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
                                                    {t('admin.feedback.orderLabel', {
                                                        orderNumber: formatFullOrderNumber(feedback.orderNumber, merchant?.code),
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(feedback.createdAt)}
                                                {feedback.orderCompletionMinutes && (
                                                    <span className="ml-2">
                                                        • {t('admin.feedback.completedIn', { minutes: feedback.orderCompletionMinutes })}
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
                                                    <FaUtensils className="text-brand-400" />
                                                    {feedback.foodRating}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {feedback.sentiment && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    feedback.sentiment === 'positive'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                                                        : feedback.sentiment === 'negative'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200'
                                                }`}
                                            >
                                                {t(`admin.feedback.sentiment.${feedback.sentiment}`)}
                                            </span>
                                            {feedback.tags?.map((tag) => (
                                                <span key={tag} className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                                    {t(`admin.feedback.tag.${tag}`) || tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
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
                        <p className="text-sm text-gray-500">{t('admin.feedback.noFeedbackYet')}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {t('admin.feedback.noFeedbackHint')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
