"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBars, FaBell, FaMoon, FaSun, FaUser, FaCog, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface InfluencerData {
  name: string;
  email: string;
  profilePictureUrl?: string;
}

interface InfluencerHeaderProps {
  title: string;
  onMenuClick: () => void;
  rightContent?: React.ReactNode;
}

const InfluencerHeader: React.FC<InfluencerHeaderProps> = ({
  title,
  onMenuClick,
  rightContent,
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load influencer data from localStorage
  useEffect(() => {
    const loadInfluencerData = () => {
      const storedData = localStorage.getItem('influencerData');
      if (storedData) {
        try {
          setInfluencer(JSON.parse(storedData));
        } catch {
          console.error('Failed to parse influencer data');
        }
      }
    };

    loadInfluencerData();

    // Listen for profile updates
    const handleProfileUpdate = () => loadInfluencerData();
    window.addEventListener('influencerProfileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('influencerProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('influencerAccessToken');
    localStorage.removeItem('influencerRefreshToken');
    localStorage.removeItem('influencerData');
    router.push('/influencer/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        {/* Left: Mobile Menu & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <FaBars className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {rightContent}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <FaSun className="w-5 h-5 text-yellow-500" />
            ) : (
              <FaMoon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            aria-label="Notifications"
          >
            <FaBell className="w-5 h-5" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {/* Profile Picture */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                {influencer?.profilePictureUrl ? (
                  <Image
                    src={influencer.profilePictureUrl}
                    alt={influencer.name || 'Profile'}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {influencer?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              {/* Name (hidden on mobile) */}
              <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {influencer?.name || 'User'}
              </span>
              <FaChevronDown className={`hidden md:block w-3 h-3 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {influencer?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {influencer?.email || ''}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/influencer/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <FaUser className="w-4 h-4 text-gray-400" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/influencer/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <FaCog className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default InfluencerHeader;
