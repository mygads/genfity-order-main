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
      'dashboard': 'Dashboard',
      'menu': 'Menu',
      'builder': 'Menu Builder',
      'new': 'Create',
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
      'create': 'Create',
    };



    // Skip admin and route groups, start from dashboard
    let startIndex = segments.findIndex(seg => seg === 'dashboard');
    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < segments.length; i++) {
      const segment = segments[i];
      let _currentPath = '';
      _currentPath += `/${segment}`;

      // Skip route groups like (admin), (merchant), etc
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue;
      }

      // Skip numeric IDs (dynamic routes)
      if (/^\d+$/.test(segment)) {
        continue;
      }

      // Get display name
      const displayName = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // For last item (current page), use pageTitle if provided
      if (i === segments.length - 1) {
        items.push({
          name: pageTitle || displayName,
        });
      } else {
        // Build proper path from root
        const fullPath = '/' + segments.slice(0, i + 1).join('/');
        items.push({
          name: displayName,
          path: fullPath,
        });
      }
    }

    return items;
  }, [pathname, pageTitle, customItems]);

  // Get the current page title (last breadcrumb item)
  const currentTitle = breadcrumbItems[breadcrumbItems.length - 1]?.name || pageTitle || 'Page';

  return (
    <div data-breadcrumb className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {currentTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5 flex-wrap">
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
