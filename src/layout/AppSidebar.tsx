"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../hooks/useAuth";
import {
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
  FileIcon,
  BoxIconLine,
  FolderIcon,
} from "../icons/index";
import { FaHistory, FaUtensils } from "react-icons/fa";
import SidebarWidget from "./SidebarWidget";
import MerchantBanner from "../components/merchants/MerchantBanner";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// Super Admin Menu Groups
const superAdminNavGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: "/admin/dashboard",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        icon: <UserCircleIcon />,
        name: "Merchants",
        path: "/admin/dashboard/merchants",
        roles: ["SUPER_ADMIN"],
      },
      {
        icon: <UserCircleIcon />,
        name: "Users",
        path: "/admin/dashboard/users",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        icon: <PieChartIcon />,
        name: "Analytics",
        path: "/admin/dashboard/analytics",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

// Merchant Menu Groups
const merchantNavGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: "/admin/dashboard",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
    ],
  },
  {
    title: "Order Management",
    items: [
      {
        icon: <ListIcon />,
        name: "Orders (Kanban)",
        path: "/admin/dashboard/orders",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <FaUtensils />,
        name: "Kitchen Display",
        path: "/admin/dashboard/orders/kitchen",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <FaHistory />,
        name: "Order History",
        path: "/admin/dashboard/orders/history",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
    ],
  },
  {
    title: "Menu Management",
    items: [
      {
        icon: <FileIcon />,
        name: "Menu Builder",
        path: "/admin/dashboard/menu/builder/new",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <TableIcon />,
        name: "Menu Items",
        path: "/admin/dashboard/menu",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <FolderIcon />,
        name: "Categories",
        path: "/admin/dashboard/categories",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <BoxIconLine />,
        name: "Stock Management",
        path: "/admin/dashboard/menu/stock-overview",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <FolderIcon />,
        name: "Addon Categories",
        path: "/admin/dashboard/addon-categories",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
      {
        icon: <TableIcon />,
        name: "Addon Items",
        path: "/admin/dashboard/addon-items",
        roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        icon: <PieChartIcon />,
        name: "Reports",
        path: "/admin/dashboard/reports",
        roles: ["MERCHANT_OWNER"],
      },
      {
        icon: <PieChartIcon />,
        name: "Revenue",
        path: "/admin/dashboard/revenue",
        roles: ["MERCHANT_OWNER"],
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        icon: <BoxIconLine />,
        name: "Merchant Settings",
        path: "/admin/dashboard/merchant/edit",
        roles: ["MERCHANT_OWNER"],
      },
    ],
  },
  {
    title: "Team",
    items: [
      {
        icon: <UserCircleIcon />,
        name: "Staff",
        path: "/admin/dashboard/staff",
        roles: ["MERCHANT_OWNER"],
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasMerchant, setHasMerchant] = React.useState<boolean | null>(null);

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

  // Get menu groups based on user role
  const getMenuGroups = (): NavGroup[] => {
    if (!user) return [];

    if (user.role === "SUPER_ADMIN") {
      return superAdminNavGroups;
    } else if (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") {
      // If no merchant, return empty groups
      if (hasMerchant === false) return [];

      // Filter groups and items based on user role
      return merchantNavGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => item.roles?.includes(user.role))
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
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/admin/dashboard">
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
        <MerchantBanner
          isExpanded={isExpanded || isHovered || isMobileOpen}
        />
      )}

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
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
                    No Merchant Connected
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    You are not connected to any merchant. Please contact the merchant owner or super admin for assistance.
                  </p>
                </div>
              </div>
            ) : (
              /* Render menu groups */
              navGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <h2
                    className={`mb-3 text-xs font-semibold uppercase flex leading-5 text-gray-500 dark:text-gray-400 ${!isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "justify-start"
                      }`}
                  >
                    {isExpanded || isHovered || isMobileOpen ? (
                      group.title
                    ) : (
                      <HorizontaLDots />
                    )}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((nav) => (
                      <li key={nav.name}>
                        <Link
                          href={nav.path}
                          prefetch={true}
                          className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                            }`}
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
                            <span className="menu-item-text">{nav.name}</span>
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
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
