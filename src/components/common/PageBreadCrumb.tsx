"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";

interface BreadcrumbItem {
  name: string;
  path?: string;
}

interface BreadcrumbProps {
  pageTitle?: string;
  customItems?: BreadcrumbItem[];
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, customItems }) => {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const breadcrumbItems = useMemo(() => {
    // If custom items provided, use them
    if (customItems) {
      return customItems;
    }

    // Otherwise, generate from pathname
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Route name mapping
    const routeNames: Record<string, string> = {
      'admin': 'Admin',
      'dashboard': 'Dashboard',
      'menu': 'Menu Items',
      'builder': 'Menu Builder',
      'new': 'Create New',
      'edit': 'Edit',
      'categories': 'Categories',
      'orders': 'Orders',
      'revenue': 'Revenue',
      'reports': 'Reports',
      'staff': 'Staff',
      'merchants': 'Merchants',
      'users': 'Users',
      'analytics': 'Analytics',
      'addon-categories': 'Addon Categories',
      'addon-items': 'Addon Items',
      'stock-overview': 'Stock Overview',
      'merchant': 'Merchant Profile',
      'view': 'View',
    };

    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      
      // Skip route groups like (admin), (merchant), etc
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue;
      }

      // Get display name
      const displayName = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Don't add dashboard as separate item if it's right after admin
      if (segment === 'dashboard' && i > 0 && segments[i - 1] === 'admin') {
        items.push({
          name: displayName,
          path: currentPath,
        });
        continue;
      }

      // For last item (current page), don't add path
      if (i === segments.length - 1) {
        items.push({
          name: pageTitle || displayName,
        });
      } else {
        items.push({
          name: displayName,
          path: currentPath,
        });
      }
    }

    return items;
  }, [pathname, pageTitle, customItems]);

  // Get the current page title (last breadcrumb item)
  const currentTitle = breadcrumbItems[breadcrumbItems.length - 1]?.name || pageTitle || 'Page';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {currentTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5 flex-wrap">
          {/* Home link */}
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
              href="/admin/dashboard"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="hidden sm:inline">Home</span>
              <svg
                className="stroke-current"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
          
          {/* Dynamic breadcrumb items */}
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            
            return (
              <li key={index} className="flex items-center gap-1.5">
                {item.path && !isLast ? (
                  <>
                    <Link
                      href={item.path}
                      className="text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <svg
                      className="stroke-current text-gray-400"
                      width="17"
                      height="16"
                      viewBox="0 0 17 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                        stroke=""
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
