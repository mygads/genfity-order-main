"use client";

import { useSidebar } from "@/context/SidebarContext";
import { MerchantProvider } from "@/context/MerchantContext";
import { ToastProvider } from "@/context/ToastContext";
import { AdminLanguageProvider } from "@/context/LanguageContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import SessionGuard from "@/components/auth/SessionGuard";
import SubscriptionAlerts from "@/components/subscription/SubscriptionAlerts";
import { useSessionSync } from "@/hooks/useSessionSync";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuth } from "@/hooks/useAuth";
import SWRProvider from "@/lib/providers/SWRProvider";
import { TutorialProvider, TutorialSpotlight, ContextualHintProvider, TipsOfTheDay } from "@/lib/tutorial";
import React from "react";

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

  // Only check subscription status for merchant users
  const isMerchantUser = user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF';
  const { isSuspended } = useSubscriptionStatus();

  // Sync session with server on page load/refresh
  useSessionSync();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  // Only show padding if merchant user is suspended
  const showSuspendedBannerPadding = isMerchantUser && isSuspended;

  // Get user permissions from localStorage (same as useAuth hook)
  const userPermissions = React.useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('userPermissions');
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

          {/* Sidebar and Backdrop */}
          <AppSidebar />
          <Backdrop />

          {/* Tutorial Spotlight Overlay */}
          <TutorialSpotlight />

          {/* Tips of the Day - Shows daily rotating tips */}
          <TipsOfTheDay position="bottom-right" delayMs={3000} />

          {/* Main Content Area */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            {/* Subscription Alerts - Fixed at top when suspended */}
            <SubscriptionAlerts />

            {/* Header - Add top padding when suspended alert is shown */}
            <div className={showSuspendedBannerPadding ? "pt-[72px]" : ""}>
              <AppHeader />
            </div>

            {/* Page Content - Add top padding for fixed header (h-[56px] on mobile, h-[64px] on lg) */}
            <div className="pt-[70px] md:pt-[80px] lg:pt-[80px] p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 overflow-x-hidden">
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
