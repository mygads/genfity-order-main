// Custom types based on Prisma schema
import StoreToggleButton from './StoreToggleButton';
import Link from 'next/link';
import Image from 'next/image';
import { isStoreEffectivelyOpen, type OpeningHour } from '@/lib/utils/storeStatus';
import { formatFullOrderNumber } from '@/lib/utils/format';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SetupProgress } from '@/lib/tutorial';
import {
  FaDollarSign,
  FaClock,
  FaShoppingBag,
  FaChartLine,
  FaUtensils,
  FaTags,
  FaUsers,
  FaClipboardList,
  FaExclamationTriangle,
  FaCheckCircle,
  FaChartBar,
  FaUserTie,
  FaFileAlt,
  FaTrophy,
  FaMedal,
  FaAward,
} from 'react-icons/fa';

type Merchant = {
  id: bigint;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  isOpen?: boolean;
  isManualOverride?: boolean;
  openingHours?: OpeningHour[];
  timezone?: string;
  currency?: string;
};

type Menu = {
  id: bigint;
  name: string;
  price: number | { toString(): string }; // Decimal
  imageUrl?: string | null;
};

type OrderItem = {
  id: bigint;
  quantity: number;
  menuPrice: number | { toString(): string }; // Decimal
  menu: Menu;
};

type Order = {
  id: bigint;
  orderNumber: string;
  status: string;
  totalAmount: number | { toString(): string }; // Decimal
  createdAt: Date;
  orderItems: OrderItem[];
};

interface MerchantOwnerDashboardProps {
  merchant: Merchant;
  stats: {
    totalMenuItems: number;
    activeMenuItems: number;
    totalCategories: number;
    totalStaff: number;
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    todayRevenue: number;
  };
  analytics?: {
    range: {
      startDate: string;
      endDate: string;
      timezone: string;
    };
    revenueByDate: Array<{
      date: string;
      revenue: number;
      orderCount: number;
      scheduledCount: number;
      completedCount: number;
    }>;
    customersByDate?: Array<{
      date: string;
      activeCustomers: number;
      newCustomers: number;
    }>;
    growth?: {
      ordersPrev7Days: number;
      ordersLast7Days: number;
      ordersGrowthPct: number | null;
      newCustomersPrev7Days: number;
      newCustomersLast7Days: number;
      newCustomersGrowthPct: number | null;
    };
    kpis: {
      scheduledOrdersToday: number;
      avgOrderValueToday: number;
      projectedRevenueToday: number;
      projectedOrdersToday?: number;
      avgOverallRating30d?: number | null;
      totalFeedback30d?: number;
      badReviewsCount7d?: number;
      badReviewsCount30d?: number;
    };
    alerts?: {
      recentBadReviews?: Array<{
        id: string | bigint;
        orderNumber: string;
        overallRating: number;
        comment?: string | null;
        createdAt: string | Date;
      }>;
    };
  };
  recentOrders: Array<
    Order & {
      orderItems: Array<OrderItem & { menu: Menu }>;
    }
  >;
  topSellingItems: Array<{
    menuId: bigint;
    menuName: string;
    menuImageUrl?: string | null;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  lowStockItems: Array<{
    id: bigint;
    name: string;
    stockQty: number | null;
    price: number | { toString(): string };
    imageUrl?: string | null;
  }>;
}

/**
 * GENFITY Merchant Owner Dashboard Component
 * 
 * Professional, modern dashboard with enhanced UI/UX
 * - Currency: AUD (A$)
 * - Real order numbers
 * - Menu item images
 * - Gradient cards and animations
 */
export default function MerchantOwnerDashboard({
  merchant,
  stats,
  analytics,
  recentOrders,
  topSellingItems,
  lowStockItems,
}: MerchantOwnerDashboardProps) {
  const { t } = useTranslation();
  
  const formatCurrency = (amount: number) => {
    const currency = merchant.currency || 'AUD';
    if (currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }
    // Default: AUD
    return `A$${amount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'READY':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Calculate effective store status (considering schedule and manual override)
  const effectivelyOpen = isStoreEffectivelyOpen({
    isOpen: merchant.isOpen,
    isManualOverride: merchant.isManualOverride,
    openingHours: merchant.openingHours,
    timezone: merchant.timezone,
  });

  const formatGrowthPct = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined || !Number.isFinite(pct)) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  const rangeEndDate = analytics?.range?.endDate;
  const customersToday = rangeEndDate
    ? analytics?.customersByDate?.find((d) => d.date === rangeEndDate)
    : undefined;

  const badReviews7d = analytics?.kpis?.badReviewsCount7d ?? 0;
  const avgRating30d = analytics?.kpis?.avgOverallRating30d ?? null;
  const totalFeedback30d = analytics?.kpis?.totalFeedback30d ?? 0;
  const recentBadReviews = analytics?.alerts?.recentBadReviews ?? [];

  return (
    <div className="space-y-6">
      {/* Setup Progress - Horizontal steps for new merchants (auto-hides when complete) */}
      <SetupProgress />

      {/* Merchant Header - Clean Design */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {merchant.logoUrl ? (
              <Image
                src={merchant.logoUrl}
                alt={merchant.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-xl font-bold text-gray-600 dark:text-gray-400">
                {merchant.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {merchant.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {merchant.code}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {merchant.city || 'No city'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${effectivelyOpen
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${effectivelyOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  {effectivelyOpen ? t('common.open') : t('common.closed')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StoreToggleButton
              initialIsOpen={merchant.isOpen ?? true}
              initialIsManualOverride={merchant.isManualOverride ?? false}
              effectivelyOpen={effectivelyOpen}
              merchantId={merchant.id.toString()}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics - Clean Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Today's Revenue */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <FaDollarSign className="w-5 h-5 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.todayOrders} orders
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.todayRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.todaysRevenue')}</p>
        </div>

        {/* Pending Orders */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <FaClock className="w-5 h-5 text-amber-500" />
            {stats.pendingOrders > 0 && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {stats.pendingOrders}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.pendingOrders')}</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <FaShoppingBag className="w-5 h-5 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalOrders.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.totalOrders')}</p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <FaChartLine className="w-5 h-5 text-purple-500" />
          </div>
          <p className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.totalRevenue')}</p>
        </div>
      </div>

      {/* Growth Snapshot */}
      {analytics?.growth ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Orders (last 7 days)</p>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {formatGrowthPct(analytics.growth.ordersGrowthPct)}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.growth.ordersLast7Days.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Prev 7d: {analytics.growth.ordersPrev7Days.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">New customers (last 7 days)</p>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {formatGrowthPct(analytics.growth.newCustomersGrowthPct)}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.growth.newCustomersLast7Days.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Prev 7d: {analytics.growth.newCustomersPrev7Days.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Active customers (today)</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {(customersToday?.activeCustomers ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Unique customers who ordered</p>
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg rating (last 30 days)</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {avgRating30d === null ? '—' : avgRating30d.toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {totalFeedback30d.toLocaleString()} feedback • {badReviews7d} bad (7d)
            </p>
          </div>
        </div>
      ) : null}

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Menu Items */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <FaUtensils className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalMenuItems}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.menuItems')}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <FaTags className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalCategories}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.categories')}</p>
            </div>
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <FaUsers className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalStaff}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.teamMembers')}</p>
            </div>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <FaClipboardList className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.todayOrders}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.todaysOrders')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders & Top Selling */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.recentOrders')}
            </h3>
            <Link
              href="/admin/dashboard/orders/history"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t('common.viewAll')} →
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order) => (
              <div
                key={order.id.toString()}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      #{formatFullOrderNumber(order.orderNumber, merchant.code)}
                    </p>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(order.createdAt)} • {order.orderItems.length} item{order.orderItems.length > 1 ? 's' : ''}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount))}
                </p>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="py-8 text-center">
                <FaClipboardList className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.noOrdersYet')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.topSelling')}
            </h3>
            <span className="text-xs text-gray-400">{t('admin.dashboard.last30Days')}</span>
          </div>
          <div className="space-y-2">
            {topSellingItems.map((item, index) => (
              <div
                key={item.menuId.toString()}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Rank */}
                <div className="shrink-0">
                  {index === 0 ? (
                    <FaTrophy className="w-5 h-5 text-amber-500" />
                  ) : index === 1 ? (
                    <FaMedal className="w-5 h-5 text-gray-400" />
                  ) : index === 2 ? (
                    <FaAward className="w-5 h-5 text-orange-400" />
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-400">{index + 1}</span>
                  )}
                </div>

                {/* Menu Image */}
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  {item.menuImageUrl ? (
                    <Image
                      src={item.menuImageUrl}
                      alt={item.menuName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FaUtensils className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {item.menuName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.totalQuantity} {t('admin.dashboard.sold')}
                  </p>
                </div>

                {/* Revenue */}
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {formatCurrency(item.totalRevenue)}
                </p>
              </div>
            ))}
            {topSellingItems.length === 0 && (
              <div className="py-8 text-center">
                <FaChartBar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.noSalesDataYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customers & Low Stock */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Customer Feedback Alert */}
          <div className={`rounded-xl bg-white dark:bg-gray-900 border p-4 sm:p-6 ${badReviews7d > 0
            ? 'border-red-200 dark:border-red-900/40'
            : 'border-gray-200 dark:border-gray-800'
            }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Customer feedback</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Monitor ratings and follow up on poor experiences
                </p>
              </div>
              <Link
                href="/admin/dashboard/customer-feedback"
                className="text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              >
                View all →
              </Link>
            </div>

            {badReviews7d > 0 ? (
              <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {badReviews7d} bad review{badReviews7d > 1 ? 's' : ''} in the last 7 days
                </p>
                <div className="mt-3 space-y-2">
                  {recentBadReviews.slice(0, 3).map((r) => (
                    <div key={String(r.id)} className="rounded-md bg-white/70 dark:bg-gray-900/30 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          Order #{formatFullOrderNumber(r.orderNumber, merchant.code)}
                        </p>
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                          {r.overallRating}/5
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {r.comment?.trim() ? `“${r.comment.trim()}”` : 'No comment provided'}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {formatDate(new Date(r.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 p-4">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">No bad reviews in the last 7 days</p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Keep an eye on feedback to maintain quality.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.lowStockAlert')}
            </h3>
            {lowStockItems.length > 0 && (
              <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                {lowStockItems.length} items
              </span>
            )}
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div
                key={item.id.toString()}
                className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20"
              >
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(typeof item.price === 'number' ? item.price : Number(item.price))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {item.stockQty || 0}
                  </p>
                  <p className="text-xs text-amber-500">
                    {t('admin.dashboard.left')}
                  </p>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 p-4 text-center">
                <FaCheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {t('admin.dashboard.allItemsSufficientStock')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          {t('admin.dashboard.quickActions')}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <Link
            href="/admin/dashboard/orders/queue"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FaClipboardList className="w-5 h-5 text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.orderQueue')}</span>
          </Link>
          <Link
            href="/admin/dashboard/menu"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FaUtensils className="w-5 h-5 text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.manageMenu')}</span>
          </Link>
          <Link
            href="/admin/dashboard/staff"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FaUserTie className="w-5 h-5 text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.manageStaff')}</span>
          </Link>
          <Link
            href="/admin/dashboard/reports"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FaFileAlt className="w-5 h-5 text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.viewReports')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
