"use client";

import { useSidebar } from "@/context/SidebarContext";
import { MerchantProvider } from "@/context/MerchantContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import SessionGuard from "@/components/auth/SessionGuard";
import { useSessionSync } from "@/hooks/useSessionSync";
import SWRProvider from "@/lib/providers/SWRProvider";
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
 * 
 * @specification
 * - Uses AppSidebar from template with expand/collapse functionality
 * - Uses AppHeader from template with search and notifications
 * - Responsive margin adjustment based on sidebar state
 * - Mobile-friendly with backdrop overlay
 * - Auto-syncs session with server on page load
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Sync session with server on page load/refresh
  useSessionSync();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <SWRProvider>
      <MerchantProvider>
        <div className="min-h-screen xl:flex">
          {/* Session Guard - Auto logout on token expiry */}
          <SessionGuard />
          
          {/* Sidebar and Backdrop */}
          <AppSidebar />
          <Backdrop />
          
          {/* Main Content Area */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            {/* Header */}
            <AppHeader />
            
            {/* Page Content */}
            <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
              {children}
            </div>
          </div>
        </div>
      </MerchantProvider>
    </SWRProvider>
  );
}
