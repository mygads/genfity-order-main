"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import useSWR from "swr";

interface Notification {
  id: string;
  category: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

const categoryIcons: Record<string, { icon: string; color: string }> = {
  SYSTEM: { icon: "🔔", color: "bg-blue-100 text-blue-600" },
  SUBSCRIPTION: { icon: "💳", color: "bg-orange-100 text-orange-600" },
  ORDER: { icon: "🛒", color: "bg-green-100 text-green-600" },
  STOCK: { icon: "📦", color: "bg-yellow-100 text-yellow-600" },
  STAFF: { icon: "👤", color: "bg-purple-100 text-purple-600" },
  PAYMENT: { icon: "💰", color: "bg-emerald-100 text-emerald-600" },
};

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  // Fetch unread count with polling
  const { data: unreadData } = useSWR<UnreadCountResponse>(
    "/api/notifications/unread-count",
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Fetch recent notifications when dropdown is open
  const { data: notificationsData, mutate } = useSWR<NotificationsResponse>(
    isOpen ? "/api/notifications?limit=5" : null
  );

  const unreadCount = unreadData?.data?.count || 0;
  const notifications = notificationsData?.data?.notifications || [];

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      mutate();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      mutate();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-auto max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t("admin.header.notification")}
          </h5>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400"
              >
                {t("notifications.markAllRead") || "Mark all read"}
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <li className="py-8 text-center text-gray-500 dark:text-gray-400">
              <span className="block text-3xl mb-2">🔔</span>
              <span>{t("notifications.empty") || "No notifications yet"}</span>
            </li>
          ) : (
            notifications.map((notification) => {
              const iconConfig = categoryIcons[notification.category] || categoryIcons.SYSTEM;
              return (
                <li key={notification.id}>
                  <DropdownItem
                    onItemClick={() => {
                      if (!notification.isRead) {
                        handleMarkAsRead(notification.id);
                      }
                      closeDropdown();
                    }}
                    href={notification.actionUrl || undefined}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${!notification.isRead ? "bg-orange-50/50 dark:bg-orange-900/10" : ""
                      }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconConfig.color}`}>
                      <span className="text-lg">{iconConfig.icon}</span>
                    </span>
                    <span className="block flex-1 min-w-0">
                      <span className="mb-1 flex items-center justify-between gap-2">
                        <span className={`font-medium text-sm truncate ${!notification.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 shrink-0 rounded-full bg-orange-500" />
                        )}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {getRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>

        <Link
          href="/admin/notifications"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {t("notifications.viewAll") || "View All Notifications"}
        </Link>
      </Dropdown>
    </div>
  );
}
