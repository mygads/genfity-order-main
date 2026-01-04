/**
 * Subscription Analytics Page (Super Admin Only)
 * Route: /admin/dashboard/subscription-analytics
 * Access: SUPER_ADMIN only
 * 
 * Displays subscription metrics:
 * - Overview: total merchants, active, trial, deposit, monthly, suspended
 * - Conversion rates: trial to paid, churn rate
 * - Revenue: MRR, ARR, total deposits
 * - Trends: new trials, conversions, churns this month
 * - 6-month timeline chart
 */

'use client';

import { useState, useEffect } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LineChart from '@/components/charts/line/LineChart';

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
        mrr: number;
        arr: number;
        totalDeposits: number;
        avgDepositAmount: number;
        totalOrderFees: number;
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
    eventHistory?: {
        eventCounts: Record<string, number>;
        dailyEvents: Record<string, Record<string, number>>;
        recentEvents: Array<{
            id: string;
            merchantId: string;
            eventType: string;
            previousType: string | null;
            newType: string | null;
            reason: string | null;
            createdAt: string;
        }>;
    };
}

function formatCurrency(amount: number, currency: string = 'IDR'): string {
    const locale = currency === 'AUD' ? 'en-AU' : 'id-ID';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Event type display helper
function getEventTypeDisplay(eventType: string): { label: string; color: string; bgColor: string } {
    const eventMap: Record<string, { label: string; color: string; bgColor: string }> = {
        'CREATED': { label: 'Created', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        'TRIAL_EXPIRED': { label: 'Trial Expired', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
        'AUTO_SWITCHED': { label: 'Auto Switch', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
        'SUSPENDED': { label: 'Suspended', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
        'REACTIVATED': { label: 'Reactivated', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
        'PAYMENT_RECEIVED': { label: 'Payment', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
        'PAYMENT_REJECTED': { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
        'ORDER_FEE_DEDUCTED': { label: 'Fee Deducted', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
        'MANUAL_ADJUSTMENT': { label: 'Adjustment', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    };
    return eventMap[eventType] || { label: eventType, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Stat Card Component
function StatCard({
    title,
    value,
    subtitle,
    icon,
    color = 'blue',
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Progress Bar Component
function ProgressBar({
    label,
    value,
    total,
    color = 'blue',
}: {
    label: string;
    value: number;
    total: number;
    color?: string;
}) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
    };

    return (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {value} ({percentage}%)
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full ${colorMap[color] || 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

export default function SubscriptionAnalyticsPage() {
    const { t } = useTranslation();
    const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = getAdminToken();
                const response = await fetch('/api/admin/analytics/subscription', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (data.success) {
                    setMetrics(data.data);
                } else {
                    setError(data.error || 'Failed to load metrics');
                }
            } catch (err) {
                setError('Network error');
                console.error('Failed to fetch subscription analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle={t('subscription.analytics.title')} />
                <div className="animate-pulse space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-gray-200 dark:bg-gray-700 h-28 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-xl"></div>
                        <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle={t('subscription.analytics.title')} />
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
                    {error || 'Failed to load subscription analytics'}
                </div>
            </div>
        );
    }

    // Prepare timeline data for LineChart component format
    const timelineChartData = metrics.timeline.map(item => ({
        label: item.month,
        value: item.newTrials + item.conversions, // Combined new activity
    }));

    const activeChartData = metrics.timeline.map(item => ({
        label: item.month,
        value: item.activeEnd,
    }));

    return (
        <div className="p-6 space-y-6">
            <PageBreadcrumb pageTitle={t('subscription.analytics.title')} />

            {/* Overview Stats */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('subscription.analytics.overview')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title={t('subscription.analytics.totalMerchants')}
                        value={metrics.overview.totalMerchants}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                        color="blue"
                    />
                    <StatCard
                        title={t('subscription.analytics.activeMerchants')}
                        value={metrics.overview.activeMerchants}
                        subtitle={`${Math.round((metrics.overview.activeMerchants / metrics.overview.totalMerchants) * 100)}% of total`}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        color="green"
                    />
                    <StatCard
                        title={t('subscription.analytics.trialMerchants')}
                        value={metrics.overview.trialMerchants}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        color="yellow"
                    />
                    <StatCard
                        title={t('subscription.analytics.suspended')}
                        value={metrics.overview.suspendedMerchants}
                        subtitle={metrics.overview.inGracePeriod > 0 ? `${metrics.overview.inGracePeriod} ${t('subscription.analytics.inGrace')}` : undefined}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                        color="red"
                    />
                </div>
            </section>

            {/* Subscription Type Distribution */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Type Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('subscription.analytics.typeDistribution')}
                    </h3>
                    <ProgressBar
                        label={t('subscription.analytics.trial')}
                        value={metrics.overview.trialMerchants}
                        total={metrics.overview.totalMerchants}
                        color="yellow"
                    />
                    <ProgressBar
                        label={t('subscription.analytics.deposit')}
                        value={metrics.overview.depositMerchants}
                        total={metrics.overview.totalMerchants}
                        color="blue"
                    />
                    <ProgressBar
                        label={t('subscription.analytics.monthly')}
                        value={metrics.overview.monthlyMerchants}
                        total={metrics.overview.totalMerchants}
                        color="green"
                    />
                    <ProgressBar
                        label={t('subscription.analytics.suspended')}
                        value={metrics.overview.suspendedMerchants}
                        total={metrics.overview.totalMerchants}
                        color="red"
                    />
                </div>

                {/* Conversion Metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('subscription.analytics.conversionMetrics')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">{t('subscription.analytics.trialToDeposit')}</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{metrics.conversion.trialToDeposit}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">{t('subscription.analytics.trialToMonthly')}</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{metrics.conversion.trialToMonthly}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">{t('subscription.analytics.overallConversion')}</span>
                            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{metrics.conversion.overallConversionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">{t('subscription.analytics.churnRate')}</span>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">{metrics.conversion.trialChurnRate}%</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Revenue Stats */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('subscription.analytics.revenueMetrics')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        title={t('subscription.analytics.mrr')}
                        value={formatCurrency(metrics.revenue.mrr, metrics.revenue.currency)}
                        subtitle={t('subscription.analytics.mrrSubtitle')}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        color="green"
                    />
                    <StatCard
                        title={t('subscription.analytics.arr')}
                        value={formatCurrency(metrics.revenue.arr, metrics.revenue.currency)}
                        subtitle={t('subscription.analytics.arrSubtitle')}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        color="purple"
                    />
                    <StatCard
                        title={t('subscription.analytics.totalDeposits')}
                        value={formatCurrency(metrics.revenue.totalDeposits, metrics.revenue.currency)}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                        color="blue"
                    />
                    <StatCard
                        title="Order Fees"
                        value={formatCurrency(metrics.revenue.totalOrderFees || 0, metrics.revenue.currency)}
                        subtitle="Total collected"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        color="yellow"
                    />
                    <StatCard
                        title={t('subscription.analytics.avgDeposit')}
                        value={formatCurrency(metrics.revenue.avgDepositAmount, metrics.revenue.currency)}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
                        color="orange"
                    />
                </div>
            </section>

            {/* Revenue Trends Chart */}
            {metrics.revenueTrends && metrics.revenueTrends.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Revenue Trends (6 Months)
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Total Revenue Chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                                Total Revenue
                            </h3>
                            <div className="h-64">
                                <LineChart 
                                    data={metrics.revenueTrends.map(item => ({
                                        label: item.month,
                                        value: item.totalRevenue,
                                    }))}
                                    height={250}
                                    color="#10b981"
                                    title="Revenue"
                                />
                            </div>
                        </div>

                        {/* Revenue Breakdown Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                                Revenue Breakdown
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-2 text-gray-500 dark:text-gray-400">Month</th>
                                            <th className="text-right py-2 text-gray-500 dark:text-gray-400">Deposits</th>
                                            <th className="text-right py-2 text-gray-500 dark:text-gray-400">Order Fees</th>
                                            <th className="text-right py-2 text-gray-500 dark:text-gray-400">Monthly Subs</th>
                                            <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.revenueTrends.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                                                <td className="py-2 text-gray-900 dark:text-gray-100">{item.month}</td>
                                                <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                                                    {formatCurrency(item.deposits, metrics.revenue.currency)}
                                                </td>
                                                <td className="py-2 text-right text-yellow-600 dark:text-yellow-400">
                                                    {formatCurrency(item.orderFees, metrics.revenue.currency)}
                                                </td>
                                                <td className="py-2 text-right text-green-600 dark:text-green-400">
                                                    {formatCurrency(item.monthlySubscriptions, metrics.revenue.currency)}
                                                </td>
                                                <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(item.totalRevenue, metrics.revenue.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Trends This Month */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('subscription.analytics.trendsThisMonth')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            +{metrics.trends.newTrialsThisMonth}
                        </p>
                        <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1">
                            {t('subscription.analytics.newTrials')}
                        </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            +{metrics.trends.conversionsThisMonth}
                        </p>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                            {t('subscription.analytics.conversions')}
                        </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                            -{metrics.trends.churnsThisMonth}
                        </p>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                            {t('subscription.analytics.churns')}
                        </p>
                    </div>
                    <div className={`rounded-xl p-6 text-center ${metrics.trends.netGrowth >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <p className={`text-3xl font-bold ${metrics.trends.netGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {metrics.trends.netGrowth >= 0 ? '+' : ''}{metrics.trends.netGrowth}
                        </p>
                        <p className={`text-sm mt-1 ${metrics.trends.netGrowth >= 0 ? 'text-green-600/80 dark:text-green-400/80' : 'text-red-600/80 dark:text-red-400/80'}`}>
                            {t('subscription.analytics.netGrowth')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Timeline Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('subscription.analytics.subscriptionTimeline')}
                    </h3>
                    <div className="h-64">
                        <LineChart 
                            data={timelineChartData}
                            height={250}
                            color="#3b82f6"
                            title={t('subscription.analytics.newActivity')}
                        />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('subscription.analytics.activeMerchantsOverTime')}
                    </h3>
                    <div className="h-64">
                        <LineChart 
                            data={activeChartData}
                            height={250}
                            color="#8b5cf6"
                        />
                    </div>
                </div>
            </section>

            {/* Subscription Event History */}
            {metrics.eventHistory && (
                <section className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('subscription.analytics.eventHistory')}
                    </h2>
                    
                    {/* Event Type Counts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                            {t('subscription.analytics.eventCounts')} ({t('subscription.analytics.last30Days')})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {Object.entries(metrics.eventHistory.eventCounts).map(([eventType, count]) => {
                                const display = getEventTypeDisplay(eventType);
                                return (
                                    <div key={eventType} className={`${display.bgColor} rounded-lg p-4 text-center`}>
                                        <p className={`text-2xl font-bold ${display.color}`}>{count}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{display.label}</p>
                                    </div>
                                );
                            })}
                            {Object.keys(metrics.eventHistory.eventCounts).length === 0 && (
                                <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-4">
                                    {t('subscription.analytics.noEventsYet')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recent Events Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white">
                                {t('subscription.analytics.recentEvents')}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('subscription.analytics.time')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('subscription.analytics.event')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('subscription.analytics.merchantId')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('subscription.analytics.change')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('subscription.analytics.reason')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {metrics.eventHistory.recentEvents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                {t('subscription.analytics.noEventsYet')}
                                            </td>
                                        </tr>
                                    ) : (
                                        metrics.eventHistory.recentEvents.map((event) => {
                                            const display = getEventTypeDisplay(event.eventType);
                                            return (
                                                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatRelativeTime(event.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${display.bgColor} ${display.color}`}>
                                                            {display.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                                                        #{event.merchantId}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                        {event.previousType && event.newType ? (
                                                            <span>
                                                                <span className="text-gray-400">{event.previousType}</span>
                                                                <span className="mx-2">→</span>
                                                                <span className="font-medium">{event.newType}</span>
                                                            </span>
                                                        ) : event.newType ? (
                                                            <span className="font-medium">{event.newType}</span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={event.reason || ''}>
                                                        {event.reason || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
