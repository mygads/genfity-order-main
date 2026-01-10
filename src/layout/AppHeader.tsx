"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { CurrencyBadge } from "@/components/common/CurrencyBadge";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import SearchDropdown from "@/components/header/SearchDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { HintPanelButton, HintPanel, useTutorialOptional } from "@/lib/tutorial";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { FaBars, FaTimes, FaEllipsisV, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const tutorialContext = useTutorialOptional();

  // Check if tutorial context is available (only for merchant users)
  const showTutorialHelp = tutorialContext && (user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF');

  const { isMobileOpen, isExpanded, isHovered, toggleSidebar, toggleMobileSidebar } = useSidebar();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  // Close application menu when clicking outside
  useEffect(() => {
    if (!isApplicationMenuOpen) return;
    const handleClickOutside = () => setApplicationMenuOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isApplicationMenuOpen]);

  const toggleApplicationMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // Calculate header content left padding based on sidebar state (desktop only)
  const headerContentPadding = isMobile
    ? "px-3 py-2"
    : isExpanded || isHovered
      ? "lg:pl-[290px] px-3 py-2 lg:px-6 lg:py-3"
      : "lg:pl-[100px] px-3 py-2 lg:px-6 lg:py-3";

  return (
    <header data-header className="fixed top-0 left-0 right-0 flex w-full bg-white border-b border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all duration-300">
      <div className={`flex items-center justify-between w-full ${headerContentPadding}`}>
        {/* Left side - Menu toggle + Logo (mobile) */}
        <div className="flex items-center gap-2">
          {/* Desktop: Collapse/Expand button */}
          <button
            className="hidden lg:flex items-center justify-center w-10 h-10 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isExpanded ? (
              <FaAngleDoubleLeft className="w-4 h-4" />
            ) : (
              <FaAngleDoubleRight className="w-4 h-4" />
            )}
          </button>

          {/* Mobile: Hamburger menu */}
          <button
            className="flex lg:hidden items-center justify-center w-10 h-10 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <FaTimes className="w-5 h-5" />
            ) : (
              <FaBars className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden">
            <Image
              width={120}
              height={28}
              className="dark:hidden"
              src="/images/logo/logo.png"
              alt="Genfity"
              priority
            />
            <Image
              width={120}
              height={28}
              className="hidden dark:block"
              src="/images/logo/logo-dark-mode.png"
              alt="Genfity"
              priority
            />
          </Link>
        </div>

        {/* Desktop & Tablet Search */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <SearchDropdown />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop items - always visible on lg */}
          <div className="hidden lg:flex items-center gap-2">
            {user?.role !== "SUPER_ADMIN" && <CurrencyBadge />}
            <LanguageSelector mode="compact" dropdownPosition="right" />
            <ThemeToggleButton />
            {/* Tutorial Help Button - Only for merchants */}
            {showTutorialHelp && (
              <div className="relative">
                <HintPanelButton />
                <HintPanel />
              </div>
            )}
            <NotificationDropdown />
          </div>

          {/* Mobile: show notification + menu toggle */}
          <div className="flex lg:hidden items-center gap-1">
            <NotificationDropdown />
            <button
              onClick={toggleApplicationMenu}
              className="flex items-center justify-center w-10 h-10 text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="More options"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
          </div>

          {/* User dropdown - always visible */}
          <UserDropdown />
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isApplicationMenuOpen && isMobile && (
        <div className="absolute top-full right-0 mt-1 mr-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 min-w-[200px]">
          <div className="flex flex-col gap-2">
            {user?.role !== "SUPER_ADMIN" && (
              <div className="px-2 py-1">
                <CurrencyBadge />
              </div>
            )}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Language</span>
              <LanguageSelector mode="compact" dropdownPosition="right" />
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
              <ThemeToggleButton />
            </div>
            {/* Tutorial Help - Mobile */}
            {showTutorialHelp && (
              <div className="px-2 py-1 border-t border-gray-200 dark:border-gray-700 mt-1 pt-2">
                <div className="relative">
                  <HintPanelButton />
                  <HintPanel />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
