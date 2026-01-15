'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaTachometerAlt,
  FaStore,
  FaListAlt,
  FaShoppingCart,
  FaChartLine,
  FaCog
} from 'react-icons/fa';

interface DashboardSidebarProps {
  role: 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

/**
 * Dashboard Sidebar Component
 * 
 * Role-based navigation:
 * - SUPER_ADMIN: All features + platform management
 * - MERCHANT_OWNER: Merchant-specific features + staff management
 * - MERCHANT_STAFF: Limited to orders and menu
 */
export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <FaTachometerAlt className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
    },
    {
      label: 'Merchants',
      href: '/dashboard/merchants',
      icon: <FaStore className="w-5 h-5" />,
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Menu',
      href: '/dashboard/menu',
      icon: <FaListAlt className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
    },
    {
      label: 'Orders',
      href: '/dashboard/orders',
      icon: <FaShoppingCart className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'],
    },
    {
      label: 'Reports',
      href: '/dashboard/reports',
      icon: <FaChartLine className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: <FaCog className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'MERCHANT_OWNER'],
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <span className="text-xl font-bold">GENFITY</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition ${isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Role Badge */}
      <div className="border-t border-gray-800 p-4">
        <div className="rounded-lg bg-gray-800 px-3 py-2 text-center text-xs font-semibold text-gray-400">
          {role.replace('_', ' ')}
        </div>
      </div>
    </aside>
  );
}
