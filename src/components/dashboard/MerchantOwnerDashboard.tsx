// Custom types based on Prisma schema
import StoreToggleButton from './StoreToggleButton';
import Link from 'next/link';
import Image from 'next/image';
import { isStoreEffectivelyOpen, type OpeningHour } from '@/lib/utils/storeStatus';
import { useTranslation } from '@/lib/i18n/useTranslation';

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
  recentOrders,
  topSellingItems,
  orderStatusBreakdown,
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

  return (
    <div className="space-y-6">
      {/* Merchant Header with Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 shadow-xl shadow-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {merchant.logoUrl ? (
              <Image
                src={merchant.logoUrl}
                alt={merchant.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-2xl font-bold text-white">
                {merchant.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">
                {merchant.name}
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-sm text-white/80">
                  {merchant.code} • {merchant.city || 'No city'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${effectivelyOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-red-500/20 text-red-100'
                }`}>
                  <div className={`h-2 w-2 rounded-full ${effectivelyOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  {effectivelyOpen ? t('common.open') : t('common.closed')}
                  {merchant.isManualOverride && (
                    <span className="ml-1 text-[10px] opacity-80">
                      (Manual)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <StoreToggleButton
            initialIsOpen={merchant.isOpen ?? true}
            initialIsManualOverride={merchant.isManualOverride ?? false}
            effectivelyOpen={effectivelyOpen}
            merchantId={merchant.id.toString()}
          />
        </div>
      </div>

      {/* Key Metrics - Primary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Today's Revenue */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30">
          <div className="relative z-10">
            <p className="text-sm font-medium text-emerald-100">{t('admin.dashboard.todaysRevenue')}</p>
            <h3 className="mt-1 text-2xl font-bold text-white lg:text-3xl">
              {formatCurrency(stats.todayRevenue)}
            </h3>
            <p className="mt-1 text-xs text-emerald-200">
              {stats.todayOrders} {t('admin.dashboard.ordersToday')}
            </p>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-110"></div>
          <svg className="absolute bottom-3 right-3 h-8 w-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
          </svg>
        </div>

        {/* Pending Orders - Attention Required */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30">
          <div className="relative z-10">
            <p className="text-sm font-medium text-amber-100">{t('admin.dashboard.pendingOrders')}</p>
            <h3 className="mt-1 text-2xl font-bold text-white lg:text-3xl">
              {stats.pendingOrders}
            </h3>
            <p className="mt-1 text-xs text-amber-200">
              {t('admin.dashboard.needsAttention')}
            </p>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-110"></div>
          {stats.pendingOrders > 0 && (
            <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-white animate-ping"></div>
          )}
          <svg className="absolute bottom-3 right-3 h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Total Orders */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30">
          <div className="relative z-10">
            <p className="text-sm font-medium text-blue-100">{t('admin.dashboard.totalOrders')}</p>
            <h3 className="mt-1 text-2xl font-bold text-white lg:text-3xl">
              {stats.totalOrders.toLocaleString()}
            </h3>
            <p className="mt-1 text-xs text-blue-200">
              {t('admin.dashboard.allTime')}
            </p>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-110"></div>
          <svg className="absolute bottom-3 right-3 h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>

        {/* Total Revenue */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-5 shadow-lg shadow-purple-500/20 transition-all hover:shadow-xl hover:shadow-purple-500/30">
          <div className="relative z-10">
            <p className="text-sm font-medium text-purple-100">{t('admin.dashboard.totalRevenue')}</p>
            <h3 className="mt-1 text-xl font-bold text-white lg:text-2xl">
              {formatCurrency(stats.totalRevenue)}
            </h3>
            <p className="mt-1 text-xs text-purple-200">
              {t('admin.dashboard.allTimeEarnings')}
            </p>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-110"></div>
          <svg className="absolute bottom-3 right-3 h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Menu Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.menuItems')}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMenuItems}</h3>
              <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">{stats.activeMenuItems} {t('admin.dashboard.activeMenus')}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.categories')}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCategories}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.menuGroups')}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.teamMembers')}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStaff}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.activeStaff')}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.todaysOrders')}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.todayOrders}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.ordersReceived')}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders & Top Selling */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Opening Hours Preview */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('admin.dashboard.openingHours')}
            </h3>
            <Link
              href="/admin/dashboard/merchant/edit"
              className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              {t('common.edit')}
            </Link>
          </div>
          <div className="space-y-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => {
              const hours = merchant.openingHours?.find(h => h.dayOfWeek === idx);
              const today = new Date().getDay();
              const isToday = idx === today;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between py-1.5 px-2 rounded ${isToday ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                >
                  <span className={`text-sm ${isToday ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {day}
                    {isToday && <span className="ml-1 text-xs">({t('common.time.today')})</span>}
                  </span>
                  <span className={`text-sm ${hours?.isClosed ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {hours?.isClosed
                      ? t('common.closed')
                      : hours?.openTime && hours?.closeTime
                        ? `${hours.openTime} - ${hours.closeTime}`
                        : t('common.notSet')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders - No Images */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.recentOrders')}
            </h3>
            <Link
              href="/admin/dashboard/orders/history"
              className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              {t('common.viewAll')} →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.slice(0, 5).map((order) => (
              <div
                key={order.id.toString()}
                className="group rounded-xl border border-gray-100 p-4 transition-all hover:border-orange-200 hover:bg-orange-50/50 dark:border-gray-800 dark:hover:border-orange-800 dark:hover:bg-orange-900/10"
              >
                <div className="flex items-center justify-between">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        #{order.orderNumber}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {formatDate(order.createdAt)} • {order.orderItems.length} item{order.orderItems.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.noOrdersYet')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Items - With Images */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.topSelling')}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.dashboard.last30Days')}</span>
          </div>
          <div className="space-y-3">
            {topSellingItems.map((item, index) => (
              <div
                key={item.menuId.toString()}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-purple-200 hover:bg-purple-50/50 dark:border-gray-800 dark:hover:border-purple-800 dark:hover:bg-purple-900/10"
              >
                {/* Rank Badge */}
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${index === 0
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white'
                  : index === 1
                    ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                    : index === 2
                      ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                  {index + 1}
                </div>

                {/* Menu Image */}
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                  {item.menuImageUrl ? (
                    <Image
                      src={item.menuImageUrl}
                      alt={item.menuName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <svg className="h-6 w-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {item.menuName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.totalQuantity} {t('admin.dashboard.sold')}
                  </p>
                </div>

                {/* Revenue */}
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(item.totalRevenue)}
                  </p>
                </div>
              </div>
            ))}
            {topSellingItems.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.noSalesDataYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Status & Low Stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order Status Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.dashboard.orderStatusOverview')}
          </h3>
          <div className="space-y-3">
            {orderStatusBreakdown.map((item) => {
              const percentage = stats.totalOrders > 0 ? (item.count / stats.totalOrders) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-500' :
                        item.status === 'PENDING' ? 'bg-amber-500' :
                          item.status === 'CANCELLED' ? 'bg-red-500' :
                            item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                              item.status === 'READY' ? 'bg-purple-500' :
                                'bg-gray-400'
                        }`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.status === 'COMPLETED' ? 'bg-emerald-500' :
                        item.status === 'PENDING' ? 'bg-amber-500' :
                          item.status === 'CANCELLED' ? 'bg-red-500' :
                            item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                              item.status === 'READY' ? 'bg-purple-500' :
                                'bg-gray-400'
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {orderStatusBreakdown.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('admin.dashboard.noOrdersYet')}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.dashboard.lowStockAlert')}
            </h3>
            {lowStockItems.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {lowStockItems.length} items
              </span>
            )}
          </div>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id.toString()}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20"
              >
                <div className="flex items-center gap-3">
                  {/* Menu Image */}
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                        <svg className="h-6 w-6 text-amber-400 dark:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(typeof item.price === 'number' ? item.price : Number(item.price))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {item.stockQty || 0}
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-500">
                    {t('admin.dashboard.left')}
                  </p>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-center dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {t('admin.dashboard.allItemsSufficientStock')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('admin.dashboard.quickActions')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/admin/dashboard/orders/queue"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-orange-300 hover:bg-orange-50 dark:border-gray-800 dark:hover:border-orange-700 dark:hover:bg-orange-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.orderQueue')}</span>
          </Link>
          <Link
            href="/admin/dashboard/menu"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-800 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.manageMenu')}</span>
          </Link>
          <Link
            href="/admin/dashboard/staff"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.manageStaff')}</span>
          </Link>
          <Link
            href="/admin/dashboard/reports"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dashboard.viewReports')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
