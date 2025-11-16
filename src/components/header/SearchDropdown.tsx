"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  GridIcon,
  ListIcon,
  FileIcon,
  FolderIcon,
  PieChartIcon,
  UserCircleIcon,
  TableIcon,
  BoxIconLine,
} from "@/icons";

interface SearchOption {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  category: string;
  roles?: string[];
  keywords?: string[];
  description?: string;
  subOptions?: {
    name: string;
    path: string;
    keywords?: string[];
  }[];
}

const SearchDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // All available search options with sub-options
  const allOptions: SearchOption[] = useMemo(() => [
    // Super Admin Options
    {
      id: "dashboard",
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <GridIcon />,
      category: "Main",
      roles: ["SUPER_ADMIN", "MERCHANT_OWNER", "MERCHANT_STAFF"],
      description: "Overview & statistics",
    },
    {
      id: "merchants",
      name: "Merchants",
      path: "/admin/dashboard/merchants",
      icon: <UserCircleIcon />,
      category: "Management",
      roles: ["SUPER_ADMIN"],
      keywords: ["merchant", "store", "restaurant"],
      description: "Manage all merchants",
      subOptions: [
        { name: "Create New Merchant", path: "/admin/dashboard/merchants/create", keywords: ["add", "new", "create"] },
        { name: "View All Merchants", path: "/admin/dashboard/merchants" },
      ],
    },
    {
      id: "users",
      name: "Users",
      path: "/admin/dashboard/users",
      icon: <UserCircleIcon />,
      category: "Management",
      roles: ["SUPER_ADMIN"],
      keywords: ["user", "admin", "account"],
      description: "User management",
    },
    {
      id: "analytics",
      name: "Analytics",
      path: "/admin/dashboard/analytics",
      icon: <PieChartIcon />,
      category: "Analytics",
      roles: ["SUPER_ADMIN"],
      keywords: ["stats", "metrics", "analytics"],
      description: "Platform analytics",
    },
    
    // Merchant Options
    {
      id: "orders",
      name: "Orders",
      path: "/admin/dashboard/orders",
      icon: <ListIcon />,
      category: "Main",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["order", "sale", "transaction"],
      description: "Manage customer orders",
    },
    {
      id: "menu-builder",
      name: "Menu Builder",
      path: "/admin/dashboard/menu/builder/new",
      icon: <FileIcon />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["create menu", "new menu", "builder", "add menu"],
      description: "Create new menu items",
    },
    {
      id: "menu-items",
      name: "Menu Items",
      path: "/admin/dashboard/menu",
      icon: <TableIcon />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["menu", "item", "food", "product"],
      description: "View & manage all menu items",
      subOptions: [
        { name: "Create New Menu", path: "/admin/dashboard/menu/builder/new", keywords: ["add", "new", "create"] },
        { name: "View All Menus", path: "/admin/dashboard/menu" },
        { name: "Stock Overview", path: "/admin/dashboard/menu/stock-overview", keywords: ["stock", "inventory"] },
      ],
    },
    {
      id: "categories",
      name: "Categories",
      path: "/admin/dashboard/categories",
      icon: <FolderIcon />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["category", "group"],
      description: "Organize menu by categories",
      subOptions: [
        { name: "Create Category", path: "/admin/dashboard/categories", keywords: ["add", "new"] },
        { name: "Manage Categories", path: "/admin/dashboard/categories" },
      ],
    },
    {
      id: "stock-management",
      name: "Stock Management",
      path: "/admin/dashboard/menu/stock-overview",
      icon: <BoxIconLine />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["stock", "inventory", "quantity"],
      description: "Track menu & addon stock",
    },
    {
      id: "addon-categories",
      name: "Addon Categories",
      path: "/admin/dashboard/addon-categories",
      icon: <FolderIcon />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["addon", "extra", "modifier"],
      description: "Manage addon groups",
      subOptions: [
        { name: "Create Addon Category", path: "/admin/dashboard/addon-categories", keywords: ["add", "new"] },
        { name: "View Addon Categories", path: "/admin/dashboard/addon-categories" },
      ],
    },
    {
      id: "addon-items",
      name: "Addon Items",
      path: "/admin/dashboard/addon-items",
      icon: <TableIcon />,
      category: "Menu",
      roles: ["MERCHANT_OWNER", "MERCHANT_STAFF"],
      keywords: ["addon", "extra", "topping"],
      description: "Manage addon options",
      subOptions: [
        { name: "Create Addon Item", path: "/admin/dashboard/addon-items", keywords: ["add", "new"] },
        { name: "View All Addons", path: "/admin/dashboard/addon-items" },
      ],
    },
    {
      id: "reports",
      name: "Reports",
      path: "/admin/dashboard/reports",
      icon: <PieChartIcon />,
      category: "Reports",
      roles: ["MERCHANT_OWNER"],
      keywords: ["report", "analytics", "stats"],
      description: "Business analytics & insights",
    },
    {
      id: "revenue",
      name: "Revenue",
      path: "/admin/dashboard/revenue",
      icon: <PieChartIcon />,
      category: "Reports",
      roles: ["MERCHANT_OWNER"],
      keywords: ["revenue", "income", "earnings", "sales"],
      description: "Revenue analytics & charts",
    },
    {
      id: "staff",
      name: "Staff",
      path: "/admin/dashboard/staff",
      icon: <UserCircleIcon />,
      category: "Team",
      roles: ["MERCHANT_OWNER"],
      keywords: ["staff", "employee", "team"],
      description: "Manage team members",
      subOptions: [
        { name: "Invite Staff", path: "/admin/dashboard/staff", keywords: ["add", "new", "invite"] },
        { name: "View All Staff", path: "/admin/dashboard/staff" },
      ],
    },
  ], []);

  // Filter options based on user role and search query (including sub-options)
  const filteredOptions = useMemo(() => {
    if (!user) return [];

    // Filter by role and flatten sub-options into main results
    const options: SearchOption[] = [];
    
    allOptions.forEach((option) => {
      // Check role permission
      if (option.roles && !option.roles.includes(user.role)) return;

      // Add main option
      if (!searchQuery.trim()) {
        // No search query - show only main options
        options.push(option);
      } else {
        const query = searchQuery.toLowerCase();
        
        // Check if main option matches
        const nameMatch = option.name.toLowerCase().includes(query);
        const categoryMatch = option.category.toLowerCase().includes(query);
        const descriptionMatch = option.description?.toLowerCase().includes(query);
        const keywordMatch = option.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(query)
        );

        if (nameMatch || categoryMatch || descriptionMatch || keywordMatch) {
          options.push(option);
        }

        // Check if any sub-option matches
        if (option.subOptions) {
          option.subOptions.forEach((subOption) => {
            const subNameMatch = subOption.name.toLowerCase().includes(query);
            const subKeywordMatch = subOption.keywords?.some((keyword) =>
              keyword.toLowerCase().includes(query)
            );

            if (subNameMatch || subKeywordMatch) {
              // Create a new option entry for the sub-option
              options.push({
                id: `${option.id}-${subOption.name.toLowerCase().replace(/\s+/g, '-')}`,
                name: subOption.name,
                path: subOption.path,
                icon: option.icon,
                category: option.category,
                description: `in ${option.name}`,
                roles: option.roles,
              });
            }
          });
        }
      }
    });

    return options;
  }, [allOptions, user, searchQuery]);

  // Group options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SearchOption[]> = {};
    filteredOptions.forEach((option) => {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    });
    return groups;
  }, [filteredOptions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      // ESC to close
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
        setSelectedIndex(0);
        inputRef.current?.blur();
      }

      // Arrow navigation when dropdown is open
      if (isOpen) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (event.key === "Enter" && filteredOptions.length > 0) {
          event.preventDefault();
          const selectedOption = filteredOptions[selectedIndex];
          if (selectedOption) {
            router.push(selectedOption.path);
            setIsOpen(false);
            setSearchQuery("");
            setSelectedIndex(0);
            inputRef.current?.blur();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelectOption = (option: SearchOption) => {
    router.push(option.path);
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="relative">
          <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
            <svg
              className="fill-gray-500 dark:fill-gray-400"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Search pages or type command..."
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
          />

          <button
            type="button"
            className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/3 dark:text-gray-400"
          >
            <span> ⌘ </span>
            <span> K </span>
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-theme-lg max-h-[400px] overflow-y-auto z-50">
          {Object.entries(groupedOptions).map(([category, options]) => (
            <div key={category} className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {category}
              </div>
              {options.map((option) => {
                const globalIndex = filteredOptions.findIndex(
                  (opt) => opt.id === option.id
                );
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        isSelected
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {option.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{option.name}</div>
                      {option.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ↵
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery && filteredOptions.length === 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-theme-lg p-8 text-center z-50">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No results found for &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
