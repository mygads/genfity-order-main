"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import useSWR from "swr";
import { FaBell, FaTimes, FaCreditCard, FaShoppingCart, FaBox, FaUser, FaMoneyBillWave, FaCog, FaCheckDouble, FaStore, FaUserPlus } from "react-icons/fa";

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

const categoryIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  SYSTEM: { icon: <FaCog className="w-4 h-4" />, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  SUBSCRIPTION: { icon: <FaCreditCard className="w-4 h-4" />, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  ORDER: { icon: <FaShoppingCart className="w-4 h-4" />, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  STOCK: { icon: <FaBox className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
  STAFF: { icon: <FaUser className="w-4 h-4" />, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  PAYMENT: { icon: <FaMoneyBillWave className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  MERCHANT: { icon: <FaStore className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
  USER: { icon: <FaUserPlus className="w-4 h-4" />, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
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
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth fetcher for notifications
  const authFetcher = async (url: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) return null;
    return res.json();
  };

  // Fetch unread count with polling
  const { data: unreadData, mutate: mutateUnreadCount } = useSWR<UnreadCountResponse>(
    isMounted ? "/api/notifications/unread-count" : null,
    authFetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Fetch recent notifications when dropdown is open
  const { data: notificationsData, mutate } = useSWR<NotificationsResponse>(
    isOpen && isMounted ? "/api/notifications?limit=5" : null,
    authFetcher
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
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Optimistic update - update UI immediately
    const optimisticNotifications = notificationsData ? {
      ...notificationsData,
      data: {
        ...notificationsData.data,
        notifications: notificationsData.data.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        )
      }
    } : undefined;

    const optimisticUnread = unreadData ? {
      ...unreadData,
      data: { count: Math.max(0, (unreadData.data?.count || 1) - 1) }
    } : undefined;

    // Update UI immediately with optimistic data
    mutate(optimisticNotifications, false);
    mutateUnreadCount(optimisticUnread, false);

    // Fire API request in background (don't await)
    fetch(`/api/notifications/${id}/read`, { 
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .catch(error => {
        console.error("Failed to mark as read:", error);
        // Revalidate on error to restore correct state
        mutate();
        mutateUnreadCount();
      });
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Optimistic update - update UI immediately
    const optimisticNotifications = notificationsData ? {
      ...notificationsData,
      data: {
        ...notificationsData.data,
        notifications: notificationsData.data.notifications.map(n => ({ ...n, isRead: true }))
      }
    } : undefined;

    const optimisticUnread = unreadData ? {
      ...unreadData,
      data: { count: 0 }
    } : undefined;

    // Update UI immediately with optimistic data
    mutate(optimisticNotifications, false);
    mutateUnreadCount(optimisticUnread, false);

    // Fire API request in background (don't await)
    fetch("/api/notifications/mark-all-read", { 
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .catch(error => {
        console.error("Failed to mark all as read:", error);
        // Revalidate on error to restore correct state
        mutate();
        mutateUnreadCount();
      });
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
        <FaBell className="w-5 h-5" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-auto max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0 z-50"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t("admin.header.notification")}
          </h5>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center justify-center w-8 h-8 rounded-full text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
                title={t("notifications.markAllRead") || "Mark all read"}
              >
                <FaCheckDouble className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <li className="py-8 text-center text-gray-500 dark:text-gray-400">
              <span className="block text-3xl mb-2"><FaBell className="w-8 h-8 mx-auto text-gray-400" /></span>
              <span>{t("notifications.empty") || "No notifications yet"}</span>
            </li>
          ) : (
            notifications.map((notification) => {
              const iconConfig = categoryIcons[notification.category] || categoryIcons.SYSTEM;
              return (
                <li key={notification.id}>
                  <DropdownItem
                    tag={notification.actionUrl ? "a" : "button"}
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
                      {iconConfig.icon}
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
          href="/admin/dashboard/notifications"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {t("notifications.viewAll") || "View All Notifications"}
        </Link>
      </Dropdown>
    </div>
  );
}
