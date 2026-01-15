"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FaTachometerAlt,
  FaStore,
  FaWallet,
  FaHistory,
  FaCog,
  FaChevronDown,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";

interface InfluencerData {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  isApproved: boolean;
  profilePictureUrl?: string;
}

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  {
    icon: <FaTachometerAlt />,
    name: "Dashboard",
    path: "/influencer/dashboard",
  },
  {
    icon: <FaStore />,
    name: "Merchants",
    path: "/influencer/merchants",
  },
  {
    icon: <FaWallet />,
    name: "Withdrawals",
    path: "/influencer/withdrawals",
  },
  {
    icon: <FaHistory />,
    name: "Transactions",
    path: "/influencer/transactions",
  },
  {
    icon: <FaCog />,
    name: "Settings",
    path: "/influencer/settings",
  },
];

interface InfluencerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  influencer: InfluencerData | null;
}

const InfluencerSidebar: React.FC<InfluencerSidebarProps> = ({
  isOpen,
  onClose,
  influencer,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Scroll detection for indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('[data-influencer-sidebar-scroll]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const hasMoreContent = scrollTop + clientHeight < scrollHeight - 10;
        setShowScrollIndicator(hasMoreContent);
      }
    };

    const scrollContainer = document.querySelector('[data-influencer-sidebar-scroll]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll();
      const timer = setTimeout(handleScroll, 500);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === pathname) return true;
    if (path !== "/influencer/dashboard" && pathname.startsWith(path)) return true;
    return false;
  }, [pathname]);

  const handleLogout = async () => {
    const token = localStorage.getItem('influencerAccessToken');
    try {
      await fetch('/api/influencer/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore errors
    }
    localStorage.removeItem('influencerAccessToken');
    localStorage.removeItem('influencerRefreshToken');
    localStorage.removeItem('influencerData');
    router.push('/influencer/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 flex flex-col bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 w-[280px]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FaTimes className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-4 pt-4 pb-2 flex justify-center">
          <Link href="/influencer/dashboard" onClick={() => window.innerWidth < 1024 && onClose()}>
            <Image
              className="dark:hidden"
              src="/images/logo/logo.png"
              alt="Genfity"
              width={150}
              height={40}
              priority
            />
            <Image
              className="hidden dark:block"
              src="/images/logo/logo-dark-mode.png"
              alt="Genfity"
              width={150}
              height={40}
              priority
            />
          </Link>
        </div>

        {/* Influencer Badge */}
        <div className="px-4 py-3">
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                {influencer?.name?.charAt(0).toUpperCase() || "I"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{influencer?.name || "Influencer"}</p>
                <p className="text-xs text-brand-100 truncate">{influencer?.referralCode || "---"}</p>
              </div>
            </div>
            {influencer && !influencer.isApproved && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-100 bg-amber-500/20 rounded-lg px-2 py-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Pending Approval
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div
          className="px-4 mb-12 flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1"
          data-influencer-sidebar-scroll
        >
          <nav className="mb-6">
            <div className="flex flex-col gap-2">
              <h2 className="mb-3 text-xs font-semibold uppercase leading-5 text-gray-500 dark:text-gray-400">
                Menu
              </h2>
              <ul className="flex flex-col gap-2">
                {navItems.map((nav) => (
                  <li key={nav.path}>
                    <Link
                      href={nav.path}
                      onClick={() => window.innerWidth < 1024 && onClose()}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                        ${isActive(nav.path)
                          ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shadow-sm"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                      <span className={`text-lg ${isActive(nav.path) ? "text-brand-500" : "text-gray-500 dark:text-gray-400"}`}>
                        {nav.icon}
                      </span>
                      <span>{nav.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center justify-center w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 animate-bounce">
              <FaChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        )}

        {/* User Section & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <FaSignOutAlt className="w-4 h-4" />
            Logout
          </button>
          <div className="mt-3 text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Influencer Portal v1.0.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default InfluencerSidebar;
