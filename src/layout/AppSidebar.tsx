"use client";
import React, { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../lib/i18n/useTranslation";
import type { TranslationKeys } from "../lib/i18n/translations/en";
import { STAFF_PERMISSIONS, type StaffPermission } from "../lib/constants/permissions";
import { HorizontaLDots } from "../icons/index";
import {
  FaHistory,
  FaUtensils,
  FaChevronDown,
  FaCreditCard,
  FaCog,
  FaTachometerAlt,
  FaStore,
  FaUsers,
  FaUserFriends,
  FaExchangeAlt,
  FaWallet,
  FaTicketAlt,
  FaChartPie,
  FaClipboardList,
  FaBoxes,
  FaPencilAlt,
  FaListAlt,
  FaFolderOpen,
  FaTags,
  FaPuzzlePiece,
  FaBook,
  FaPercent,
  FaFileAlt,
  FaMoneyBillWave,
  FaCogs,
  FaQrcode,
  FaUserTie,
  FaImages,
  FaHandshake,
  FaMoneyCheckAlt,
  FaUserCog,
  FaTv,
} from "react-icons/fa";
import MerchantBanner from "../components/merchants/MerchantBanner";

type NavItem = {
  nameKey: TranslationKeys; // Translation key for name
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  permission?: StaffPermission; // Permission required for this item
};

type NavGroup = {
  titleKey: TranslationKeys; // Translation key for title
  items: NavItem[];
};

// Super Admin Menu Groups - Organized by function
const superAdminNavGroups: NavGroup[] = [
  {
    titleKey: "admin.nav.main",
    items: [
      {
        icon: <FaTachometerAlt />,
        nameKey: "admin.nav.dashboard",
        path: "/admin/dashboard",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    titleKey: "admin.nav.userManagement",
    items: [
      {
        icon: <FaStore />,
        nameKey: "admin.nav.merchants",
        path: "/admin/dashboard/merchants",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaUsers />,
        nameKey: "admin.nav.users",
        path: "/admin/dashboard/users",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaUserFriends />,
        nameKey: "admin.nav.customers",
        path: "/admin/dashboard/customers",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaHandshake />,
        nameKey: "admin.nav.influencers",
        path: "/admin/dashboard/influencers",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    titleKey: "admin.nav.finance",
    items: [
      {
        icon: <FaCreditCard />,
        nameKey: "admin.nav.paymentVerification",
        path: "/admin/dashboard/payment-verification",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaMoneyCheckAlt />,
        nameKey: "admin.nav.influencerWithdrawals",
        path: "/admin/dashboard/influencer-withdrawals",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaExchangeAlt />,
        nameKey: "admin.nav.transactions",
        path: "/admin/dashboard/transactions",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaWallet />,
        nameKey: "admin.nav.merchantBalance",
        path: "/admin/dashboard/merchant-balance",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaTicketAlt />,
        nameKey: "admin.nav.vouchers",
        path: "/admin/dashboard/vouchers",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    titleKey: "admin.nav.platformSettings",
    items: [
      {
        icon: <FaCog />,
        nameKey: "admin.nav.subscriptionSettings",
        path: "/admin/dashboard/subscription-settings",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaUserCog />,
        nameKey: "admin.nav.influencerSettings",
        path: "/admin/dashboard/influencer-settings",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <FaImages />,
        nameKey: "admin.nav.stockPhotos",
        path: "/admin/dashboard/stock-photos",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    titleKey: "admin.nav.analytics",
    items: [
      {
        icon: <FaChartPie />,
        nameKey: "admin.nav.analytics",
        path: "/admin/dashboard/analytics",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

// Merchant Menu Groups - with permissions
const merchantNavGroups: NavGroup[] = [
  {
    titleKey: "admin.nav.main",
    items: [
      {
        icon: <FaTachometerAlt />,
        nameKey: "admin.nav.dashboard",
        path: "/admin/dashboard",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        // Dashboard has no specific permission - always visible
      },
    ],
  },
  {
    titleKey: "admin.nav.orderManagement",
    items: [
      {
        icon: <FaClipboardList />,
        nameKey: "admin.nav.ordersKanban",
        path: "/admin/dashboard/orders",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ORDERS,
      },
      {
        icon: <FaUtensils />,
        nameKey: "admin.nav.kitchenDisplay",
        path: "/admin/dashboard/orders/kitchen",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ORDERS_KITCHEN,
      },
      {
        icon: <FaTv />,
        nameKey: "admin.nav.queueDisplay",
        path: "/admin/dashboard/orders/queue",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ORDERS,
      },
      {
        icon: <FaHistory />,
        nameKey: "admin.nav.orderHistory",
        path: "/admin/dashboard/orders/history",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ORDERS_HISTORY,
      },
    ],
  },
  {
    titleKey: "admin.nav.menuManagement",
    items: [
      {
        icon: <FaBoxes />,
        nameKey: "admin.nav.stockManagement",
        path: "/admin/dashboard/menu/stock-overview",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.MENU_STOCK,
      },
      {
        icon: <FaPencilAlt />,
        nameKey: "admin.nav.menuBuilder",
        path: "/admin/dashboard/menu/builder/new",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.MENU_BUILDER,
      },
      {
        icon: <FaListAlt />,
        nameKey: "admin.nav.menuItems",
        path: "/admin/dashboard/menu",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.MENU,
      },
      {
        icon: <FaFolderOpen />,
        nameKey: "admin.nav.categories",
        path: "/admin/dashboard/categories",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.CATEGORIES,
      },
      {
        icon: <FaTags />,
        nameKey: "admin.nav.addonCategories",
        path: "/admin/dashboard/addon-categories",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ADDON_CATEGORIES,
      },
      {
        icon: <FaPuzzlePiece />,
        nameKey: "admin.nav.addonItems",
        path: "/admin/dashboard/addon-items",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.ADDON_ITEMS,
      },
      {
        icon: <FaBook />,
        nameKey: "admin.nav.menuBooks",
        path: "/admin/dashboard/menu-books",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.MENU_BOOKS,
      },
      {
        icon: <FaPercent />,
        nameKey: "admin.nav.specialPrices",
        path: "/admin/dashboard/special-prices",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.SPECIAL_PRICES,
      },
    ],
  },

  {
    titleKey: "admin.nav.reportsAnalytics",
    items: [
      {
        icon: <FaFileAlt />,
        nameKey: "admin.nav.reports",
        path: "/admin/dashboard/reports",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.REPORTS,
      },
      {
        icon: <FaMoneyBillWave />,
        nameKey: "admin.nav.revenue",
        path: "/admin/dashboard/revenue",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.REVENUE,
      },
    ],
  },
  {
    titleKey: "admin.nav.settings",
    items: [
      {
        icon: <FaCogs />,
        nameKey: "admin.nav.merchantSettings",
        path: "/admin/dashboard/merchant/edit",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.MERCHANT_SETTINGS,
      },
      {
        icon: <FaQrcode />,
        nameKey: "admin.nav.tableQRCodes",
        path: "/admin/dashboard/qr-tables",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
        permission: STAFF_PERMISSIONS.QR_TABLES,
      },
      {
        icon: <FaCreditCard />,
        nameKey: "admin.nav.subscription",
        path: "/admin/dashboard/subscription",
        roles: ["MERCHANT_OWNER"],
      },
    ],
  },
  {
    titleKey: "admin.nav.team",
    items: [
      {
        icon: <FaUserTie />,
        nameKey: "admin.nav.staff",
        path: "/admin/dashboard/staff",
        roles: ["MERCHANT_OWNER"], // Staff management is OWNER-ONLY
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const { user, hasPermission, isOwner } = useAuth();
  const { t } = useTranslation();
  const [hasMerchant, setHasMerchant] = React.useState<boolean | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check if merchant owner/staff has merchant association
  React.useEffect(() => {
    if (user && (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF")) {
      const checkMerchant = async () => {
        try {
          const token = localStorage.getItem("accessToken");
          if (!token) return;

          const response = await fetch("/api/merchant/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });

          setHasMerchant(response.ok);
        } catch {
          setHasMerchant(false);
        }
      };
      checkMerchant();
    } else {
      setHasMerchant(true); // Super admin always has access
    }
  }, [user]);

  // Scroll detection for indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('[data-sidebar-scroll]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const hasMoreContent = scrollTop + clientHeight < scrollHeight - 10; // 10px threshold
        setShowScrollIndicator(hasMoreContent);
      }
    };

    const scrollContainer = document.querySelector('[data-sidebar-scroll]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      // Check again after content loads
      const timer = setTimeout(handleScroll, 500);

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, [user, hasMerchant]);

  // Get menu groups based on user role
  const getMenuGroups = (): NavGroup[] => {
    if (!user) return [];

    if (user.role === "SUPER_ADMIN") {
      return superAdminNavGroups;
    } else if (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") {
      // If no merchant, return empty groups
      if (hasMerchant === false) return [];

      // Filter groups and items based on user role AND permissions
      return merchantNavGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            // First check role
            if (!item.roles?.includes(user.role)) return false;

            // If no permission required, allow
            if (!item.permission) return true;

            // Check permission (owners always pass)
            return isOwner || hasPermission(item.permission);
          })
        }))
        .filter(group => group.items.length > 0); // Remove empty groups
    }

    return [];
  };

  const navGroups = getMenuGroups();

  const isActive = useCallback((path: string) => {
    // Exact match first (most important)
    if (path === pathname) return true;

    // Special handling for menu builder
    if (path === "/admin/dashboard/menu/builder/new") {
      return pathname.startsWith("/admin/dashboard/menu/builder");
    }

    // For orders paths, handle nested routes properly
    if (path === "/admin/dashboard/orders") {
      // Only exact match for main orders page
      return pathname === "/admin/dashboard/orders" || pathname === "/admin/dashboard/orders/";
    }
    if (path === "/admin/dashboard/orders/kitchen") {
      return pathname.startsWith("/admin/dashboard/orders/kitchen");
    }
    if (path === "/admin/dashboard/orders/history") {
      return pathname.startsWith("/admin/dashboard/orders/history");
    }

    // For menu path, only activate if exact match
    if (path === "/admin/dashboard/menu") {
      return pathname === "/admin/dashboard/menu" || pathname === "/admin/dashboard/menu/";
    }

    // For other paths, check if current path starts with menu path
    // But exclude dashboard to prevent it from matching everything
    if (path !== "/admin/dashboard" && pathname.startsWith(path)) {
      return true;
    }

    return false;
  }, [pathname]);

  return (
    <aside
      data-sidebar
      className={`fixed top-0 left-0 flex flex-col bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[280px]"
          : isHovered
            ? "w-[280px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="px-4 pt-4 pb-2 flex justify-center"
      >
        <Link href="/admin/dashboard" onClick={() => window.innerWidth < 1024 && closeMobileSidebar()}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
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
            </>
          ) : (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/icon.png"
                alt="Genfity"
                width={32}
                height={32}
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/icon-dark-mode.png"
                alt="Genfity"
                width={32}
                height={32}
                priority
              />
            </>
          )}
        </Link>
      </div>

      {/* Merchant Banner - Only for MERCHANT_OWNER and MERCHANT_STAFF who have merchant */}
      {user && (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") && hasMerchant && (
        <div className="px-4">
          <MerchantBanner
            isExpanded={isExpanded || isHovered || isMobileOpen}
          />
        </div>
      )}

      <div className="px-4 mb-12 flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar" data-sidebar-scroll>
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {/* No merchant message for merchant owner/staff */}
            {user && (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") && hasMerchant === false ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex flex-col items-center text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {t("admin.sidebar.noMerchant.title")}
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    {t("admin.sidebar.noMerchant.description")}
                  </p>
                </div>
              </div>
            ) : (
              /* Render menu groups */
              navGroups.map((group, groupIndex) => (
                <div key={groupIndex} data-nav-group={group.titleKey.replace('admin.nav.', '')}>
                  <h2
                    className={`mb-3 text-xs font-semibold uppercase flex leading-5 text-gray-500 dark:text-gray-400 ${!isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                      }`}
                  >
                    {isExpanded || isHovered || isMobileOpen ? (
                      t(group.titleKey)
                    ) : (
                      <HorizontaLDots />
                    )}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((nav) => (
                      <li key={nav.nameKey}>
                        <Link
                          href={nav.path}
                          prefetch={true}
                          data-nav-item={nav.path}
                          onClick={() => {
                            // Auto-close sidebar on mobile when menu item is clicked
                            if (window.innerWidth < 1024) {
                              closeMobileSidebar();
                            }
                          }}
                          className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${!(isExpanded || isHovered || isMobileOpen) ? "lg:justify-center" : ""}`}
                        >
                          <span
                            className={`${isActive(nav.path)
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                              }`}
                          >
                            {nav.icon}
                          </span>
                          {(isExpanded || isHovered || isMobileOpen) && (
                            <span className="menu-item-text">{t(nav.nameKey)}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>

      {/* Dashboard Version - Fixed at bottom */}
      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 animate-bounce">
            <FaChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      )}

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center justify-center w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 animate-bounce">
            <FaChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className={`flex flex-col items-center justify-center gap-1 ${!(isExpanded || isHovered || isMobileOpen) ? 'lg:gap-0.5' : ''}`}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("admin.sidebar.dashboardVersion")} v{process.env.pnpm_package_version || '1.0.0'}
              </p>
              <a
                href="https://genfity.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary transition-colors"
              >
                Powered by <span className="font-semibold">Genfity</span>
              </a>
            </>
          ) : (
            <div className="text-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1" title="Version 1.0.0"></div>
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                v1.0
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
