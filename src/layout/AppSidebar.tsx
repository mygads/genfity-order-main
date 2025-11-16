"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../hooks/useAuth";
import {
  BoxCubeIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import MerchantBanner from "../components/merchants/MerchantBanner";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
};

// Super Admin Menu Items
const superAdminNavItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/admin/dashboard",
    roles: ["SUPER_ADMIN"],
  },
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
  {
    icon: <PieChartIcon />,
    name: "Analytics",
    path: "/admin/dashboard/analytics",
    roles: ["SUPER_ADMIN"],
  },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "Profile",
  //   path: "/admin/dashboard/profile",
  //   roles: ["SUPER_ADMIN"],
  // },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "Settings",
  //   path: "/admin/dashboard/settings",
  //   roles: ["SUPER_ADMIN"],
  // },
];

// Merchant Owner Menu Items
const merchantNavItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/admin/dashboard",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
  {
    icon: <ListIcon />,
    name: "Orders",
    path: "/admin/dashboard/orders",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
  {
    icon: <TableIcon />,
    name: "Menu",
    path: "/admin/dashboard/menu",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Categories",
    path: "/admin/dashboard/categories",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Addon Categories",
    path: "/admin/dashboard/addon-categories",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
  {
    icon: <ListIcon />,
    name: "Addon Items",
    path: "/admin/dashboard/addon-items",
    roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  },
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
  {
    icon: <UserCircleIcon />,
    name: "Staff",
    path: "/admin/dashboard/staff",
    roles: ["MERCHANT_OWNER"],
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    name: "Edit Merchant",
    path: "/admin/dashboard/merchant/edit",
    roles: ["MERCHANT_OWNER"], // Only MERCHANT_OWNER can edit
  },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "Profile",
  //   path: "/admin/dashboard/profile",
  //   roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  // },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "Settings",
  //   path: "/admin/dashboard/settings",
  //   roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
  // },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();

  // Get menu items based on user role
  const getMenuItems = (): NavItem[] => {
    if (!user) return [];
    
    if (user.role === "SUPER_ADMIN") {
      return superAdminNavItems;
    } else if (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") {
      return merchantNavItems.filter(item => 
        item.roles?.includes(user.role)
      );
    }
    
    return [];
  };

  const navItems = getMenuItems();

  const isActive = useCallback((path: string) => {
    // Check exact match
    if (path === pathname) return true;
    // Check if current path starts with menu path (for nested routes)
    if (pathname.startsWith(path) && path !== "/admin/dashboard") return true;
    return false;
  }, [pathname]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
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
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/admin/dashboard">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      {/* Merchant Banner - Only for MERCHANT_OWNER and MERCHANT_STAFF */}
      {user && (user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF") && (
        <MerchantBanner 
          isExpanded={isExpanded || isHovered || isMobileOpen}
        />
      )}

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                {navItems.map((nav) => (
                  <li key={nav.name}>
                    <Link
                      href={nav.path}
                      className={`menu-item group ${
                        isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={`${
                          isActive(nav.path)
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
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
