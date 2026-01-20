"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { MerchantProvider } from "@/context/MerchantContext";
import { ToastProvider } from "@/context/ToastContext";
import { AdminLanguageProvider } from "@/context/LanguageContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import SessionGuard from "@/components/auth/SessionGuard";
import SubscriptionAlerts from "@/components/subscription/SubscriptionAlerts";
import AdminOrderAlertListener from "@/components/notifications/AdminOrderAlertListener";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { useSessionSync } from "@/hooks/useSessionSync";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuth } from "@/hooks/useAuth";
import { useMerchant } from "@/context/MerchantContext";
import SWRProvider from "@/lib/providers/SWRProvider";
import { TutorialProvider, TutorialSpotlight, ContextualHintProvider, TipsOfTheDay } from "@/lib/tutorial";
import { useTranslation } from "@/lib/i18n/useTranslation";
import React from "react";
import MerchantInactiveAlert from "@/components/merchants/MerchantInactiveAlert";

/**
 * Admin Dashboard Layout
 * 
 * @description
 * Layout wrapper for all admin dashboard pages with SWR provider
 * 
 * Features:
 * - SWR for data caching and real-time updates
 * - Responsive sidebar with expand/collapse
 * - Auto session sync
 * - Page transitions ready
 * - Global toast notifications
 * - Multi-language support (EN/ID)
 * - Subscription alerts (trial/suspended banners)
 * 
 * @specification
 * - Uses AppSidebar from template with expand/collapse functionality
 * - Uses AppHeader from template with search and notifications
 * - Responsive margin adjustment based on sidebar state
 * - Mobile-friendly with backdrop overlay
 * - Auto-syncs session with server on page load
 */

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user } = useAuth();
  const { merchant } = useMerchant();
  const pathname = usePathname();
  const { t } = useTranslation();

  // Only check subscription status for merchant users
  const isMerchantUser = user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF';
  const { isSuspended } = useSubscriptionStatus();
  const isMerchantInactive = isMerchantUser && merchant?.isActive === false;
  const isLocked = isMerchantUser && (isSuspended || isMerchantInactive);
  const isLockExemptPath = pathname?.startsWith('/admin/dashboard/subscription');

  // Sync session with server on page load/refresh
  useSessionSync();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  // Only show padding if merchant user has a fixed banner
  const showSuspendedBannerPadding = isMerchantUser && (isSuspended || isMerchantInactive);

  // Some pages need more horizontal space (e.g., Orders tab/list views)
  const isFullWidthPage = pathname?.startsWith('/admin/dashboard/orders');
  const wrapLockedContent = (node: React.ReactNode) => {
    if (!isLocked || isLockExemptPath) return <>{node}</>;

    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-50 grayscale">
          {node}
        </div>
        <div className="absolute inset-0 z-10 flex items-start justify-center p-4">
          <div className="mt-2 w-full max-w-2xl rounded-xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('admin.dashboard.locked.title')}</p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{t('admin.dashboard.locked.message')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get user permissions from localStorage (same as useAuth hook)
  const userPermissions = React.useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('staffPermissions') || localStorage.getItem('userPermissions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <TutorialProvider
      userId={user?.id?.toString()}
      userRole={user?.role as 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'SUPER_ADMIN' | 'CUSTOMER'}
      userPermissions={userPermissions}
    >
      <ContextualHintProvider>
        <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-900">
          {/* Session Guard - Auto logout on token expiry */}
          <SessionGuard />

          {/* Permission Guard - Redirect staff away from restricted pages */}
          <PermissionGuard />

          {/* Global admin alerts (sound + push sync for new orders) */}
          <AdminOrderAlertListener />

          {/* Sidebar and Backdrop */}
          <AppSidebar />
          <Backdrop />

          {/* Tutorial Spotlight Overlay */}
          <TutorialSpotlight />

          {/* Tips of the Day - Shows daily rotating tips */}
          <TipsOfTheDay position="bottom-right" delayMs={3000} />

          {/* Main Content Area */}
          <div
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            {/* Subscription Alerts - Fixed at top when suspended */}
            {isMerchantInactive ? <MerchantInactiveAlert /> : <SubscriptionAlerts />}

            {/* Header - Add top padding when suspended alert is shown */}
            <div className={showSuspendedBannerPadding ? 'pt-18' : ''}>
              <AppHeader />
            </div>

            {/* Page Content - Add top padding for fixed header (h-[56px] on mobile, h-[64px] on lg) */}
            <div
              className={
                isFullWidthPage
                  ? 'pt-17.5 md:pt-20 lg:pt-20 p-4 md:p-6 overflow-x-hidden w-full max-w-none min-w-0'
                  : 'pt-17.5 md:pt-20 lg:pt-20 p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 overflow-x-hidden min-w-0'
              }
            >
              {wrapLockedContent(children)}
            </div>
          </div>
        </div>
      </ContextualHintProvider>
    </TutorialProvider>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <MerchantProvider>
        <AdminLanguageProvider>
          <ToastProvider>
            <DashboardContent>{children}</DashboardContent>
          </ToastProvider>
        </AdminLanguageProvider>
      </MerchantProvider>
    </SWRProvider>
  );
}
