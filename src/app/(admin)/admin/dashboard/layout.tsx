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

  // Only check subscription status for merchant users
  const isMerchantUser = user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF';
  const { isSuspended } = useSubscriptionStatus();
  const isMerchantInactive = isMerchantUser && merchant?.isActive === false;

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
              {children}
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
