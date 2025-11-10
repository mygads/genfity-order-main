/**
 * Admin Sidebar Menu Configuration
 * 
 * @description
 * Defines menu items for admin dashboard sidebar based on user roles.
 * Each role (SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF) has different access permissions.
 * 
 * @specification
 * - SUPER_ADMIN: Full access to all features including merchant management
 * - MERCHANT_OWNER: Access to own merchant data, reports, staff management
 * - MERCHANT_STAFF: Limited access to orders, menu, and basic operations
 */

import type { UserRole } from '@/lib/auth/serverAuth';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  roles: UserRole[];
  badge?: string;
  children?: MenuItem[];
}

/**
 * Main navigation menu items
 * Filtered based on user role on render
 */
export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    href: '/admin/dashboard',
    roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
  },
  {
    id: 'orders',
    label: 'Pesanan',
    icon: '📦',
    href: '/admin/dashboard/orders',
    roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: '🍽️',
    href: '/admin/dashboard/menu',
    roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
    children: [
      {
        id: 'menu-items',
        label: 'Daftar Menu',
        icon: '📋',
        href: '/admin/dashboard/menu/items',
        roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
      },
      {
        id: 'menu-categories',
        label: 'Kategori',
        icon: '🏷️',
        href: '/admin/dashboard/menu/categories',
        roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
      },
      {
        id: 'menu-addons',
        label: 'Add-ons',
        icon: '➕',
        href: '/admin/dashboard/menu/addons',
        roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Laporan',
    icon: '📈',
    href: '/admin/dashboard/reports',
    roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
    children: [
      {
        id: 'reports-sales',
        label: 'Penjualan',
        icon: '💰',
        href: '/admin/dashboard/reports/sales',
        roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
      },
      {
        id: 'reports-products',
        label: 'Produk Terlaris',
        icon: '🔥',
        href: '/admin/dashboard/reports/products',
        roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
      },
    ],
  },
  {
    id: 'merchants',
    label: 'Merchant',
    icon: '🏪',
    href: '/admin/dashboard/merchants',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'merchant-settings',
    label: 'Pengaturan Outlet',
    icon: '⚙️',
    href: '/admin/dashboard/settings',
    roles: ['MERCHANT_OWNER'],
    children: [
      {
        id: 'settings-info',
        label: 'Info Outlet',
        icon: 'ℹ️',
        href: '/admin/dashboard/settings/info',
        roles: ['MERCHANT_OWNER'],
      },
      {
        id: 'settings-hours',
        label: 'Jam Operasional',
        icon: '🕐',
        href: '/admin/dashboard/settings/hours',
        roles: ['MERCHANT_OWNER'],
      },
    ],
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: '👥',
    href: '/admin/dashboard/staff',
    roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
  },
  {
    id: 'users',
    label: 'Pengguna',
    icon: '👤',
    href: '/admin/dashboard/users',
    roles: ['SUPER_ADMIN'],
  },
];

/**
 * Filter menu items based on user role
 * @param role - User role from JWT token
 * @returns Filtered menu items accessible by the role
 */
export function getMenuItemsByRole(role: UserRole): MenuItem[] {
  return ADMIN_MENU_ITEMS.filter((item) => item.roles.includes(role)).map(
    (item) => {
      // Filter children based on role
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) =>
            child.roles.includes(role)
          ),
        };
      }
      return item;
    }
  );
}

/**
 * Check if user has access to a specific menu item
 * @param itemId - Menu item ID
 * @param role - User role
 * @returns boolean
 */
export function hasMenuAccess(itemId: string, role: UserRole): boolean {
  const item = ADMIN_MENU_ITEMS.find((item) => item.id === itemId);
  if (!item) return false;
  return item.roles.includes(role);
}

/**
 * Get menu item by href
 * @param href - Menu item href
 * @returns MenuItem or undefined
 */
export function getMenuItemByHref(href: string): MenuItem | undefined {
  for (const item of ADMIN_MENU_ITEMS) {
    if (item.href === href) return item;
    if (item.children) {
      const child = item.children.find((child) => child.href === href);
      if (child) return child;
    }
  }
  return undefined;
}
